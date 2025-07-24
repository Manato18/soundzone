# 独立した方向情報更新機能の実装

## 実装日時
2025-07-24

## 概要
位置情報と方向情報の更新頻度を独立して制御できるように実装を改善しました。

## 実装内容

### 1. 設定の追加
`location-store.ts`に新しい設定項目を追加：
```typescript
settings: {
  locationUpdateInterval: 2000,     // 位置情報: 2秒ごと
  distanceFilter: 5,                // 位置情報: 5m移動時
  headingUpdateInterval: 100,       // 方向情報: 100msごと（新規追加）
  highAccuracyMode: true
}
```

### 2. 独立した監視機能
`useLocation.ts`で2つの独立した監視を実装：

#### 位置情報の監視
```typescript
Location.watchPositionAsync({
  timeInterval: 2000,      // 2秒ごと
  distanceInterval: 5      // 5m移動時
})
```

#### 方向情報の監視
```typescript
Location.watchHeadingAsync(
  (headingData) => {
    // 100msごとに方向を更新
  }
)
```

### 3. 新しいアクション
`updateHeading`アクションを追加し、方向情報のみを更新可能に：
```typescript
updateHeading: (heading) => set((state) => {
  if (state.currentLocation) {
    state.currentLocation.coords.heading = heading;
  }
})
```

## メリット

### パフォーマンスの最適化
- 位置情報: バッテリー消費を抑えるため2秒ごと
- 方向情報: 滑らかな表示のため100msごと

### ユーザー体験の向上
- 方向転換時の表示が10倍滑らかに（2秒→0.1秒）
- 位置情報の更新頻度は維持してバッテリー消費を抑制

## 設定のカスタマイズ

ユーザーは以下のように更新頻度を調整できます：

```typescript
// 方向情報をさらに高頻度に（50msごと）
updateLocationSettings({
  headingUpdateInterval: 50
});

// 位置情報の更新も高頻度に（1秒ごと）
updateLocationSettings({
  locationUpdateInterval: 1000
});
```

## 技術的な詳細

### watchHeadingAsync の仕様
- `trueHeading`: GPS位置情報を使用した真北方向（推奨）
- `magHeading`: 磁気センサーによる磁北方向
- `accuracy`: 方向の精度（0-3、3が最高精度）

### 実装の工夫
1. `trueHeading`が-1の場合は`magHeading`にフォールバック
2. 両方の監視を独立して管理（別々のsubscription）
3. クリーンアップ時は両方の監視を適切に停止

## 注意事項

- 方向情報の高頻度更新はバッテリー消費が増加する可能性があります
- シミュレーターでは方向情報が取得できない場合があります
- 実機でのテストを推奨します

## 今後の改善案

1. **適応的更新頻度**: ユーザーの移動速度に応じて更新頻度を自動調整
2. **精度表示**: 方向の精度を視覚的に表現（扇形の透明度など）
3. **設定UI**: アプリ内で更新頻度を調整できるUI
4. **バッテリー最適化**: 静止時は更新頻度を自動的に下げる