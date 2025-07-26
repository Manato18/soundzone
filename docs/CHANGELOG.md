# SoundZone - 変更履歴

## 2025-07-26

### Map機能のパフォーマンス改善（Phase 1）

1. **レイヤー選択時のチラつき問題の解決**
   - `useLayerSelection.ts`から`getSelectedLayerIds`関数を削除
   - `HomeScreen.tsx`で`selectedLayerIds`を直接使用
   - `useAudioPins`への不要な配列の再生成を防止
   - 影響範囲: useLayerSelection.ts, HomeScreen.tsx

2. **不必要な再レンダリングの防止**
   - `MapContainer.tsx`の`handleRegionChange`関数に`useCallback`を適用
   - 依存配列に`[stopFollowing, onRegionChange]`を設定
   - 地図操作時のパフォーマンスを改善
   - 影響範囲: MapContainer.tsx

#### 技術的詳細
- Zustandの`useShallow`による最適化を維持
- React.useCallbackによるメモ化でコンポーネントの再レンダリングを最小化
- StateManagement.mdのセレクターパターンに準拠した実装

### 位置情報機能の改善実装

1. **録音画面への位置情報表示機能**
   - RecordingScreen.tsxにリアルタイムの位置情報表示を追加
   - 緯度・経度・高度・精度を表示
   - 位置情報が取得できない場合は何も表示しない仕様

2. **位置情報バリデーション機能**
   - `/src/features/location/utils/validation.ts`を新規作成
   - `isValidCoordinates`: 座標値の妥当性チェック（0,0除外、範囲チェック）
   - `isValidLocation`: 位置情報オブジェクト全体の検証
   - `isAcceptableAccuracy`: 精度の許容範囲チェック
   - `calculateDistance`: 2点間の距離計算機能

3. **位置情報取得のリトライ機能**
   - `getCurrentLocation`メソッドに最大3回のリトライロジックを実装
   - GPS信号が弱い場合の自動再試行（ネットワークは考慮しない）
   - 段階的な待機時間（1秒、2秒、3秒）で再試行

4. **地図追従のスムーズ化（バランス重視設定）**
   - 位置情報更新間隔を最適化してカクカクした動きを改善
   - `locationUpdateInterval`: 2秒 → 1秒
   - `distanceFilter`: 5m → 2m
   - `stableLocationThreshold`: 10m → 3m
   - 地図アニメーション時間: 1秒 → 0.5秒
   - 歩行時により自然でスムーズな地図追従を実現

#### 技術的詳細
- 既存の権限処理機能を活用（追加実装なし）
- バリデーション処理により無効な位置情報（0,0や範囲外）を適切にフィルタリング
- シンプルな実装方針で、複雑な機能は除外
- 音声ピンの再取得は発生しない（TanStack Queryの5分キャッシュにより保護）