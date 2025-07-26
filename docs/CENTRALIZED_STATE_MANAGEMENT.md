# SoundZone 一元管理アーキテクチャガイド

## 目次
1. [概要](#概要)
2. [現状の実装分析](#現状の実装分析)
3. [一元管理の判断基準](#一元管理の判断基準)
4. [各機能の詳細分析](#各機能の詳細分析)
5. [メリット・デメリット](#メリット・デメリット)
6. [今後の推奨事項](#今後の推奨事項)
7. [実装パターン](#実装パターン)


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

## 一元管理の判断基準

### 🔴 一元管理が必要な条件
1. **複数画面での使用**
   - 3つ以上の画面で同じデータを参照
   - ナビゲーション時もデータを保持

2. **リアルタイム同期**
   - 画面間でのデータ同期が必要
   - WebSocketなどでのリアルタイム更新

3. **他機能への依存**
   - 他の機能がこのデータに依存
   - データ変更が他機能に影響

4. **グローバル状態**
   - アプリ全体の動作に影響
   - ユーザーセッション中は常に必要

### 🟢 個別管理で十分な条件
1. **画面固有の状態**
   - 特定画面でのみ使用
   - 画面遷移時にリセットしてOK

2. **一時的なデータ**
   - フォーム入力値
   - モーダルの開閉状態

3. **独立した機能**
   - 他機能に影響しない
   - 単独で完結する処理

## 各機能の詳細分析

### 1. Layers（レイヤー）機能

#### 現在の実装
```typescript
// LayersProvider実装済み
- アプリ起動時に一度だけレイヤーデータを取得
- React Queryでキャッシュ管理（staleTime: Infinity）
- Zustandストアで選択状態を管理
- 楽観的更新で即座に反映
```

#### なぜ一元管理が必要か
- **地図画面**: ピンのフィルタリング
- **録音画面**: 投稿先レイヤーの選択
- **マイピン画面**: レイヤー別の表示
- **設定画面**: お気に入りレイヤー管理

#### メリット
- API呼び出しが1回のみ
- 全画面で即座に反映
- キャッシュの効率的な活用

### 2. Auth（認証）機能

#### 現在の実装（✅ 実装済み）
```typescript
// AuthProvider + authStateManager + auth-store.tsで完全な一元管理
interface AuthState {
  user: QueryUser | null;
  isAuthenticated: boolean;
  authProcessState: 'IDLE' | 'SIGNING_IN' | 'SIGNING_UP' | 'SIGNING_OUT';
  ui: { loginForm, signUpForm, emailVerification };
  settings: { // 永続化される設定
    biometricEnabled: boolean;
    autoLoginEnabled: boolean;
    isFirstLaunch: boolean;
    lastLoginEmail?: string;
  };
}
```

#### 実装された機能
- **AuthProvider**: アプリ起動時のセッション復元
- **authStateManager**: Supabase認証状態の監視と同期
- **authTokenManager**: トークンの自動更新
- **sessionPersistence**: セッションの暗号化保存

#### 主な特徴
- **競合状態の防止**: authProcessStateで認証処理の状態を管理
- **自動クリーンアップ**: ログアウト時に以下をクリア
  - Zustandストア（設定以外）
  - TanStack Queryキャッシュ
  - Supabaseセッション
  - 永続化されたセッション
- **設定の保持**: ユーザビリティのため以下は保持
  - lastLoginEmail（次回ログイン時の利便性）
  - biometricEnabled（生体認証設定）
  - autoLoginEnabled（自動ログイン設定）

### 3. Location（位置情報）機能

#### 現在の実装
```typescript
// location-store.tsで管理
interface LocationState {
  currentLocation: UserLocationData | null;
  isTracking: boolean;
  settings: {
    locationUpdateInterval: number;
    highAccuracyMode: boolean;
    distanceFilter: number;
  };
}
```

#### なぜ一元管理が必要か
- **地図画面**: 現在位置の表示
- **録音画面**: 位置情報の記録
- **ピン詳細**: 距離の計算
- **バックグラウンド**: 位置追跡

#### 課題
- 複数箇所でlocationの取得処理が重複
- stableLocationの管理が画面固有
- headingの更新が不安定

### 4. AudioPin機能

#### 現在の実装
```typescript
// audioPin-store.tsで管理（UI状態のみ）
interface AudioPinState {
  selectedPin: AudioPin | null;
  isModalVisible: boolean;
  playbackState: AudioPlaybackState;
  settings: { autoPlayOnPinTap, volume, etc };
}
```

#### 部分的に一元管理が必要な理由
- **ピンリスト**: 地図画面で常に表示
- **再生状態**: 画面遷移しても継続
- **お気に入り**: 複数画面で参照

#### 推奨する分離
```typescript
// 一元管理（AudioPinProvider）
- pins: AudioPin[] // フィルタリング済みのピンリスト
- playingPinId: string | null // 再生中のピン
- favoritePinIds: string[] // お気に入り

// 個別管理（各画面のフック）
- modalVisible: boolean // モーダル表示
- editingPin: Partial<AudioPin> // 編集中のデータ
```

### 5. Map（地図）機能

#### 現在の実装
```typescript
// map-store.tsで管理
interface MapState {
  region: MapRegion;
  zoomLevel: number;
  isFollowingUser: boolean;
  settings: { mapType, showCompass, etc };
}
```

#### 個別管理で十分な理由
- HomeScreen限定の機能
- 他画面では地図を表示しない
- 画面固有の表示設定

## メリット・デメリット

### 一元管理のメリット

#### 1. パフォーマンス
- **API呼び出し削減**: 重複リクエストの排除
- **キャッシュ効率**: React Queryの最適化
- **レンダリング最適化**: 不要な再描画の防止

#### 2. 開発効率
- **コードの一貫性**: 同じパターンで実装
- **デバッグ容易性**: データフローが明確
- **テストの簡潔性**: モックが容易

#### 3. ユーザー体験
- **即座の反映**: 楽観的更新
- **一貫した状態**: 画面間の同期
- **オフライン対応**: キャッシュ活用

### 一元管理のデメリット

#### 1. 複雑性
- **初期実装コスト**: Provider設定が必要
- **学習曲線**: 新規開発者の理解が必要
- **過剰な抽象化**: 単純な機能には不要

#### 2. メモリ使用
- **常駐データ**: アプリ全体でメモリ占有
- **不要なキャッシュ**: 使わないデータも保持
- **クリーンアップ**: 適切な管理が必要

#### 3. 結合度
- **依存関係**: 変更の影響範囲が大きい
- **テストの複雑化**: 統合テストが必要
- **リファクタリング困難**: 大規模な変更が困難

## 今後の推奨事項

### ✅ 実装済み: AuthProvider
```typescript
// 実装完了した機能
- トークンの自動更新機能（authTokenManager）
- セッション復元の一元化（AuthProvider + sessionRestoration）
- ログアウト時の全データクリア（authStateManager）
- 競合状態の防止（authProcessState）

// 現在の構成
<QueryClientProvider>
  <AuthProvider>
    <LayersProvider>
      <App />
    </LayersProvider>
  </AuthProvider>
</QueryClientProvider>
```

### 優先度1: LocationProvider実装
```typescript
// 実装理由
- 位置情報の重複取得を防止
- stableLocationの一元管理
- バックグラウンド位置追跡

// 実装内容
- 位置情報の取得ロジックを統合
- エラーハンドリングの一元化
- 権限管理の統合
```

### 優先度2: AudioPinProvider実装
```typescript
// 実装理由
- ピンリストのキャッシュ管理
- 再生状態の永続化
- レイヤーフィルタリングとの連携

// 実装内容
- ピンリストの一元管理
- 再生キューの実装
- お気に入り機能の統合
```

### 実装しない方が良いもの
- **MapProvider**: 画面固有で十分
- **RecordingProvider**: 一時的な状態のみ
- **AccountProvider**: 設定画面限定

## 実装パターン

### Provider実装の基本構造
```typescript
// 1. Provider実装
export const FeatureProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // React Queryでデータ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature'],
    queryFn: fetchFeatureData,
    staleTime: Infinity,
  });

  // Zustandストアに同期
  useEffect(() => {
    if (data) {
      useFeatureStore.getState().setData(data);
    }
  }, [data]);

  // エラーハンドリング
  if (error) {
    return <ErrorBoundary error={error} />;
  }

  return <>{children}</>;
};

// 2. カスタムフック
export const useFeature = () => {
  // 必要な状態のみ選択
  const data = useFeatureStore(state => state.data, shallow);
  const actions = useFeatureStore(state => state.actions);
  
  return { data, ...actions };
};

// 3. 楽観的更新
export const useUpdateFeature = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateFeature,
    onMutate: async (newData) => {
      // 楽観的更新
      await queryClient.cancelQueries(['feature']);
      const previous = queryClient.getQueryData(['feature']);
      queryClient.setQueryData(['feature'], newData);
      return { previous };
    },
    onError: (err, _, context) => {
      // ロールバック
      queryClient.setQueryData(['feature'], context.previous);
    },
  });
};
```

### 判断フローチャート
```
┌─────────────────────────┐
│ 新機能の状態管理を検討  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 複数画面で使用？        │
└───────────┬─────────────┘
            │
        ┌───┴───┐
        │ Yes    │ No
        ▼        ▼
┌───────────┐ ┌───────────┐
│ 他機能が   │ │ 個別管理  │
│ 依存？     │ │ で実装    │
└───────────┘ └───────────┘
        │
    ┌───┴───┐
    │ Yes    │ No
    ▼        ▼
┌───────────┐ ┌───────────┐
│ Provider  │ │ Store     │
│ 実装      │ │ のみ実装  │
└───────────┘ └───────────┘
```

## まとめ

SoundZoneの状態管理は、機能の特性に応じて適切に選択することが重要です。一元管理は強力なパターンですが、すべてに適用する必要はありません。各機能の使用範囲、依存関係、パフォーマンス要件を考慮し、最適な管理方法を選択してください。

現在のLayersProviderとAuthProviderの実装は、この原則に従った良い例であり、今後のLocation、AudioPinへの適用も推奨されます。

### 実装状況サマリー
- **✅ Layers**: 完全な一元管理実装済み
- **✅ Auth**: 完全な一元管理実装済み（authStateManager + AuthProvider）
- **⏳ Location**: 次の優先実装対象
- **⏳ AudioPin**: その次の実装対象
- **❌ Map**: 画面固有のため個別管理を継続