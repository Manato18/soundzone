# SoundZone 状態管理アーキテクチャガイド

## 目次
1. [概要](#概要)
2. [状態管理の基本原則](#状態管理の基本原則)
3. [一元管理と個別管理の判断基準](#一元管理と個別管理の判断基準)
4. [実装パターン](#実装パターン)
5. [各機能の実装詳細](#各機能の実装詳細)
   - [Auth機能（一元管理）](#auth機能一元管理)
   - [Layers機能（一元管理）](#layers機能一元管理)
   - [Location機能（一元管理）](#location機能一元管理)
   - [Account機能（個別管理）](#account機能個別管理)
6. [ベストプラクティス](#ベストプラクティス)
7. [アンチパターン](#アンチパターン)

## 概要

このドキュメントは、SoundZoneアプリにおける状態管理の実装指針を示します。[StateManagement.md](./StateManagement.md)の設計原則に基づき、各機能の最適な管理方法を定義しています。

### 技術スタック
- **状態管理**: Zustand + TanStack Query
- **永続化**: MMKV
- **レイヤー構造**: Domain → Infrastructure → Application → Presentation

## 状態管理の基本原則

### 状態の分類（StateManagement.mdに準拠）

1. **Ephemeral UI state**（一時的なUI状態）
   - フォーム入力値、モーダル開閉、ローディング状態
   - → Zustand（非永続）

2. **Remote server state**（リモートサーバー状態）
   - API由来のデータ
   - → TanStack Query

3. **Persistent client state**（永続的なクライアント状態）
   - ユーザー設定、トークン
   - → Zustand + MMKV

## 一元管理と個別管理の判断基準

### 一元管理が必要な場合
- ✅ 3つ以上の画面で同じデータを参照
- ✅ 画面間でのリアルタイム同期が必要
- ✅ 他の機能がそのデータに依存
- ✅ アプリ全体の動作に影響するグローバル状態

### 個別管理で十分な場合
- ✅ 特定画面でのみ使用される状態
- ✅ 画面遷移時にリセットしてよい一時的なデータ
- ✅ 他機能に影響しない独立した処理

## 実装パターン

### ディレクトリ構造
```
src/features/<feature>/
├── application/
│   └── <feature>-store.ts         # Zustandストア
├── domain/
│   └── entities/                  # ドメインエンティティ
├── infrastructure/
│   └── services/                  # APIサービス、StateManager（必要な場合）
└── presentation/
    ├── hooks/
    │   ├── use-<feature>.ts       # 統合フック
    │   └── use-<feature>-query.ts # TanStack Query統合
    └── providers/
        └── <Feature>Provider.tsx   # コンテキストプロバイダー
```

### Zustand Middlewareの正しい順序
```typescript
// 必ず外側から内側へ: devtools → persist → immer → subscribeWithSelector
export const useFeatureStore = create<FeatureState & FeatureActions>()(
  devtools(              // 1. 最外層：開発ツール
    persist(             // 2. 永続化
      immer(             // 3. イミュータブル更新
        subscribeWithSelector((set) => ({
          // ストア実装
        }))
      ),
      {
        name: 'feature-storage',
        storage: mmkvStorage,
        partialize: (state) => ({
          settings: state.settings  // 永続化する部分を指定
        })
      }
    ),
    { enabled: process.env.NODE_ENV === 'development' }
  )
);
```

## 各機能の実装詳細

### Auth機能（一元管理）

#### なぜ一元管理か
- アプリ全体で認証状態を参照（すべての画面）
- ナビゲーション制御に必要
- APIリクエストのトークン管理

#### 実装構造
```
src/features/auth/
├── application/
│   └── auth-store.ts              # 認証状態の中央管理
├── domain/
│   └── entities/
│       └── User.ts                # QueryUser型定義
├── infra/services/
│   ├── authService.ts             # Supabase認証API
│   ├── authStateManager.ts        # 認証状態の同期管理（シングルトン）
│   ├── authTokenManager.ts        # トークン自動更新
│   ├── sessionPersistence.ts      # セッション永続化
│   ├── rateLimiter.ts             # ログイン試行制限
│   └── errorSanitizer.ts          # エラーメッセージ処理
└── presentation/
    ├── hooks/
    │   └── use-auth.ts            # 統合フック + TanStack Query
    └── providers/
        └── AuthProvider.tsx       # 初期化とセッション復元
```

#### 特徴的な実装

**1. AuthStateManager（シングルトン）**
```typescript
// Supabaseの認証状態変更を監視し、Zustandストアと同期
class AuthStateManager {
  private static instance: AuthStateManager;
  
  async initialize(queryClient: QueryClient, restoredSession?: Session) {
    // 認証状態変更の監視を開始
    this.authSubscription = supabase.auth.onAuthStateChange(
      this.handleAuthStateChange.bind(this)
    );
  }
}
```

**2. 競合状態の防止**
```typescript
interface AuthState {
  authProcessState: 'IDLE' | 'SIGNING_IN' | 'SIGNING_UP' | 'SIGNING_OUT';
}
```

**3. 複雑なフォーム管理**
```typescript
// ログインフォーム、サインアップフォーム、OTP検証をすべて管理
ui: {
  loginForm: { email, password, isSubmitting, errors };
  signUpForm: { email, password, confirmPassword, isSubmitting, errors };
  emailVerification: { email, verificationCode, isVerifying, resendCooldown };
}
```

### Layers機能（一元管理）

#### なぜ一元管理か
- 地図画面、投稿作成画面、レイヤー管理画面で共有
- 選択状態のリアルタイム同期が必要
- ユーザーの選択を永続化

#### 実装構造
```
src/features/layers/
├── application/
│   └── layers-store.ts            # レイヤー状態管理
├── domain/
│   ├── entities/
│   │   └── Layer.ts               # レイヤーエンティティ
│   └── utils/
│       └── layerUtils.ts          # レイヤー関連ユーティリティ
├── infrastructure/
│   └── layers-service.ts          # レイヤーAPIサービス
└── presentation/
    ├── hooks/
    │   ├── use-layers-query.ts    # TanStack Query統合
    │   └── useLayerSelection.ts   # レイヤー選択ロジック
    └── providers/
        └── LayersProvider.tsx      # 初期データ取得と同期
```

#### 特徴的な実装

**1. 選択状態の永続化**
```typescript
persist(
  // ...
  {
    partialize: (state) => ({
      settings: state.settings,
      selectedLayerIds: state.selectedLayerIds  // 選択も永続化
    })
  }
)
```

**2. 初期化ロジック**
```typescript
initializeSelectedLayers: () => {
  if (state.selectedLayerIds.length > 0) return; // 永続化データ優先
  
  if (state.settings.defaultLayerIds.length > 0) {
    state.selectedLayerIds = state.settings.defaultLayerIds;
  } else if (state.settings.showAllByDefault) {
    state.selectedLayerIds = state.availableLayers.map(layer => layer.id);
  }
}
```

### Location機能（一元管理）

#### なぜ一元管理か
- 地図表示、AudioPin作成、ナビゲーションで使用
- リアルタイムの位置情報更新が必要
- 権限状態をアプリ全体で共有

#### 実装構造
```
src/features/location/
├── application/
│   └── location-store.ts          # 位置情報状態管理
├── domain/
│   └── entities/
│       └── Location.ts            # UserLocationData型定義
├── infrastructure/
│   └── services/
│       └── locationStateManager.ts # 位置情報監視サービス（シングルトン）
└── presentation/
    ├── hooks/
    │   ├── useLocation.ts         # 後方互換性フック
    │   └── useLocationContext.ts  # Context統合
    └── providers/
        └── LocationProvider.tsx   # 権限管理と初期化
```

#### 特徴的な実装

**1. StableLocationの管理**
```typescript
// 地図表示用の安定した位置情報
interface LocationState {
  currentLocation: UserLocationData | null;  // リアルタイム位置
  stableLocation: UserLocationData | null;   // 閾値以上移動時のみ更新
}
```

**2. Heading更新のスロットリング**
```typescript
private headingThrottleInterval: number = 250; // 250ms
// パフォーマンス最適化のため方向情報を制限
```

**3. 権限変更の自動検知**
```typescript
// AppStateで設定画面から戻った時の権限変更を検知
AppState.addEventListener('change', handleAppStateChange);
```

### Account機能（個別管理）

#### なぜ個別管理か
- プロフィール作成画面でのみ使用
- 他機能からの依存なし
- シンプルなフォーム管理で十分

#### 実装構造
```
src/features/account/
├── application/
│   └── account-store.ts           # フォーム状態のみ管理
├── domain/
│   └── entities/
│       └── Profile.ts             # プロフィールエンティティ
├── infrastructure/
│   └── services/
│       └── accountService.ts      # プロフィールAPI（StateManagerなし）
└── presentation/
    ├── hooks/
    │   ├── use-account.ts         # 統合フック
    │   └── use-account-query.ts   # TanStack Query
    └── providers/
        └── AccountProvider.tsx    # 最小限のProvider
```

#### 特徴的な実装

**1. 最小限のアクション（4つのみ）**
```typescript
interface AccountFormActions {
  updateForm: (updates: Partial<ProfileCreationForm>) => void;
  setFormError: (field: string, error?: string) => void;
  clearFormErrors: () => void;
  resetForm: () => void;
}
```

**2. Blob管理の最適化**
```typescript
// ストアにはURIのみ保存
avatarUri?: string;  // Blobはuse-account.ts内のuseRefで管理
```

**3. シンプルなProvider**
```typescript
// StateManagerなし、最小限のContext値
interface AccountContextValue {
  hasCompletedProfile: boolean;
  isCheckingProfile: boolean;
}
```

## ベストプラクティス

### 1. StateManagerパターンの適切な使用
- **必要な場合**: 外部サービスとの同期が複雑（Auth、Location）
- **不要な場合**: シンプルなCRUD操作（Account、Layers）

### 2. 永続化の戦略
```typescript
partialize: (state) => ({
  settings: state.settings,  // 設定は永続化
  // UI状態は永続化しない
  // サーバー状態はTanStack Queryが管理
})
```

### 3. セレクターパターン
```typescript
// 個別セレクター（再レンダリング最適化）
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

// アクション取得は個別に（無限ループ防止）
const updateForm = useAccountFormStore((state) => state.updateForm);
const setFormError = useAccountFormStore((state) => state.setFormError);
```

### 4. TanStack Queryとの連携
```typescript
// サーバー状態はTanStack Queryで管理
const { data: profile } = useProfileQuery(userId);

// Zustandストアへの同期は最小限に
useEffect(() => {
  if (data) {
    useLayersStore.getState().setAvailableLayers(data);
  }
}, [data]);
```

## アンチパターン

### 1. 過度な一元管理
❌ すべての機能にStateManagerを実装
✅ 複雑性に応じて判断

### 2. 不適切な永続化
❌ サーバー状態を永続化
❌ 大きなBlobデータを永続化
✅ 設定と必要最小限の状態のみ

### 3. アクションの過剰な分割
❌ 15個の個別セッター
✅ 統合された更新関数

### 4. Contextの誤用
❌ 頻繁に更新される値をContextに配置
✅ 安定した値のみContext経由で提供

### 5. shallow比較の誤用
❌ 最新のZustandで不要なshallow比較
✅ 必要な場合のみ使用

## まとめ

SoundZoneの状態管理は、機能の複雑性と使用範囲に応じて適切に設計されています：

- **一元管理**: Auth、Layers、Location（グローバルな影響を持つ機能）
- **個別管理**: Account（局所的な機能）

各実装は[StateManagement.md](./StateManagement.md)の原則に従い、パフォーマンスと保守性のバランスを保っています。