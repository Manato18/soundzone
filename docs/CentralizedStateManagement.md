# SoundZone 一元管理アーキテクチャガイド

## 目次
1. [概要](#概要)
2. [現状の実装分析](#現状の実装分析)
3. [Auth機能の状態管理詳細](#auth機能の状態管理詳細)
4. [Layers機能の状態管理詳細](#layers機能の状態管理詳細)
5. [Location機能の状態管理詳細](#location機能の状態管理詳細)
6. [一元管理の判断基準](#一元管理の判断基準)
7. [各機能の詳細分析](#各機能の詳細分析)
8. [メリット・デメリット](#メリット・デメリット)
9. [今後の推奨事項](#今後の推奨事項)
10. [実装パターン](#実装パターン)


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
| Location | ✅ LocationProvider | location-store.ts + locationStateManager | ✅ settings | 完全な一元管理実装済み |

---

## 一元状態管理（Centralized State Management）

### 一元管理の判断基準

**一元管理が必要な場合**：
- 3つ以上の画面で同じデータを参照
- 画面間でのリアルタイム同期が必要
- 他の機能がそのデータに依存
- アプリ全体の動作に影響するグローバル状態

**個別管理で十分な場合**：
- 特定画面でのみ使用される状態
- 画面遷移時にリセットしてよい一時的なデータ
- 他機能に影響しない独立した処理

### Provider実装パターン

```typescript
// 1. ディレクトリ構造
src/features/<feature>/
├── application/
│   └── <feature>-store.ts         # Zustandストア
├── domain/
│   └── entities/                  # ドメインエンティティ
├── infrastructure/
│   └── services/                  # APIサービス、状態管理サービス
└── presentation/
    ├── hooks/
    │   ├── use-<feature>.ts       # 統合フック
    │   └── use-<feature>-query.ts # TanStack Query統合
    └── providers/
        └── <Feature>Provider.tsx   # コンテキストプロバイダー

// 2. Provider実装例
export const FeatureProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // 初期データ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature'],
    queryFn: fetchFeatureData,
    staleTime: Infinity, // データ特性に応じて設定
  });

  // Zustandストアへの同期
  useEffect(() => {
    if (data) {
      useFeatureStore.getState().setData(data);
    }
  }, [data]);

  if (error) return <ErrorBoundary error={error} />;
  return <>{children}</>;
};
```

### 状態の分類と管理戦略

```typescript
interface FeatureState {
  // サーバー状態（TanStack Queryで管理）
  data: Entity[];
  
  // UI状態（Zustand管理、非永続）
  ui: {
    isLoading: boolean;
    error: string | null;
    selectedId: string | null;
    modalState: ModalState;
  };
  
  // 設定（Zustand管理、MMKV永続化）
  settings: {
    userPreferences: Preferences;
    cachedSelections: string[];
  };
  
  // プロセス状態（競合防止用）
  processState: 'IDLE' | 'PROCESSING' | 'ERROR';
}
```

### Zustand Middlewareの順序（重要）

```typescript
// 正しい順序：外側から内側へ
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
          settings: state.settings  // 設定のみ永続化
        })
      }
    ),
    { enabled: process.env.NODE_ENV === 'development' }
  )
);
```

### 楽観的更新の実装

```typescript
const useUpdateFeatureMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateFeature,
    onMutate: async (newData) => {
      // 1. 既存クエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['feature'] });
      
      // 2. 現在のデータを保存
      const previousData = queryClient.getQueryData(['feature']);
      
      // 3. 楽観的更新
      queryClient.setQueryData(['feature'], (old) => ({
        ...old,
        ...newData
      }));
      
      // 4. ロールバック用コンテキストを返す
      return { previousData };
    },
    onError: (err, _, context) => {
      // エラー時はロールバック
      if (context?.previousData) {
        queryClient.setQueryData(['feature'], context.previousData);
      }
    },
    onSettled: () => {
      // 最終的に最新データを取得
      queryClient.invalidateQueries({ queryKey: ['feature'] });
    }
  });
};
```

### セレクターパターン

```typescript
// 個別セレクター（再描画最適化）
export const useFeatureData = () => useFeatureStore((state) => state.data);
export const useFeatureUI = () => useFeatureStore((state) => state.ui, shallow);

// 複合セレクター
export const useSelectedFeature = () => {
  const data = useFeatureStore((state) => state.data);
  const selectedId = useFeatureStore((state) => state.ui.selectedId);
  return data.find(item => item.id === selectedId);
};

// セレクターオブジェクト（再利用可能）
export const featureSelectors = {
  getFilteredData: (filter: Filter) => (state: FeatureState) => {
    return state.data.filter(item => matchesFilter(item, filter));
  },
  isItemSelected: (id: string) => (state: FeatureState) => {
    return state.ui.selectedId === id;
  }
};
```

### 一元管理のベストプラクティス

1. **初期化戦略**：
   - 永続化データの復元を優先
   - デフォルト値へのフォールバック
   - 初回起動時の特別処理

2. **クリーンアップ**：
   - ログアウト時の状態リセット
   - 不要なキャッシュの削除
   - メモリリークの防止

3. **エラーハンドリング**：
   - グレースフルデグラデーション
   - ユーザーへの適切なフィードバック
   - リトライ戦略

4. **パフォーマンス最適化**：
   - セレクターによる再描画制御
   - メモ化の適切な使用
   - バッチ更新の活用

---

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

## Location機能の状態管理詳細

### アーキテクチャ構造

```
src/features/location/
├── application/
│   └── location-store.ts          # Zustandストア（中央状態管理）
├── domain/
│   └── entities/
│       └── Location.ts            # 位置情報エンティティ
├── infrastructure/
│   └── services/
│       └── locationStateManager.ts # 位置情報状態管理サービス
└── presentation/
    ├── hooks/
    │   ├── useLocation.ts         # 後方互換性用フック
    │   └── useLocationContext.ts  # Context統合フック
    └── providers/
        └── LocationProvider.tsx   # 位置情報コンテキストプロバイダー
```

### 状態管理の特徴

#### Zustandストア (location-store.ts)

**状態の分類**:
```typescript
interface LocationState {
  // サーバー状態（将来的にサーバー連携も想定）
  currentLocation: UserLocationData | null;  // 現在の位置情報
  stableLocation: UserLocationData | null;   // 安定した位置情報（地図表示用）
  
  // UI状態
  isLoading: boolean;
  error: string | null;
  isLocationEnabled: boolean;
  isTracking: boolean;
  
  // 設定（永続化対象）
  settings: {
    locationUpdateInterval: number;     // ミリ秒単位
    highAccuracyMode: boolean;
    distanceFilter: number;            // メートル単位
    headingUpdateInterval: number;     // ミリ秒単位（方向情報の更新間隔）
    stableLocationThreshold: number;   // メートル単位（安定位置の更新閾値）
  };
}
```

**Middleware構成**:
```typescript
create<LocationStore>()(
  devtools(                           // 最外層：開発ツール
    persist(                          // 永続化
      immer(                          // イミュータブル更新
        subscribeWithSelector((set) => ({...}))
      ),
      {
        name: 'location-settings',
        storage: mmkvStorage,
        partialize: (state) => ({ 
          settings: state.settings    // 設定のみ永続化
        })
      }
    ),
    { enabled: process.env.NODE_ENV === 'development' }
  )
)
```

**セレクターフック**:
- 個別セレクター: `useCurrentLocation()`, `useStableLocation()`, `useIsLocationEnabled()`
- UI状態セレクター: `useLocationUIState()` (shallow比較で最適化)
- 設定セレクター: `useLocationSettings()`
- アクションセレクター: `useLocationActions()` (全アクションを返す)

#### LocationStateManager (シングルトンサービス)

**特徴**:
```typescript
class LocationStateManager {
  private static instance: LocationStateManager;
  private locationSubscription: Location.LocationSubscription | null = null;
  private headingSubscription: Location.LocationSubscription | null = null;
  private lastHeadingUpdate: number = 0;
  private headingThrottleInterval: number = 250; // 250ms スロットリング
  private errorCallback: ((error: LocationError) => void) | null = null;
  
  // シングルトンパターン
  static getInstance(): LocationStateManager {
    if (!LocationStateManager.instance) {
      LocationStateManager.instance = new LocationStateManager();
    }
    return LocationStateManager.instance;
  }
}
```

**主要機能**:
1. **位置情報の許可管理**:
   - 権限要求と状態確認
   - 位置情報サービスの有効性チェック
   - エラー時のコールバック通知

2. **位置情報の監視**:
   - watchPositionAsyncによる継続的な位置情報取得
   - heading（方向）情報の別途監視
   - 250msスロットリングによるパフォーマンス最適化

3. **stableLocationの管理**:
   - 移動距離が閾値を超えた場合のみ更新
   - headingは常に最新値を反映
   - 地図表示の安定性を確保

### 一元管理の実装ポイント

1. **LocationProviderによる自動初期化**:
   ```typescript
   useEffect(() => {
     // エラーコールバックの設定
     locationStateManager.setErrorCallback((error: LocationError) => {
       // UIアラートをPresentation層で処理
       if (error.code === 'PERMISSION_DENIED') {
         Alert.alert('位置情報の許可', '...');
       }
     });
     
     // マウント時に位置情報サービスを初期化
     locationStateManager.initialize();

     // クリーンアップ
     return () => {
       locationStateManager.cleanup();
     };
   }, []);
   ```

2. **AppState監視による権限変更検知**:
   ```typescript
   useEffect(() => {
     const handleAppStateChange = async (nextAppState: AppStateStatus) => {
       if (nextAppState === 'active') {
         // フォアグラウンド復帰時に権限状態を再チェック
         const hasPermission = await locationStateManager.requestLocationPermission();
         
         if (hasPermission && !isLocationEnabled) {
           // 権限が付与された場合、サービスを初期化
           await locationStateManager.initialize();
         } else if (!hasPermission && isLocationEnabled) {
           // 権限が取り消された場合、サービスを停止
           locationStateManager.stopLocationTracking();
         }
       }
     };
     
     appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
   }, [isLocationEnabled]);
   ```

3. **パフォーマンス最適化**:
   - **Heading更新のスロットリング**: 250ms間隔で更新を制限
   - **Shallow比較**: useLocationUIStateで再レンダリング最小化
   - **StableLocation**: 閾値以上の移動時のみ更新

4. **エラーハンドリング戦略**:
   - **レイヤー分離**: InfrastructureレイヤーでエラーをキャッチしPresentation層へコールバック
   - **権限エラーの自動クリア**: 権限取得成功時にエラー状態をクリア
   - **サービス無効化の検出**: 位置情報サービス自体の有効性も確認

5. **Context APIとの統合**:
   ```typescript
   export interface LocationContextValue {
     location: UserLocationData | null;
     stableLocation: UserLocationData | null;
     errorMsg: string | null;
     isLocationEnabled: boolean;
     isLoading: boolean;
     isTracking: boolean;
     
     // アクション
     getCurrentLocation: () => Promise<UserLocationData | null>;
     startLocationTracking: () => Promise<void>;
     stopLocationTracking: () => void;
     requestLocationPermission: () => Promise<boolean>;
   }
   ```

6. **後方互換性の維持**:
   - `useLocation`: 既存コードとの互換性を保つラッパーフック
   - `useLocationContext`: 新規実装で推奨される統合フック

## 各機能の詳細分析

### 実装済み（一元管理）

#### Auth機能 ✅
- **理由**: アプリ全体で認証状態を参照
- **実装**: AuthProvider + auth-store + authStateManager
- **永続化**: 設定のみ（セキュリティを考慮）

#### Layers機能 ✅
- **理由**: 複数画面でレイヤー選択を共有
- **実装**: LayersProvider + layers-store
- **永続化**: 設定と選択状態

#### Location機能 ✅
- **理由**: 地図、AudioPin作成で位置情報を共有
- **実装**: LocationProvider + location-store + locationStateManager
- **永続化**: 設定のみ（位置情報は永続化しない）

### アンチパターン

1. **過度な正規化**
   - 不必要な状態の分割
   - 複雑なセレクターの連鎖

2. **永続化の誤用**
   - センシティブ情報の永続化
   - 大量データの永続化

3. **Context の乱用**
   - 頻繁に更新される値の配置
   - 巨大なContextオブジェクト
