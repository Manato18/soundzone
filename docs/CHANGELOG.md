# SoundZone - 変更履歴

## [Feature] - 2025-01-24 - 🧭 ユーザー方向表示機能の実装

### 地図上でのユーザー方向表示機能追加
ホーム画面の地図上で、ユーザーの現在位置に加えて**向いている方向（heading）**を扇形で表示する機能を実装しました。

#### **🔧 変更ファイル**
- **`/src/features/map/presentation/components/MapContainer.tsx`**: 方向表示機能追加
  - react-native-svgを使用した扇形の方向表示を実装
  - 45度の扇形を半透明青色（#007AFF、opacity: 0.3）で描画
  - headingデータがnullでない場合のみ表示する条件付きレンダリング
  - 現在位置マーカーとz-index制御による重ね順調整

#### **📦 新規依存関係**
- **react-native-svg**: SVGを使用した扇形描画のためのライブラリ追加

#### **🎨 デザインの特徴**
- **視認性**: 半透明で地図コンテンツを隠さない設計
- **一貫性**: 現在位置マーカーと同色（#007AFF）を使用
- **サイズ**: 60x60コンテナで適度な大きさ
- **角度**: 45度扇形で方向を明確に表示

### 技術的実装詳細
- **扇形描画**: SVG Pathを使用した北基準（0度）からの回転
- **方向適用**: headingの値（0-360度）をCSS transform rotateで適用
- **条件分岐**: デバイスが方向情報を提供できない場合の対応
- **実機対応**: シミュレーターではheading取得不可、実機テスト推奨

### 今後の改善案
扇形角度のカスタマイズ、色の設定機能、方向変更時のアニメーション、heading精度の視覚表現を計画中。

---

## [StateManagement] - 2025-01-24 - 🔄 Location機能の状態管理移行

### Location機能のZustand/MMKV移行完了
StateManagement.mdで定義した規約に従い、Location機能の状態管理を従来のReact標準状態からZustand+MMKV構成に移行しました。

#### **📁 新規作成ファイル**
- **`/src/constants/StorageKeys.ts`**: MMKV永続化キーの集約管理
  - 型安全性を確保するための型定義を追加
- **`/src/features/location/application/location-store.ts`**: Zustand状態管理ストア
  - サーバー状態（currentLocation）、UI状態（isLoading, error, isLocationEnabled, isTracking）、設定（永続化対象）の分離管理
  - middleware順序: `devtools → persist → immer → subscribeWithSelector`
  - 設定のみをMMKV永続化、大きなデータは永続化しない設計
- **`/src/features/location/application/__tests__/location-store.test.ts`**: 基本テストケース実装

#### **🔧 更新ファイル**
- **`/src/features/location/presentation/hooks/useLocation.ts`**: 内部実装移行
  - React標準のuseStateからZustandストアへの切り替え
  - 既存インターフェース維持による破壊的変更の回避

#### **📊 状態分類の明確化**
- **UI状態**: ローカル一時的状態（isLoading, error, isLocationEnabled, isTracking）
- **サーバー状態**: API連携予定状態（currentLocation）
- **永続化状態**: アプリ再起動後保持設定（locationUpdateInterval, highAccuracyMode, distanceFilter）

### 技術的改善点
- **破壊的変更なし**: HomeScreen.tsxなど既存コンポーネントは変更不要
- **型安全性**: TypeScript型チェック完全対応
- **lintエラー修正**: 未使用変数削除、インポート整理

### 次のステップ
StateManagementMigrationPlan.mdに従い、次はlayers機能の移行を実施予定。パフォーマンス最適化（shallow比較、セレクター最適化）、機能拡張（位置情報履歴、バックグラウンド追跡）、テスト拡充（統合・E2Eテスト）も計画中。
