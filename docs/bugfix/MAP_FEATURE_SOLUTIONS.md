# Map機能の問題点と解決策

## 2025-07-26 コード調査による問題点の評価

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

## 1. レイヤー選択時のチラつき問題 【Phase 1】

### 問題点
- `useLayerSelection`で`getSelectedLayerIds`が毎回新しい配列を返すため、不要な再レンダリングの可能性
- `useAudioPins`に渡される配列が毎回新しいインスタンスとなる

### 解決策
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

## 2. 不必要な再レンダリング 【Phase 1】

### 問題点
- MapContainer内で`handleRegionChange`が毎回新しい関数として作成
- 子コンポーネントへの不要な再レンダリング伝播

### 解決策
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

## 2. メモリリークとパフォーマンス問題 【Phase 2】

### 問題点

#### 2.1 マーカーのパフォーマンス問題 【Phase 2】
- 現在位置マーカーが大きなSVG（60x60）を使用
- 位置更新のたびに複雑なSVGパスの再計算
- heading（方向）のnull値処理が頻繁

#### 2.2 useMapWithLocationの最適化不足 【Phase 2】
- 依存配列が多く、頻繁な再生成の可能性
- `region`オブジェクトが毎回新しく作成される可能性

### 解決策

#### マーカーの最適化
```typescript
// マーカーのサイズを縮小し、メモ化
const UserLocationMarker = React.memo(({ location }) => {
  const markerSize = 40; // 60から40に縮小
  
  return (
    <Marker
      coordinate={location}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* より軽量なマーカー実装 */}
      <View style={styles.markerContainer}>
        {/* SVGを簡略化するか、Imageコンポーネントを使用 */}
      </View>
    </Marker>
  );
});
```

#### useMapWithLocationの最適化
```typescript
// useMapWithLocationの最適化
const regionRef = useRef(region);
regionRef.current = region;

// useCallbackで関数をメモ化
const updateMapRegion = useCallback((newLocation) => {
  const newRegion = {
    latitude: newLocation.coords.latitude,
    longitude: newLocation.coords.longitude,
    latitudeDelta: regionRef.current.latitudeDelta,
    longitudeDelta: regionRef.current.longitudeDelta,
  };
  // ...
}, []); // 依存配列を最小化
```

## 4. UX改善項目 【Phase 3】

### 4.2 エラーハンドリングの強化 【Phase 3】
- 位置情報エラーの詳細表示
- ネットワークエラー時のフォールバック

## 実装優先順位（フェーズ別）

### Phase 1: 即座に修正可能な問題（1-2日で完了可能）
1. **レイヤー選択時のチラつき解消**
   - getSelectedLayerIdsの廃止
   - 直接selectedLayerIdsを使用
   - 影響範囲: useLayerSelection.ts, MapScreen.tsx

2. **不必要な再レンダリングの防止**
   - MapContainer内のhandleRegionChangeへのuseCallback適用
   - React.memoの活用
   - 影響範囲: MapContainer.tsx

### Phase 2: パフォーマンス最適化（3-5日必要）
3. **マーカーのパフォーマンス改善**
   - マーカーのサイズ縮小（60→40）
   - SVGの簡略化または画像への置き換え
   - 影響範囲: UserLocationMarker.tsx

4. **useMapWithLocationの最適化**
   - 依存配列の最小化
   - regionオブジェクトのメモ化
   - 影響範囲: useMapWithLocation.ts

### Phase 3: UX改善項目（優先度低、時間があれば実装）
5. **エラーハンドリングの強化**
   - より詳細なエラー情報の表示
   - ネットワークエラー時のフォールバック
