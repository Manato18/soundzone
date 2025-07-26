# SoundZone 一元管理アーキテクチャガイド

## 目次
1. [概要](#概要)
2. [現状の実装分析](#現状の実装分析)
3. [Auth機能の状態管理詳細](#auth機能の状態管理詳細)
4. [Layers機能の状態管理詳細](#layers機能の状態管理詳細)
5. [一元管理の判断基準](#一元管理の判断基準)
6. [各機能の詳細分析](#各機能の詳細分析)
7. [メリット・デメリット](#メリット・デメリット)
8. [今後の推奨事項](#今後の推奨事項)
9. [実装パターン](#実装パターン)


Layer, Auth, Location は一元管理が良さそう

## 概要

このドキュメントは、SoundZoneアプリにおける状態管理の一元化に関する現状分析と今後の方針を示します。StateManagement.mdの設計原則に基づき、各機能モジュールの最適な管理方法を定義します。

## 現状の実装分析

### アーキテクチャ構成
- **状態管理**: Zustand + React Query
- **永続化**: MMKV
- **レイヤー構造**: Domain → Infrastructure → Application → Presentation

### 実装済みの一元管理

| 機能 | Provider実装 | 状態管理 | 永続化 | 備考 |
|-----|------------|---------|--------|------|
| Layers | ✅ LayersProvider | layers-store.ts | ✅ settings, selectedLayerIds | 完全な一元管理実装 |
| Auth | ✅ AuthProvider | auth-store.ts + authStateManager | ✅ settings only | 完全な一元管理実装済み |
| Location | ❌ なし | location-store.ts | ✅ settings | ストアレベルで管理 |
| AudioPin | ❌ なし | audioPin-store.ts | ✅ settings | 部分的な管理のみ |
| Map | ❌ なし | map-store.ts | ✅ settings | 画面固有の状態管理 |

## Auth機能の状態管理詳細

### アーキテクチャ構造

```
src/features/auth/
├── application/
│   └── auth-store.ts              # Zustandストア（中央状態管理）
├── domain/
│   └── entities/
│       └── User.ts                # ドメインエンティティ
├── infra/
│   └── services/
│       ├── authService.ts         # Supabase認証サービス
│       ├── authStateManager.ts    # 認証状態の同期管理
│       ├── authTokenManager.ts    # トークン管理
│       ├── authInterceptor.ts     # API認証インターセプター
│       ├── rateLimiter.ts         # レート制限
│       ├── sessionPersistence.ts  # セッション永続化
│       └── sessionRestoration.ts  # セッション復元
└── presentation/
    ├── hooks/
    │   ├── use-auth.ts            # TanStack Query統合フック
    │   └── use-auth-api.ts        # 認証付きAPI呼び出し
    └── providers/
        └── AuthProvider.tsx       # 認証コンテキストプロバイダー
```

### 状態管理の特徴

#### Zustandストア (auth-store.ts)

**状態の分類**:
```typescript
interface AuthState {
  // サーバー状態（TanStack Queryと同期）
  user: QueryUser | null;
  isAuthenticated: boolean;
  
  // 認証プロセスの状態管理（競合状態防止用）
  authProcessState: 'IDLE' | 'SIGNING_IN' | 'SIGNING_UP' | 'SIGNING_OUT';
  
  // UI状態（フォーム・モーダルなど）
  ui: {
    loginForm: { email, password, isSubmitting, errors };
    signUpForm: { email, password, confirmPassword, isSubmitting, errors };
    emailVerification: { email, verificationCode, isVerifying, resendCooldown, errors };
    modals: { showPasswordReset, showEmailVerification };
  };

  // 永続化する設定
  settings: {
    biometricEnabled: boolean;
    autoLoginEnabled: boolean;
    isFirstLaunch: boolean;
    lastLoginEmail?: string;
  };
}
```

**Middleware構成**:
```typescript
create<AuthState & AuthActions>()(
  devtools(              // 最外層：開発ツール
    persist(             // 永続化
      immer(             // イミュータブル更新
        subscribeWithSelector((set) => ({...}))
      ),
      {
        name: 'auth-storage',
        storage: mmkvStorage,
        partialize: (state) => ({ settings: state.settings })
      }
    ),
    { enabled: process.env.NODE_ENV === 'development' }
  )
)
```

**セレクターパターン**:
- 個別セレクター: `useAuthUser()`, `useIsAuthenticated()`
- 複合セレクター: `useLoginForm()`, `useAuthSettings()`
- アクションセレクター: `useAuthActions()` (全アクションを返す)

#### TanStack Queryとの統合

**クエリ設定**:
```typescript
useCurrentUserQuery: {
  queryKey: queryKeys.auth.user(),
  staleTime: 30 * 60 * 1000,  // 30分
  gcTime: 60 * 60 * 1000,      // 1時間
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  initialData: user            // Zustandストアから初期値
}
```

**ミューテーション**:
- `useSignInMutation`: ログイン処理
- `useSignUpMutation`: 新規登録処理
- `useSignOutMutation`: ログアウト処理
- `useVerifyOTPMutation`: OTP検証
- `useResendVerificationEmailMutation`: 確認メール再送

### 一元管理の実装ポイント

1. **authStateManagerによる自動同期**:
   - Supabaseの認証状態変更を監視
   - 自動的にZustandストアを更新
   - トークンの自動更新処理

2. **競合状態の防止**:
   - `authProcessState`で認証処理の排他制御
   - 同時に複数の認証処理を防ぐ

3. **複合フックによるビジネスロジック**:
   - `useLoginFormHook`: レート制限、バリデーション、エラー処理
   - `useSignUpFormHook`: パスワード強度チェック、確認処理
   - `useEmailVerificationHook`: OTP検証、再送信クールダウン

4. **セキュリティ対策**:
   - レート制限（rateLimiter）
   - セッションの暗号化保存（sessionPersistence）
   - エラーメッセージのサニタイズ（errorSanitizer）

## Layers機能の状態管理詳細

### アーキテクチャ構造

```
src/features/layers/
├── application/
│   └── layers-store.ts            # Zustandストア
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
    │   ├── useLayerSelection.ts   # レイヤー選択ロジック
    │   └── useLayerSubscriptionExample.ts
    ├── components/
    │   ├── LayerSelector.tsx      # レイヤー選択UI
    │   └── LayersDebugPanel.tsx   # デバッグパネル
    └── providers/
        └── LayersProvider.tsx      # レイヤーコンテキスト
```

### 状態管理の特徴

#### Zustandストア (layers-store.ts)

**状態の分類**:
```typescript
interface LayersState {
  // サーバー状態（将来的にTanStack Queryで管理予定）
  availableLayers: Layer[];
  
  // UI状態
  selectedLayerIds: string[];
  isLoading: boolean;
  error: string | null;
  
  // 設定（永続化対象）
  settings: {
    favoriteLayerIds: string[];
    defaultLayerIds: string[];
    showAllByDefault: boolean;
  };
}
```

**永続化戦略**:
```typescript
persist(
  immer(subscribeWithSelector((set) => ({...}))),
  {
    name: StorageKeys.LAYERS.SETTINGS,
    storage: layersStorage,
    partialize: (state) => ({
      settings: state.settings,
      selectedLayerIds: state.selectedLayerIds  // 選択状態も永続化
    })
  }
)
```

**セレクターオブジェクト**:
```typescript
export const layersSelectors = {
  getSelectedLayers: (state) => state.availableLayers.filter(...),
  getFavoriteLayers: (state) => state.availableLayers.filter(...),
  isLayerSelected: (layerId) => (state) => state.selectedLayerIds.includes(layerId),
  isLayerFavorite: (layerId) => (state) => state.settings.favoriteLayerIds.includes(layerId)
};
```

#### TanStack Queryとの統合

**レイヤー一覧取得**:
```typescript
useLayersQuery: {
  queryKey: queryKeys.layer.list(),
  staleTime: Infinity,         // レイヤーは基本的に変更されない
  gcTime: 24 * 60 * 60 * 1000  // 24時間キャッシュ
}
```

**楽観的更新の実装**:
```typescript
useCreateLayerMutation: {
  onMutate: async (newLayer) => {
    // 1. 既存クエリをキャンセル
    await queryClient.cancelQueries({ queryKey: queryKeys.layer.list() });
    
    // 2. 楽観的更新用の一時データ作成
    const optimisticLayer = { ...newLayer, id: `temp-${Date.now()}` };
    
    // 3. キャッシュを更新
    queryClient.setQueryData(queryKeys.layer.list(), [...previousLayers, optimisticLayer]);
    
    // 4. ロールバック用のコンテキストを返す
    return { previousLayers };
  },
  onError: (err, _, context) => {
    // エラー時は元に戻す
    queryClient.setQueryData(queryKeys.layer.list(), context.previousLayers);
  },
  onSettled: () => {
    // 成功・失敗に関わらず最新データを取得
    queryClient.invalidateQueries({ queryKey: queryKeys.layer.list() });
  }
}
```

### 一元管理の実装ポイント

1. **初期化ロジック**:
   ```typescript
   initializeSelectedLayers: () => {
     // 永続化データがある場合はスキップ
     if (state.selectedLayerIds.length > 0) return;
     
     // デフォルト設定から初期化
     if (state.settings.defaultLayerIds.length > 0) {
       state.selectedLayerIds = state.settings.defaultLayerIds;
     } else if (state.settings.showAllByDefault) {
       state.selectedLayerIds = state.availableLayers.map(layer => layer.id);
     }
   }
   ```

2. **データ同期**:
   - React QueryでAPIから取得
   - useEffectでZustandストアに同期
   - 初回のみ選択状態を初期化

3. **ユーザー設定の管理**:
   - `useUserLayerPreferencesQuery`: ユーザー固有の設定を取得
   - `useSaveUserLayerPreferencesMutation`: 設定の保存
   - サーバーとローカルの設定を統合

4. **楽観的更新による即座のフィードバック**:
   - 作成・更新・削除時に即座にUIを更新
   - エラー時は自動的にロールバック
   - バックグラウンドで実際のデータと同期
