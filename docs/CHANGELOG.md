# SoundZone - 変更履歴

## [2025-07-25] 一元管理アーキテクチャガイドの作成

### 概要
SoundZoneアプリの状態管理方針を明確化するため、一元管理アーキテクチャに関する包括的なドキュメントを作成しました。

### 作成したドキュメント
- **`/docs/architecture/CENTRALIZED_STATE_MANAGEMENT.md`**
  - 一元管理vs個別管理の判断基準
  - 各機能（Auth, Location, AudioPin, Map等）の分析
  - メリット・デメリットの詳細な比較
  - 実装パターンとベストプラクティス
  - 今後の推奨優先順位

### 主要な決定事項
1. **レイヤー機能**: LayersProviderによる一元管理を継続
2. **Auth機能**: AuthProvider実装を推奨（次期実装）
3. **Location機能**: LocationProvider実装を推奨
4. **AudioPin機能**: 部分的な一元管理を推奨
5. **Map機能**: 個別管理を維持

## [2025-07-25] レイヤー選択状態の永続化修正

### 概要
レイヤーの選択状態がアプリ再起動時に保持されない問題を修正しました。永続化されたデータが初期化処理によって上書きされていた問題を解決しました。

### 問題の詳細
- **症状**: アプリを終了して再起動すると、レイヤーは全て選択された状態に戻る
- **原因**: `initializeSelectedLayers`が毎回実行され、永続化データを無視していた

### 修正内容

#### 1. layers-store.tsの修正
- `initializeSelectedLayers`メソッドを修正
- 既にselectedLayerIdsが存在する場合（永続化データから復元）はスキップ
- デバッグログを追加して動作を確認可能に

#### 2. LayersProvider.tsxの修正  
- `useRef`を使用して初期化を一度だけ実行
- 永続化データがある場合は初期化をスキップ
- 開発環境でのデバッグログを改善

### 技術的な詳細
```typescript
// 修正前: 毎回全レイヤーを選択してしまう
initializeSelectedLayers: () => set((state) => {
  if (state.settings.showAllByDefault) {
    state.selectedLayerIds = state.availableLayers.map(layer => layer.id);
  }
})

// 修正後: 永続化データがある場合はスキップ
initializeSelectedLayers: () => set((state) => {
  if (state.selectedLayerIds.length > 0) {
    return; // 永続化データを保持
  }
  // 初回のみ初期化
})
```

### 検証方法
1. 特定のレイヤーを選択/解除
2. アプリを完全に終了
3. アプリを再起動
4. 選択状態が保持されていることを確認

### 今後の方針
レイヤー機能は**一元管理**を継続することに決定しました。理由：
- レイヤー作成は専用画面で行い、他の画面では登録済みレイヤーのみを使用
- 全画面で同じレイヤーリストを参照するため一元管理が最適
- 将来的な拡張時は、必要に応じてキャッシュ戦略を調整（staleTimeの変更等）

## [2025-07-25] レイヤー機能のパフォーマンス最適化（Phase 2）

### 概要
LAYER_ISSUES_SOLUTION.mdのPhase 2を完了し、レイヤー機能のパフォーマンスを大幅に改善しました。重複API呼び出しの防止、不要な再レンダリングの削減、楽観的更新の実装により、ユーザー体験が向上しました。

### 主要な実装内容

#### 1. LayersProviderによる一元管理
**新規作成ファイル:**
- `/src/features/layers/presentation/providers/LayersProvider.tsx`
  - アプリケーションレベルでレイヤーデータを一元管理
  - React Queryのキャッシュを最大限活用（staleTime: Infinity）
  - エラーハンドリングとリトライロジック実装

**修正ファイル:**
- `/App.tsx`
  - QueryClientProviderの直下にLayersProviderを配置
  - アプリ全体でレイヤーデータを共有

#### 2. useLayerSelectionフックの最適化
**修正ファイル:**
- `/src/features/layers/presentation/hooks/useLayerSelection.ts`
  - Zustand shallowセレクターで必要な状態のみ購読
  - useCallbackで全ての関数をメモ化
  - 新たにselectedLayersとsetSelectedLayersを追加
  - アクションと状態を分離して再レンダリングを最小化

#### 3. 楽観的更新の実装
**修正ファイル:**
- `/src/features/layers/presentation/hooks/use-layers-query.ts`
  - useCreateLayerMutation: onMutateで楽観的更新
  - useUpdateLayerMutation: 即座に画面反映
  - useDeleteLayerMutation: 削除時の選択状態も同期
  - エラー時の自動ロールバック実装

### 技術的な改善点
- **パフォーマンス**: 重複API呼び出しを完全に排除
- **レスポンス性**: 楽観的更新により即座に操作が反映
- **安定性**: エラー時の自動ロールバック機能
- **保守性**: StateManagement.mdに準拠した一貫性のある実装

### 実装アプローチ
StateManagement.mdの設計原則に従い、以下の方針で実装:
- Single Source of Truth: LayersProviderで一元管理
- レイヤー責務の明確化: Infrastructure/Application/Presentationの分離
- React Query標準機能の活用: キャッシュ戦略と楽観的更新

## [2025-07-25] メモリリーク調査・修正

### 概要
AudioPin、Map、Location、Layer機能のメモリリーク調査を実施し、発見された問題を修正しました。また、将来的なメモリリーク防止のためのガイドラインとサンプル実装を作成しました。

### 調査結果と対応

#### 1. AudioPin機能 ✅
- **結果**: メモリリークなし
- **詳細**: EventListenerが適切にクリーンアップされている

#### 2. Map機能 ❌ → ✅
- **問題**: `useMapWithLocation`の`previousLocationRef`が未クリーンアップ
- **修正**: useEffectのクリーンアップ関数でnullをセット
- **修正ファイル**: `/src/features/map/presentation/hooks/useMapWithLocation.ts`

#### 3. Location機能 ✅
- **結果**: メモリリークなし
- **詳細**: subscriptionが適切にクリーンアップされている

#### 4. Layer機能 ✅
- **結果**: 現在subscribeを使用していない（問題なし）
- **対策**: 予防的なガイドラインとサンプルを作成

### 作成したドキュメント

1. **`/docs/ZustandSubscribeGuideline.md`**
   - Zustand subscribeのメモリリーク防止ガイドライン
   - 正しい実装方法とよくある間違い

2. **`/docs/MemoryLeakFixReport.md`**
   - 今回の調査・修正の詳細レポート
   - 推奨事項と今後の対策

### 作成したサンプル実装

1. **`/src/features/layers/presentation/hooks/useLayerSubscriptionExample.ts`**
   - Zustand subscribeの正しい使用例
   - 3つの実装パターン（基本、条件付き、最適化）

### 技術的な改善点
- メモリリークの完全な防止
- 将来的な実装での問題防止
- コードレビューでの確認ポイントの明確化

### 次のステップ
残っている高優先度の問題：
1. 位置情報の状態不整合（stableLocation、heading）
2. エラーハンドリング不足（権限拒否、APIリトライ）

## [2025-07-25] レイヤー切替時のピン表示最適化（Phase 2）

### 概要
AUDIOPIN_ISSUES_AND_SOLUTIONS.mdのPhase 2を完了し、レイヤー切替時のピン消失問題を解決しました。クライアントサイドフィルタリング方式を採用し、UXを大幅に改善しました。

### 主要な実装内容

#### 1. クライアントサイドフィルタリングの実装
**修正ファイル:**
- `src/features/audioPin/presentation/hooks/read/useAudioPinsQuery.ts`
  - queryKeyからlayerIdsを削除
  - 常に全てのピンを取得するように変更
  - APIリクエストの削減

**新規作成ファイル:**
- `src/features/audioPin/presentation/hooks/read/useFilteredAudioPins.ts`
  - クライアントサイドでレイヤーフィルタリングを実装
  - useMemoを使用した効率的なフィルタリング
  - デバッグログの追加

- `src/features/audioPin/presentation/hooks/index.ts`
  - フックのエクスポートを集約

**修正ファイル:**
- `src/features/audioPin/presentation/hooks/useAudioPins.ts`
  - useAudioPinsQueryからuseFilteredAudioPinsに変更
  - 既存のインターフェースを維持

#### 2. 追加修正
- `components/AudioPlayerModal.tsx`
  - panResponder内でのcloseModal参照エラーを修正
  - 循環参照を回避

### 技術的な改善点
- **レイヤー切替時のちらつき解消**: 即座に反映される
- **パフォーマンス向上**: キャッシュの効率的な活用
- **APIリクエスト削減**: レイヤー変更時の不要なリクエストを排除
- **ユーザー体験の向上**: スムーズなレイヤー切替

### 実装アプローチ
クライアントサイドフィルタリングを選択した理由：
- UXの最適化（即座の反映）
- ネットワークリクエストの削減
- 将来的なオフライン対応の容易さ
- リアルタイム更新の実装が簡単

### 次のステップ
Phase 3については実装状況を精査した結果、既に主要な問題が解決されているため追加実装は不要と判断しました。詳細はAUDIOPIN_ISSUES_AND_SOLUTIONS.mdを参照してください。

## [2025-07-25] AudioPin音声再生機能の改善（Phase 1）

### 概要
AUDIOPIN_ISSUES_AND_SOLUTIONS.mdのPhase 1を完了し、音声再生のメモリリーク問題を解決しました。さらにStateManagement.mdの設計原則に従ったリファクタリングを実施しました。

### 主要な実装内容

#### 1. メモリリーク対策
**修正ファイル:**
- `components/AudioPlayerModal.tsx`
  - コンポーネントアンマウント時のクリーンアップ処理追加
  - closeModal関数での音声停止実装
  - バックグラウンド時の音声一時停止

#### 2. StateManagement.md準拠のリファクタリング
**新規作成ファイル:**
- `src/features/audioPin/infrastructure/services/AudioService.ts`
  - Infrastructure層としてTrackPlayerの操作を抽象化
  - シングルトンパターンで実装
  - エラーハンドリングの強化

- `src/features/audioPin/presentation/hooks/useAudioPlayer.ts`
  - Presentation層のカスタムフック
  - Infrastructure層とApplication層を統合
  - TrackPlayerイベントとZustandストアの同期

**修正ファイル:**
- `components/AudioPlayerModal.tsx`
  - TrackPlayerの直接操作を削除
  - useAudioPlayerフックを使用するように変更
  - レイヤー責務に従った実装

#### 3. 実機検証で発見された問題の修正
**追加修正:**
1. **モーダルスワイプ時の音声停止**
   - 問題: スワイプでモーダルを閉じても音声が停止しない
   - 修正: performTransitionでCLOSED時にcloseModal()を呼ぶように変更

2. **バックグラウンドからの再生位置保持**
   - 問題: バックグラウンドから復帰時に最初から再生される
   - 修正: AudioServiceにcurrentTrackIdを追加し、同じトラックの場合はリセットしない

3. **ログアウト時のエラー対策**
   - 問題: TrackPlayer未初期化時のエラー
   - 修正: 各メソッドに初期化チェックを追加

### 技術的な改善点
- メモリリークの完全な防止
- レイヤー責務の明確化による保守性向上
- 状態管理の一元化
- エラーハンドリングの強化
- ユーザー体験の向上（再生位置の保持）

### パッケージ依存
- `react-native-track-player`: 音声再生機能（既存）

### 次のステップ
Phase 2では、レイヤー切替時のピン消失問題の解決に取り組む予定です。
