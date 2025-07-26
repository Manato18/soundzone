# SoundZone - 変更履歴
  
  Phase 1: LocationProvider実装

  1. LocationContextの作成
    - 位置情報取得ロジックの一元化
    - 権限管理の統合
    - エラーハンドリングの一元化
  2. LocationProviderの実装
    - useLocation.tsのロジックを移行
    - stableLocationの管理を追加
    - headingの安定した更新処理

  Phase 2: 既存コードの移行

  3. useLocationContext hookの作成
    - 既存のuseLocationインターフェースを維持
    - 内部でContextを使用
  4. 画面での使用箇所の更新
    - Map画面の位置情報取得を統合
    - Recording画面の位置情報記録を統合

  Phase 3: 機能拡張

  5. stableLocation管理の完全実装
  6. バックグラウンド位置追跡の検討

  Phase 1の実装内容の変更点:
  - ✅ 予定通り実装: LocationContext、LocationProvi
  der、stableLocation管理
  - ✅ 前倒し実装: useLocationContext
  hook（当初Phase 2予定）
  - ✅ 追加実装: locationStateManagerサービス（イン
  フラストラクチャ層）

  Phase 2-3の調整が必要な点:
  - stableLocation管理は既にPhase 1で実装済み
  - より具体的な実装タスクへの細分化が必要

  修正後のPhase構成と詳細計画

  
  Phase 2: 既存コードの移行と統合

  2.1 useLocationの廃止準備

  - 2.1.1 useLocationの使用箇所を特定
  - 2.1.2
  useLocationをuseLocationContextのラッパーに変更
  - 2.1.3 既存インターフェースの互換性確認

  2.2 App.tsxへのLocationProvider統合

  - 2.2.1
  AuthProviderと同レベルでLocationProviderを配置
  - 2.2.2 プロバイダーの順序確認（依存関係の整理）

  2.3 Map画面の統合

  - 2.3.1 Map画面でのuseLocation使用箇所の特定
  - 2.3.2 stableLocationを使用した地図中心点管理
  - 2.3.3 現在位置ボタンの動作確認

  2.4 Recording画面の統合

  - 2.4.1 Recording画面での位置情報取得ロジック確認
  - 2.4.2 録音時の位置情報記録処理の統合
  - 2.4.3 位置情報の精度管理


現状分析結果

  Location機能のコードレビューを実施しました。以下
  の問題点と改善点を特定しました：

  1. StateManagement.md準拠の問題

  - ✅ Zustand middlewareの順序は正しい（devtools →
   persist → immer）
  - ✅ 永続化対象も適切（settingsのみ）
  - ✅ セレクターパターンも実装済み

  2. 一元管理実装の問題点

  LocationProvider.tsx（46-55行目）
  - Context値として仮の値（null/false）を返している
  - 実際の状態がProviderレベルで取得されていない

  3. パフォーマンスの懸念

  - headingの更新頻度が高い（100ms）ため、不要な再
  レンダリングの可能性
  - useLocationUIStateがshallow比較を使用していない

  4. エラーハンドリング

  - AlertがlocationStateManager内で直接呼ばれている
  （UIとロジックの分離不足）


Phase 3 実装計画（修正版）

  Phase 3-1: Provider修正とパフォーマンス最適化

  3.1.1 LocationProviderの修正
  - Context値で実際のストア状態を返すように修正
  - useStoreフックをProvider内で使用

  3.1.2 shallow比較の追加
  - useLocationUIStateにshallow比較を実装
  - 再レンダリング最小化

  3.1.3 heading更新の最適化
  - デバウンス/スロットリングの検討
  - 更新頻度の調整

  Phase 3-2: 動作確認とテスト

  3.2.1 基本動作確認
  - 位置情報の初回取得
  - stableLocation更新閾値（10m）の動作
  - 現在位置ボタンの動作

  3.2.2 エッジケース確認
  - 権限拒否時の動作
  - 位置情報サービス無効時
  - アプリバックグラウンド復帰時

  3.2.3 パフォーマンス計測
  - 再レンダリング回数の確認
  - メモリ使用量の監視
  - バッテリー消費の評価

  Phase 3-3: エラーハンドリング改善

  3.3.1 Alertの分離
  - locationStateManagerからUIアラートを削除
  - エラーコールバックの実装
  - Presentation層でのアラート表示

  3.3.2 エラー状態の拡充
  - エラーコードの詳細化
  - リトライ機能の追加
  - エラー表示UIの改善

  Phase 3-4: 追加最適化（オプション）

  3.4.1 設定の動的変更
  - 精度モードの切り替えUI
  - 更新間隔の調整機能

  3.4.2 デバッグ機能
  - 位置情報ログの表示
  - モック位置情報モード