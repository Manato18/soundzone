# レイヤー機能の問題と解決策

## 1. レイヤー切替時のピン消失問題

### 問題の詳細
レイヤーを切り替えると、React Queryの新しいクエリキーにより一時的にデータがundefinedになり、地図上のピンが消えてから再表示される。

### 解決策

#### 方法1: keepPreviousDataの使用（推奨）
```typescript
// src/features/audioPin/presentation/hooks/useAudioPinsQuery.ts
import { keepPreviousData } from '@tanstack/react-query';

export const useAudioPinsQuery = ({ layerIds, bounds }: UseAudioPinsQueryParams) => {
  const query = useQuery({
    queryKey: ['audioPins', { layerIds, bounds }],
    queryFn: async () => {
      // 既存の実装
    },
    placeholderData: keepPreviousData, // 前回のデータを保持
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
  return query;
};
```

#### 方法2: 楽観的キャッシュ更新
```typescript
// src/features/layers/presentation/hooks/useLayerSelection.ts
const handleLayerToggle = (layerId: string) => {
  const previousLayerIds = getSelectedLayerIds();
  const newLayerIds = toggleLayer(layerId);
  
  // 既存のピンデータを新しいクエリキーにコピー
  const existingData = queryClient.getQueryData(['audioPins', { layerIds: previousLayerIds, bounds }]);
  if (existingData) {
    queryClient.setQueryData(['audioPins', { layerIds: newLayerIds, bounds }], existingData);
  }
};
```

## 2. 音声再生制御問題

### 問題の詳細
AudioPinModalを閉じても音声が再生され続け、停止する手段がない。

### 解決策

#### 実装案: Audio管理サービスの作成
```typescript
// src/features/audioPin/infrastructure/audio-manager.ts
class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  
  play(url: string): Promise<void> {
    // 既存の音声を停止
    this.stop();
    
    this.currentAudio = new Audio(url);
    return this.currentAudio.play();
  }
  
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
  
  pause(): void {
    this.currentAudio?.pause();
  }
  
  resume(): void {
    this.currentAudio?.play();
  }
}

export const audioManager = new AudioManager();
```

#### AudioPinModalでの使用
```typescript
// src/features/audioPin/presentation/components/AudioPinModal.tsx
import { audioManager } from '../../infrastructure/audio-manager';

const AudioPinModal = ({ isOpen, onClose, pin }) => {
  const handleClose = useCallback(() => {
    audioManager.stop(); // 音声を停止
    onClose();
  }, [onClose]);
  
  const handlePlay = useCallback(() => {
    audioManager.play(pin.audioUrl);
  }, [pin.audioUrl]);
  
  // コンポーネントのアンマウント時も音声を停止
  useEffect(() => {
    return () => {
      audioManager.stop();
    };
  }, []);
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* モーダルの内容 */}
    </Modal>
  );
};
```

## 3. メモリリーク問題

### 問題の詳細
useEffect内でのsubscribe処理にクリーンアップ関数がなく、コンポーネントのアンマウント時にリスナーが残る。

### 解決策

#### 実装案: 適切なクリーンアップの実装
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

## 4. パフォーマンス問題

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

## 実装優先順位

1. **高優先度**: レイヤー切替時のピン消失問題（ユーザー体験に直接影響）
2. **高優先度**: 音声再生制御問題（機能の基本的な動作）
3. **中優先度**: メモリリーク問題（長期的な安定性）
4. **低優先度**: パフォーマンス最適化（現時点では致命的ではない）

## テスト方針

各解決策実装後は以下のテストを実施：

1. **ピン消失問題**
   - レイヤー切替時にピンが消えないことを確認
   - 切替前後でピンの表示が維持されることを確認

2. **音声再生制御**
   - モーダルクローズ時に音声が停止することを確認
   - 別のピンを選択時に前の音声が停止することを確認

3. **メモリリーク**
   - React DevToolsのProfilerでコンポーネントのマウント/アンマウントを確認
   - Chrome DevToolsのMemoryプロファイラーでリークを確認

4. **パフォーマンス**
   - React Query DevToolsでクエリの実行回数を確認
   - React DevToolsでレンダリング回数を確認