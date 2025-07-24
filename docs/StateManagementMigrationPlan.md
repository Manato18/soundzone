# 状態管理移行計画書

**最終更新日: 2025-07-24**

## 1. 現状分析

### 1.1 状態管理の現状

現在のプロジェクトでは、状態管理の実装が以下のように混在しています：

#### **StateManagement.mdに準拠している部分（auth機能のみ）**
- **Zustand**: auth-store.tsで認証関連の状態を管理
- **TanStack Query**: useCurrentUserQuery、各種Mutationフックで実装
- **MMKV**: 設定の永続化に使用
- **レイヤー分離**: Clean Architectureに従った4層構造

#### **StateManagement.mdに準拠していない部分（その他すべての機能）**
- **audioPin機能**: React標準のuseStateのみ使用
- **layers機能**: React標準のuseStateのみ使用
- **location機能**: React標準のuseState、useRef、useEffectを使用
- **map機能**: React標準のuseStateのみ使用

### 1.2 主要な問題点

1. **グローバル状態管理の欠如**
   - 各機能がローカル状態のみを使用
   - コンポーネント間での状態共有が困難
   - 状態の重複や不整合のリスク

2. **サーバー状態管理の未実装**
   - APIとの連携が未実装
   - キャッシュ管理なし
   - オプティミスティックアップデートなし

3. **永続化の未実装**
   - ユーザー設定が保存されない
   - アプリ再起動時に状態がリセット

4. **アーキテクチャの不整合**
   - application層が存在しない機能が多い
   - presentationレイヤーにビジネスロジックが混在

## 2. 移行戦略

### 2.1 基本方針

1. **段階的移行**: 機能ごとに順次移行
2. **既存機能の維持**: 移行中も既存機能は動作させる
3. **テスト駆動**: 各段階でテストを実施 実機のテストで確認する(npx expo run:ios --device)
4. **小さな単位での作業**: 1つの機能を複数のPRに分割

### 2.2 優先順位

優先度を以下の基準で決定：
- **影響範囲**: 他機能との依存関係
- **ユーザー体験**: UXへの影響度
- **実装難易度**: 移行の複雑さ

#### 優先順位（高→低）

1. **location機能** - アプリ全体で使用される基盤機能
2. **layers機能** - 複数の機能から参照される
3. **map機能** - locationと密接に関連
4. **audioPin機能** - 独立性が高い

## 3. 詳細移行計画

### 3.1 Phase 1: location機能の移行（✅ 完了: 2025-07-24）

#### Step 1-1: location-store.tsの作成 ✅
```typescript
// src/features/location/application/location-store.ts
interface LocationState {
  // サーバー状態
  currentLocation: UserLocationData | null;
  
  // UI状態
  isLoading: boolean;
  error: string | null;
  isLocationEnabled: boolean;
  isTracking: boolean;
  
  // 設定（永続化対象）
  settings: {
    locationUpdateInterval: number;
    highAccuracyMode: boolean;
    distanceFilter: number;
    headingUpdateInterval: number; // 追加：方向情報の更新間隔
  };
}
```

#### Step 1-2: カスタムフックの更新 ✅
- useLocation.tsをZustandストアを使用するように修正
- 既存のインターフェースは維持
- 破壊的変更なし

#### Step 1-3: テストの実装 ✅
- 基本的なストアのユニットテストを作成
- location-store.test.tsを実装

#### 追加実装内容:
1. **独立した方向情報更新** ✅
   - watchHeadingAsyncを使用した高頻度の方向更新（100ms）
   - 位置情報（2秒）と方向情報（100ms）の更新頻度を独立

2. **UI改善** ✅
   - 方向表示の扇形実装
   - ネイティブ位置表示の無効化
   - カスタムマーカーで統一

3. **安定性向上** ✅
   - null値の適切な処理
   - 前回値の保持機能
   - チカチカ防止の実装

### 3.2 Phase 2: layers機能の移行（✅ 完了: 2025-07-24）

#### Step 2-1: layers-store.tsの作成 ✅
```typescript
// src/features/layers/application/layers-store.ts
interface LayersState {
  // サーバー状態
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

#### Step 2-2: TanStack Queryの導入 ✅
- useLayersQuery: レイヤー一覧の取得
- useUserLayerPreferencesQuery: ユーザー設定の取得
- useSaveUserLayerPreferencesMutation: ユーザー設定の保存
- useCreateLayerMutation: カスタムレイヤーの作成
- useUpdateLayerMutation: レイヤーの更新
- useDeleteLayerMutation: レイヤーの削除

#### Step 2-3: infrastructure層の実装 ✅
- layers-service.tsの作成
- 将来的なSupabase連携を想定した設計

### 3.3 Phase 3: map機能の移行（✅ 完了: 2025-07-24）

#### Step 3-1: map-store.tsの作成 ✅
```typescript
// src/features/map/application/map-store.ts
interface MapState {
  // UI状態
  region: MapRegion;
  zoomLevel: number;
  isFollowingUser: boolean;
  
  // 設定（永続化対象）
  settings: {
    mapType: 'standard' | 'satellite' | 'hybrid';
    showUserLocation: boolean;
    showCompass: boolean;
    showScale: boolean;
  };
}
```

#### Step 3-2: カスタムフックの更新 ✅
- useMapRegion.tsをZustandストアを使用するように修正
- useMapSettings.ts、useMapFollowing.tsの新規作成
- useMapWithLocation.tsでlocationストアとの連携実装

#### Step 3-3: 追従機能の実装 ✅
- 現在位置ボタンで追従開始
- 地図手動操作で追従停止
- 位置情報更新時の自動アニメーション

#### Step 3-4: テストの実装 ✅
- map-store.test.tsの作成
- TypeScriptエラーの解消

### 3.4 Phase 4: audioPin機能の移行（推定工数: 3-4日）

#### Step 4-1: audioPin-store.tsの作成
```typescript
// src/features/audioPin/application/audioPin-store.ts
interface AudioPinState {
  // サーバー状態
  pins: AudioPin[];
  
  // UI状態
  selectedPin: AudioPin | null;
  isModalVisible: boolean;
  playingPinId: string | null;
  
  // フィルター状態
  filteredPins: AudioPin[];
}
```

#### Step 4-2: TanStack Queryの導入
- useAudioPinsQuery: ピン一覧の取得
- useCreatePinMutation: ピンの作成
- useUpdatePinMutation: ピンの更新

#### Step 4-3: infrastructure層の実装
- audioPin-service.tsの作成
- 音声ファイルのアップロード処理

## 4. 共通作業

### 4.1 開発環境の整備

#### Step 0-1: 依存関係の確認
```bash
# 必要なパッケージがインストールされているか確認
npm list zustand @tanstack/react-query react-native-mmkv
```

#### Step 0-2: 型定義の整備 ✅
- StorageKeys.tsの作成（完了）
- 共通型定義の整理（完了）

### 4.2 テスト環境の構築

#### Step 0-3: テストユーティリティの作成
- Zustandストアのモック
- TanStack Queryのテストラッパー
- MMKV のモック

## 5. 品質保証

### 5.1 各フェーズのチェックリスト

- [ ] StateManagement.mdの規約に準拠
- [ ] 既存機能が正常に動作
- [ ] ユニットテストがパス
- [ ] 統合テストがパス
- [ ] TypeScriptの型エラーなし
- [ ] ESLintエラーなし
- [ ] パフォーマンスの劣化なし

### 5.2 パフォーマンス監視

- 再レンダリング回数の計測
- メモリ使用量の監視
- ストレージ使用量の確認

## 6. リスクと対策

### 6.1 想定されるリスク

1. **既存機能の破壊**
   - 対策: feature flagによる段階的リリース
   
2. **パフォーマンスの劣化**
   - 対策: shallow比較の徹底、セレクターの最適化
   
3. **ストレージ容量の超過**
   - 対策: 永続化データのサイズ制限、定期的なクリーンアップ

### 6.2 ロールバック計画

- 各フェーズごとにgitタグを作成
- 問題発生時は前のバージョンに即座に戻せる体制

## 7. 今後の拡張

### 7.1 将来的な改善案

1. **オフラインファースト対応**
   - TanStack QueryのnetworkMode設定
   - 同期キューの実装

2. **リアルタイム同期**
   - Supabase Realtimeの活用
   - WebSocket連携

3. **状態の正規化**
   - 大規模データの効率的な管理
   - normalizrの導入検討

### 7.2 長期的な目標

- 完全なClean Architecture準拠
- 100%のテストカバレッジ
- E2Eテストの自動化

## 8. スケジュール

### 推定総工数: 10-14日

| フェーズ | 作業内容 | 推定工数 | 実績 | 状態 |
|---------|----------|----------|------|------|
| Phase 0 | 開発環境整備 | 1日 | 0.5日 | ✅ 完了 |
| Phase 1 | location機能 | 2-3日 | 1日 | ✅ 完了 |
| Phase 2 | layers機能 | 2-3日 | 0.5日 | ✅ 完了 |
| Phase 3 | map機能 | 1-2日 | 0.5日 | ✅ 完了 |
| Phase 4 | audioPin機能 | 3-4日 | - | 🔄 次の作業 |
| 最終確認 | 統合テスト・調整 | 1日 | - | ⏳ 待機中 |

## 9. 成功指標

1. **コード品質**
   - TypeScriptの型カバレッジ: 100%
   - テストカバレッジ: 80%以上

2. **パフォーマンス**
   - 初期レンダリング時間: 現状維持
   - メモリ使用量: 10%以内の増加

3. **保守性**
   - コード行数: 20%削減
   - 重複コード: 0%

## 10. 実装済み機能と改善点

### 10.1 location機能の実装で得られた知見

1. **マーカー表示の問題と解決**
   - 問題：カスタムマーカーが移動時に左上にジャンプする
   - 原因：React Native Mapsの既知の問題、position: absoluteの競合
   - 解決：SVG内ですべての描画を完結、position: absoluteを最小限に

2. **パフォーマンス最適化**
   - 位置情報と方向情報の更新頻度を独立
   - shallow比較の活用（zustand v5対応）
   - tracksViewChanges={false}で再レンダリング抑制

3. **ユーザー体験の向上**
   - 方向表示の実装（扇形）
   - null値の適切な処理で安定表示
   - 前回値の保持でチカチカ防止

### 10.2 layers機能の実装で得られた知見

1. **スムーズな移行**
   - 既存のインターフェースを維持したため、破壊的変更なし
   - UIコンポーネントの変更不要

2. **型安全性の向上**
   - persist部分の型を明示的に定義
   - セレクターによる型推論の改善

3. **拡張性の確保**
   - Supabase連携を想定したサービス層の設計
   - TanStack Queryによるサーバー状態管理の準備

### 10.3 map機能の実装で得られた知見

1. **追従機能の実装**
   - 位置情報更新と地図表示の連携
   - ユーザー操作による追従自動停止
   - スムーズなアニメーション実装

2. **設定の永続化**
   - 地図タイプや表示オプションの保存
   - アプリ再起動後も設定が維持される

3. **デバッグ機能**
   - 開発環境での状態表示
   - コンソールログによる動作確認

### 10.4 関連ドキュメント

- [LocationMigrationSummary.md](./LocationMigrationSummary.md) - location機能の移行まとめ
- [HeadingFeatureImplementation.md](./HeadingFeatureImplementation.md) - 方向表示機能の実装詳細
- [IndependentHeadingUpdate.md](./IndependentHeadingUpdate.md) - 独立した方向更新の実装
- [LayersMigrationSummary.md](./LayersMigrationSummary.md) - layers機能の移行まとめ
- [LocationTrackingArchitecture.md](./LocationTrackingArchitecture.md) - 位置情報取得と地図更新のアーキテクチャ
- [CHANGELOG.md](./CHANGELOG.md) - 変更履歴

---

この計画書は、実装を進める中で必要に応じて更新されます。
各フェーズの開始前に、詳細な技術設計書を作成することを推奨します。