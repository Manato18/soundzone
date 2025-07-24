# SoundZone - 変更履歴

## [2025-07-24] audioPin機能の状態管理移行

### 概要
audioPin機能をReact標準のuseStateからZustand + TanStack Queryベースの状態管理に移行しました。StateManagement.mdの規約に基づいた実装です。

### 追加ファイル
1. **src/features/audioPin/application/audioPin-store.ts**
   - UI状態（selectedPin、isModalVisible、playbackState）の管理
   - 再生管理機能（play/pause/stop、シーク、音量）
   - 設定の永続化（autoPlay、playbackSpeed、volume）

2. **src/features/audioPin/infrastructure/audioPin-service.ts**
   - モックAPIサービス層
   - CRUD操作（create、read、update、delete）
   - 将来的なSupabase連携を想定した設計

3. **読み取り操作フック（read/）**
   - `useAudioPinsQuery.ts`: ピン一覧取得（レイヤー・範囲フィルタリング対応）
   - `useAudioPinQuery.ts`: 単一ピン詳細取得

4. **書き込み操作フック（write/）**
   - `useCreateAudioPinMutation.ts`: ピン作成
   - `useUpdateAudioPinMutation.ts`: ピン更新
   - `useDeleteAudioPinMutation.ts`: ピン削除

### 変更ファイル
1. **src/features/audioPin/presentation/hooks/useAudioPins.ts**
   - Zustandストアとクエリフックを使用するように完全書き換え
   - レイヤーフィルタリングをクエリレベルで実行

2. **src/features/home/presentation/HomeScreen.tsx**
   - `useAudioPinFiltering`の削除
   - レイヤーIDを直接`useAudioPins`に渡すように変更

3. **src/constants/StorageKeys.ts**
   - AUDIO_PIN関連のキーを追加

### バグ修正
1. **無限ループエラーの修正**
   - 問題: セレクターフックが毎回新しいオブジェクトを作成
   - 解決: 各プロパティを個別に取得してからオブジェクトを構築
   - 影響: `audioPin-store.ts`と`location-store.ts`の両方で修正

### 新機能
1. **音声再生管理**
   - 再生/一時停止/停止の状態管理
   - シーク機能
   - 音量調整（0-1の範囲で正規化）
   - 再生速度の設定

2. **設定の永続化**
   - 自動再生のON/OFF
   - 再生速度の保存
   - 音量設定の保存
   - ピン詳細表示設定

3. **クエリレベルのフィルタリング**
   - レイヤーIDによるフィルタリング
   - 地図の表示範囲によるフィルタリング（bounds）

### 技術的な改善点
- Clean Architectureに準拠した4層構造
- サーバー状態とUI状態の明確な分離
- 型安全性の向上
- キャッシュ管理の最適化（staleTime: 5分、gcTime: 15分）
- 楽観的更新の準備

### 削除予定
- `useAudioPinFiltering.ts`: クエリレベルでのフィルタリングに置き換え

### 次のステップ
- 音声ファイルアップロード機能の実装
- Supabaseとの実際の連携
- リアルタイム同期機能の追加
- オフライン対応
