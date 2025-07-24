# Location機能の状態管理移行まとめ

## 実施日時
2025-07-24

## 実施内容

### 1. 新規作成ファイル

#### `/src/constants/StorageKeys.ts`
- MMKV永続化で使用するキーを集約管理
- 型安全性を確保するための型定義を追加

#### `/src/features/location/application/location-store.ts`
- Zustandを使用した状態管理ストアを実装
- StateManagement.mdの規約に準拠
- 以下の状態を管理：
  - **サーバー状態**: currentLocation
  - **UI状態**: isLoading, error, isLocationEnabled, isTracking
  - **設定（永続化対象）**: locationUpdateInterval, highAccuracyMode, distanceFilter
- MMKV永続化を設定に対してのみ適用
- 各種セレクターフックをエクスポート

#### `/src/features/location/application/__tests__/location-store.test.ts`
- location-storeの基本的なテストケースを実装

### 2. 更新ファイル

#### `/src/features/location/presentation/hooks/useLocation.ts`
- 既存のインターフェースを維持しながら内部実装をZustandストアに移行
- React標準のuseStateからZustandストアへの切り替え
- 破壊的変更なし（既存コンポーネントへの影響なし）

### 3. 実装のポイント

#### 状態の分類
- **UI状態**: ローカルでのみ使用される一時的な状態
- **サーバー状態**: 将来的にAPIと連携する可能性のある状態
- **永続化状態**: アプリ再起動後も保持すべき設定

#### middleware順序
```typescript
devtools → persist → immer → subscribeWithSelector
```

#### 永続化設定
- `partialize`を使用して設定のみを永続化
- 大きなデータ（位置情報履歴など）は永続化しない

### 4. 既存機能への影響

- HomeScreen.tsxなど、useLocationを使用している既存コンポーネントは変更不要
- インターフェースを維持したため、破壊的変更なし

### 5. 型安全性

- TypeScriptの型チェックをパス
- lintエラーを修正（未使用変数の削除、インポートの整理）

### 6. 今後の改善点

#### パフォーマンス最適化
- shallow比較の適切な実装（zustand v5対応）
- セレクターの最適化

#### 機能拡張
- 位置情報履歴の管理
- バックグラウンドでの位置情報追跡
- 位置情報の精度設定UI

#### テスト拡充
- 統合テストの追加
- E2Eテストの実装

## 次のステップ

StateManagementMigrationPlan.mdに従い、次はlayers機能の移行を実施予定。

### 参考

- [StateManagement.md](/docs/StateManagement.md)
- [StateManagementMigrationPlan.md](/docs/StateManagementMigrationPlan.md)