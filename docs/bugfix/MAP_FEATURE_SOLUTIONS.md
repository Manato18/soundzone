# Map機能の問題点と解決策

## 2025-07-26 コード調査による問題点の評価

### 実装状況
- ✅ Phase 1: 完了（2025-07-26）
- ✅ Phase 2: 完了（2025-07-26）

### フェーズ分類

#### Phase 1: 即座に修正可能な問題（コードの単純な修正で解決）
- レイヤー選択時のチラつき問題
- 不必要な再レンダリング（useCallbackの適用）

#### Phase 2: パフォーマンス最適化（複雑な修正が必要）
- マーカーのパフォーマンス問題
- useMapWithLocationの最適化不足
- メモリリークの可能性

#### Phase 3: UX改善項目（新機能の追加）
- エラーハンドリングの強化

### 現在確認されている問題

## 1. レイヤー選択時のチラつき問題 【Phase 1】 ✅ 完了

### 問題点
- `useLayerSelection`で`getSelectedLayerIds`が毎回新しい配列を返すため、不要な再レンダリングの可能性
- `useAudioPins`に渡される配列が毎回新しいインスタンスとなる

### 実装した解決策
```typescript
// 現在の実装
const getSelectedLayerIds = useCallback((): string[] => {
  return useLayersStore.getState().selectedLayerIds;
}, []);

// 改善案：メモ化された値を使用
export const useLayerSelection = () => {
  // selectedLayerIdsを直接使用
  const selectedLayerIds = useLayersStore((state) => state.selectedLayerIds);
  
  // getSelectedLayerIdsを削除し、直接selectedLayerIdsを返す
  return {
    // ...
    selectedLayerIds, // 直接返す
    // ...
  };
};
```

## 2. 不必要な再レンダリング 【Phase 1】 ✅ 完了

### 問題点
- MapContainer内で`handleRegionChange`が毎回新しい関数として作成
- 子コンポーネントへの不要な再レンダリング伝播

### 実装した解決策
```typescript
// MapContainerの最適化
const handleRegionChange = useCallback((newRegion: MapRegion) => {
  stopFollowing();
  onRegionChange(newRegion);
  
  if (__DEV__) {
    console.log(`[MapContainer] 地図手動操作（追従停止）:`, {
      lat: newRegion.latitude.toFixed(6),
      lng: newRegion.longitude.toFixed(6),
    });
  }
}, [stopFollowing, onRegionChange]);
```

## 3. メモリリークとパフォーマンス問題 【Phase 2】 ✅ 完了

### 問題点

#### 3.1 マーカーのパフォーマンス問題 【Phase 2】 ✅ 完了
- 現在位置マーカーが大きなSVG（60x60）を使用
- 位置更新のたびに複雑なSVGパスの再計算
- heading（方向）のnull値処理が頻繁

#### 3.2 useMapWithLocationの最適化不足 【Phase 2】 ✅ 完了
- 依存配列が多く、頻繁な再生成の可能性
- `region`オブジェクトが毎回新しく作成される可能性

### 実装した解決策

#### マーカーの最適化
- **UserLocationMarker.tsx**を新規作成
- マーカーサイズを60から40に縮小
- React.memoでメモ化し、カスタム比較関数で最適化
- 位置・方向・精度が変わった場合のみ再レンダリング
- SVG計算を動的に変更しパフォーマンス向上

#### useMapWithLocationの最適化
- 依存配列を最小化
- `updateMapRegion`関数をuseCallbackでメモ化
- `regionRef`を使用してregionオブジェクトの再生成を防止
- `centerOnUserLocation`関数もメモ化
- 戻り値をuseMemoでメモ化

## 4. UX改善項目 【Phase 3】

### 4.2 エラーハンドリングの強化 【Phase 3】
- 位置情報エラーの詳細表示
- ネットワークエラー時のフォールバック

## 実装優先順位（フェーズ別）

### Phase 1: 即座に修正可能な問題 ✅ 完了（2025-07-26）
1. **レイヤー選択時のチラつき解消**
   - ✅ getSelectedLayerIdsを削除
   - ✅ HomeScreen.tsxでselectedLayerIdsを直接使用
   - ✅ useAudioPinsへの不要な配列の再生成を防止

2. **不必要な再レンダリングの防止**
   - ✅ MapContainerのhandleRegionChangeにuseCallbackを適用
   - ✅ 依存配列に[stopFollowing, onRegionChange]を設定

### Phase 2: パフォーマンス最適化 ✅ 完了（2025-07-26）
3. **マーカーのパフォーマンス改善**
   - ✅ UserLocationMarker.tsxを新規作成
   - ✅ マーカーサイズを60→40に縮小
   - ✅ React.memoとカスタム比較関数で最適化

4. **useMapWithLocationの最適化**
   - ✅ 依存配列を最小化
   - ✅ updateMapRegion関数をメモ化
   - ✅ regionRefでregionオブジェクトの再生成を防止
