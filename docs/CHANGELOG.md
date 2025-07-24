# SoundZone - 変更履歴

## [2025-07-24] Map機能の状態管理移行

### 概要
map機能をStateManagement.mdの規約に基づいて、Zustand + MMKV + TanStack Query（準備）のアーキテクチャに移行しました。

### 追加ファイル
1. **src/features/map/application/map-store.ts**
   - UI状態（region、zoomLevel、isFollowingUser）の管理
   - 設定（mapType、表示オプション）の管理
   - MMKV による設定の永続化

2. **src/features/map/presentation/hooks/useMapSettings.ts**
   - 地図設定（mapType、コンパス、スケール表示）の管理フック

3. **src/features/map/presentation/hooks/useMapFollowing.ts**
   - ユーザー位置追従機能の管理フック

4. **src/features/map/presentation/hooks/useMapWithLocation.ts**
   - locationストアとの連携フック
   - 位置情報更新時の自動追従機能

5. **src/features/map/application/map-store.test.ts**
   - Zustandストアのユニットテスト

### 変更ファイル
1. **src/features/map/presentation/hooks/useMapRegion.ts**
   - 内部実装をZustandストアに変更（インターフェースは維持）

2. **src/features/map/presentation/components/MapContainer.tsx**
   - 地図設定をストアから取得するよう変更
   - ユーザーが地図を操作した際の追従停止機能を追加

3. **src/features/home/presentation/HomeScreen.tsx**
   - useMapWithLocation フックを使用して位置追従機能を統合
   - デバッグ用の追従状態表示を追加（開発環境のみ）

### 新機能
1. **ユーザー位置追従機能**
   - 現在位置ボタンタップで追従開始
   - 地図を手動操作すると追従停止
   - 位置情報更新時に地図が自動的に追従

2. **地図タイプの動的切り替え**
   - standard / satellite / hybrid の切り替えが可能に

3. **設定の永続化**
   - 地図タイプ、表示オプションがアプリ再起動後も保持される

### デバッグ機能（開発環境のみ）
1. **画面表示**
   - 画面右上に「追従: ON/OFF」の状態表示

2. **コンソールログ**
   ```
   [MapStore] 追従モード: ON/OFF
   [MapWithLocation] 現在位置ボタンタップ: { lat, lng }
   [MapWithLocation] 位置更新による地図追従: { lat, lng }
   [MapContainer] 地図手動操作（追従停止）: { lat, lng }
   ```

### テスト方法
1. **追従機能の確認**
   - 現在位置ボタンをタップ → 追従ONになることを確認
   - 地図をドラッグ → 追従OFFになることを確認
   - 再度現在位置ボタンをタップ → 追従ONに戻ることを確認

2. **永続化の確認**
   - アプリを完全終了して再起動
   - 地図設定が保持されていることを確認

### 技術的な改善点
- グローバル状態管理により、コンポーネント間での状態共有が容易に
- 設定の永続化により、ユーザー体験が向上
- locationストアとの適切な連携により、機能間の結合度が低減
- テスタビリティの向上（ユニットテスト実装）

### 次のステップ
- audioPin機能の状態管理移行（Phase 4）
- 統合テストと最終調整

---
