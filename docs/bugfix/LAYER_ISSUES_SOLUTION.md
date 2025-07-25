# レイヤー機能の問題と解決策

## 問題の概要とPhase分け

レイヤー機能には以下の問題があり、優先度と依存関係を考慮して3つのPhaseに分けて対応します：

### Phase 1: メモリリークの修正（緊急度：高）✅ [2025-07-25 完了]
- **問題**: Zustand subscribeのクリーンアップ不足によるメモリリーク
- **影響**: アプリの長時間使用でメモリ使用量が増加、パフォーマンス低下
- **期間**: 1-2日

### Phase 2: パフォーマンス最適化（緊急度：中）
- **問題**: 重複API呼び出し、不要な再レンダリング、楽観的更新の競合
- **影響**: レスポンスの遅延、無駄なネットワーク使用
- **期間**: 3-4日

### Phase 3: 既に解決済みの問題（完了）
- ✅ レイヤー切替時のピン消失問題
- ✅ 音声再生制御問題（AudioPin）

---

## Phase 1: メモリリーク問題の解決

### 問題の詳細
useEffect内でのZustand subscribeにクリーンアップ関数がなく、コンポーネントのアンマウント時にリスナーが残る。これによりメモリリークが発生し、アプリのパフォーマンスが徐々に低下する。

### 影響箇所
- `src/features/layers/presentation/hooks/useLayerSelection.ts`
- その他Zustand subscribeを使用している全てのカスタムフック

### 実装した解決策 ✅ [2025-07-25]

#### 1. 現状の調査結果
- 現在のコードベースではZustand subscribeメソッドを直接使用している箇所は見つからなかった
- しかし、将来的な実装で問題が発生することを防ぐため、予防的な対策を実施

#### 2. 実装した内容
1. **ガイドラインドキュメントの作成** ✅
   - `/docs/ZustandSubscribeGuideline.md`を作成
   - メモリリークの原因と正しい実装方法を記載
   - よくある間違いとベストプラクティスを明記

2. **サンプル実装の作成** ✅
   - `/src/features/layers/presentation/hooks/useLayerSubscriptionExample.ts`を作成
   - 正しいクリーンアップ方法を示す3つのパターンを実装
   - StateManagement.mdに準拠した実装例

#### 3. 既存コードの確認
- useLayerSelectionフックは通常のセレクターフックのみを使用（問題なし）
- 他のレイヤー関連フックもsubscribeを使用していない（問題なし）

### 今後の実装での注意点

1. **subscribeを使用する前に検討**
   - 通常のセレクターフック `useStore((state) => state.value)` で十分か確認
   - subscribeは副作用の実行が必要な場合のみ使用

2. **必ずクリーンアップを実装**
   ```typescript
   useEffect(() => {
     const unsubscribe = store.subscribe(selector, callback);
     return () => unsubscribe();
   }, []);
   ```

3. **ガイドラインに従う**
   - `/docs/ZustandSubscribeGuideline.md` を参照
   - `/src/features/layers/presentation/hooks/useLayerSubscriptionExample.ts` のパターンを参考に

### 正しい実装例（将来subscribeが必要になった場合）
```typescript
// src/features/layers/presentation/hooks/useLayerSelection.ts
export const useLayerSelection = () => {
  const store = useLayersStore();
  
  useEffect(() => {
    // Zustandのsubscribe使用時は必ずクリーンアップ
    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds) => {
        // 選択されたレイヤーが変更された時の処理
        console.log('Selected layers changed:', selectedLayerIds);
      }
    );
    
    // クリーンアップ関数を返す
    return () => {
      unsubscribe();
    };
  }, []); // 依存配列は空にして、マウント時のみ実行
  
  return {
    // 既存のreturn
  };
};
```

#### カスタムフックでの汎用化
```typescript
// src/shared/hooks/useStoreSubscription.ts
export function useStoreSubscription<T>(
  selector: (state: any) => T,
  listener: (value: T) => void,
  store: any
) {
  useEffect(() => {
    const unsubscribe = store.subscribe(selector, listener);
    return unsubscribe;
  }, []); // ESLintの警告を無視するか、依存配列を適切に設定
}
```

---

## Phase 2: パフォーマンス問題の解決

### 問題の詳細
- 重複したAPI呼び出し
- 不要な再レンダリング
- 楽観的更新の競合

### 解決策

#### 4.1 重複API呼び出しの防止
```typescript
// src/features/layers/presentation/providers/LayersProvider.tsx
export const LayersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // アプリケーションレベルで一度だけレイヤーを取得
  const { data: layers } = useQuery({
    queryKey: queryKeys.layer.list(),
    queryFn: layersService.fetchLayers,
    staleTime: Infinity, // 手動で無効化するまでキャッシュを保持
    gcTime: 24 * 60 * 60 * 1000,
  });
  
  useEffect(() => {
    if (layers) {
      useLayersStore.getState().setAvailableLayers(layers);
    }
  }, [layers]);
  
  return <>{children}</>;
};
```

#### 4.2 不要な再レンダリングの防止
```typescript
// src/features/layers/presentation/hooks/useLayerSelection.ts
export const useLayerSelection = () => {
  // 関数をメモ化
  const toggleLayer = useCallback((layerId: string) => {
    return useLayersStore.getState().toggleLayer(layerId);
  }, []);
  
  const getSelectedLayerIds = useCallback(() => {
    return useLayersStore.getState().selectedLayerIds;
  }, []);
  
  // セレクターを使用して必要な部分のみ購読
  const selectedLayerIds = useLayersStore((state) => state.selectedLayerIds);
  const availableLayers = useLayersStore((state) => state.availableLayers);
  
  return {
    layers: availableLayers,
    selectedLayerIds,
    toggleLayer,
    getSelectedLayerIds,
  };
};
```

#### 4.3 楽観的更新の改善
```typescript
// src/features/layers/presentation/hooks/useCreateLayer.ts
export const useCreateLayer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: layersService.createLayer,
    onMutate: async (newLayer) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.layer.list() });
      
      // 楽観的更新
      const previousLayers = queryClient.getQueryData(queryKeys.layer.list());
      queryClient.setQueryData(queryKeys.layer.list(), (old: Layer[]) => [...old, newLayer]);
      
      return { previousLayers };
    },
    onError: (err, newLayer, context) => {
      // エラー時は元に戻す
      queryClient.setQueryData(queryKeys.layer.list(), context.previousLayers);
    },
    onSettled: () => {
      // 成功・失敗に関わらず最新データを取得
      queryClient.invalidateQueries({ queryKey: queryKeys.layer.list() });
    },
  });
};
```
