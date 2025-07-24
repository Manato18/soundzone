# AudioPin機能の問題点と解決策

## 概要
AudioPin機能の現在の実装には、メモリリーク、状態管理の不整合、UXの問題など、複数の重大な問題が存在します。本ドキュメントでは、これらの問題を詳細に分析し、具体的な解決策を提案します。

## 1. 音声再生のメモリリーク問題

### 問題の詳細
- **場所**: `components/AudioPlayerModal.tsx`
- **症状**: 
  - モーダルを閉じても音声が再生され続ける
  - TrackPlayerインスタンスが解放されない
  - アプリのメモリ使用量が増加し続ける
  - バックグラウンドでも音声が再生される

### 根本原因
1. `closeModal`関数（202-204行目）がアニメーションのみを処理し、音声を停止しない
2. コンポーネントのアンマウント時にクリーンアップ処理がない
3. TrackPlayerのライフサイクル管理が不適切

### 解決策

#### 1.1 即座の修正（短期対策）
```typescript
// AudioPlayerModal.tsx に以下を追加

// クリーンアップ用のuseEffect
useEffect(() => {
  return () => {
    // コンポーネントアンマウント時の処理
    TrackPlayer.stop();
    TrackPlayer.reset();
  };
}, []);

// closeModal関数の改修
const closeModal = useCallback(async () => {
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    animateToState('CLOSED');
    // モーダル状態のリセット
    if (onClose) onClose();
  } catch (error) {
    console.error('Error closing audio modal:', error);
  }
}, [animateToState, onClose]);

// バックグラウンド対応
useEffect(() => {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background') {
      TrackPlayer.pause();
    }
  };
  
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, []);
```

#### 1.2 長期的な解決策（アーキテクチャ改善）
グローバル音声サービスを実装し、シングルトンパターンで管理：

```typescript
// services/AudioService.ts
class AudioService {
  private static instance: AudioService;
  private isInitialized = false;
  
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      stopWithApp: true,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
    });
    
    this.isInitialized = true;
  }
  
  async play(audioUrl: string, metadata?: any) {
    await this.stop(); // 既存の音声を停止
    await TrackPlayer.add({
      url: audioUrl,
      ...metadata,
    });
    await TrackPlayer.play();
  }
  
  async stop() {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  }
  
  async cleanup() {
    await this.stop();
    // 必要に応じて他のクリーンアップ処理
  }
}
```

## 2. レイヤー切替時のピン消失問題

### 問題の詳細
- **場所**: `src/features/audioPin/presentation/hooks/read/useAudioPinsQuery.ts`
- **症状**:
  - レイヤーを選択/解除時にピンが一瞬消える
  - ユーザー体験が悪い（ちらつき）
  - 不要なAPIリクエストが発生

### 根本原因
- queryKeyに`layerIds`が含まれているため、レイヤー変更時に新しいクエリとして扱われる
- React Queryのキャッシュが効かない

### 解決策

#### 2.1 クエリキー最適化
```typescript
// useAudioPinsQuery.ts の改修案

export const useAudioPinsQuery = ({ bounds, layerIds }: UseAudioPinsQueryParams) => {
  // 基本クエリ（レイヤーIDを含めない）
  const baseQuery = useQuery({
    queryKey: ['audioPins', { bounds }],
    queryFn: () => queryFunction.audioPins({ bounds }),
    staleTime: 5 * 60 * 1000, // 5分
    cacheTime: 10 * 60 * 1000, // 10分
  });
  
  // クライアントサイドでのフィルタリング
  const filteredData = useMemo(() => {
    if (!baseQuery.data) return [];
    if (!layerIds || layerIds.length === 0) return baseQuery.data;
    
    return baseQuery.data.filter(pin => 
      layerIds.includes(pin.layerId)
    );
  }, [baseQuery.data, layerIds]);
  
  return {
    ...baseQuery,
    data: filteredData,
  };
};
```

#### 2.2 楽観的更新の実装
```typescript
// レイヤー変更時の楽観的更新
const handleLayerChange = (newLayerIds: string[]) => {
  // 即座にUIを更新
  queryClient.setQueryData(['audioPins', { bounds }], (old: AudioPin[]) => {
    if (!old) return [];
    return old.filter(pin => newLayerIds.includes(pin.layerId));
  });
  
  // その後でレイヤーIDを更新
  setLayerIds(newLayerIds);
};
```

#### 2.3 プリフェッチ戦略
```typescript
// 頻繁に使用されるレイヤーの組み合わせをプリフェッチ
const prefetchCommonLayers = async () => {
  const commonLayerCombinations = [
    [], // すべてのレイヤー
    ['layer1'], // 人気レイヤー1
    ['layer2'], // 人気レイヤー2
  ];
  
  for (const layers of commonLayerCombinations) {
    await queryClient.prefetchQuery({
      queryKey: ['audioPins', { bounds, layerIds: layers }],
      queryFn: () => queryFunction.audioPins({ bounds, layerIds: layers }),
    });
  }
};
```

## 3. 状態管理の不整合

### 問題の詳細
- **症状**:
  - 音声再生状態がZustandストアとTrackPlayerで分離
  - `playingPinId`の更新とTrackPlayerの状態が同期しない
  - モーダルの開閉と音声再生が独立して動作

### 解決策

#### 3.1 統合された音声状態管理
```typescript
// audioPin-store.ts の拡張

interface AudioPinState {
  // 既存の状態
  pins: AudioPin[];
  selectedPin: AudioPin | null;
  playingPinId: string | null;
  
  // 新規追加
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
  audioProgress: {
    position: number;
    duration: number;
    buffered: number;
  };
  
  // 音声制御アクション
  playAudio: (pin: AudioPin) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  
  // 状態同期アクション
  syncAudioState: () => Promise<void>;
}

// 実装例
const useAudioPinStore = create<AudioPinState>((set, get) => ({
  // ... 既存の実装
  
  playAudio: async (pin: AudioPin) => {
    try {
      set({ audioState: 'loading', selectedPin: pin });
      
      // AudioServiceを使用
      const audioService = AudioService.getInstance();
      await audioService.play(pin.audioUrl, {
        title: pin.title,
        artist: pin.userName,
      });
      
      set({ 
        audioState: 'playing', 
        playingPinId: pin.id,
      });
    } catch (error) {
      set({ audioState: 'error' });
      throw error;
    }
  },
  
  stopAudio: async () => {
    const audioService = AudioService.getInstance();
    await audioService.stop();
    
    set({ 
      audioState: 'idle',
      playingPinId: null,
      audioProgress: { position: 0, duration: 0, buffered: 0 },
    });
  },
  
  // TrackPlayerイベントリスナーで状態を同期
  syncAudioState: async () => {
    const state = await TrackPlayer.getState();
    const progress = await TrackPlayer.getProgress();
    
    set({
      audioState: mapTrackPlayerState(state),
      audioProgress: {
        position: progress.position,
        duration: progress.duration,
        buffered: progress.buffered,
      },
    });
  },
}));
```

#### 3.2 イベント駆動アーキテクチャ
```typescript
// hooks/useAudioEvents.ts
export const useAudioEvents = () => {
  const { syncAudioState, stopAudio } = useAudioPinStore();
  
  useEffect(() => {
    // TrackPlayerイベントを監視
    const progressListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      syncAudioState
    );
    
    const stateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      syncAudioState
    );
    
    const errorListener = TrackPlayer.addEventListener(
      Event.PlaybackError,
      (error) => {
        console.error('Playback error:', error);
        stopAudio();
      }
    );
    
    return () => {
      progressListener.remove();
      stateListener.remove();
      errorListener.remove();
    };
  }, [syncAudioState, stopAudio]);
};
```

## 4. リソース管理の欠如

### 問題の詳細
- **症状**:
  - 複数ピンの高速タップで音声が重複再生
  - ネットワークリクエストのキャンセル処理なし
  - メモリリークの可能性

### 解決策

#### 4.1 リクエストのデバウンスとキャンセル
```typescript
// hooks/useAudioPinSelection.ts
export const useAudioPinSelection = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const selectPin = useCallback((pin: AudioPin) => {
    // 既存のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // タイムアウトをクリア
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    // デバウンス処理
    selectionTimeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        await loadAndPlayAudio(pin, {
          signal: abortControllerRef.current.signal,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Audio loading error:', error);
        }
      }
    }, 300); // 300msのデバウンス
  }, []);
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);
  
  return { selectPin };
};
```

#### 4.2 リソースプール管理
```typescript
// services/ResourcePool.ts
class AudioResourcePool {
  private maxConcurrent = 1;
  private activeRequests = new Set<AbortController>();
  
  async executeWithLimit<T>(
    task: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // 既存のリクエストをすべてキャンセル
    this.cancelAll();
    
    const controller = new AbortController();
    this.activeRequests.add(controller);
    
    try {
      const result = await task(controller.signal);
      return result;
    } finally {
      this.activeRequests.delete(controller);
    }
  }
  
  cancelAll() {
    this.activeRequests.forEach(controller => {
      controller.abort();
    });
    this.activeRequests.clear();
  }
}
```

## 5. 実装優先順位とロードマップ

### フェーズ1（即座の修正 - 1週間）
1. AudioPlayerModalのクリーンアップ処理追加
2. closeModal関数での音声停止実装
3. バックグラウンド時の音声一時停止

### フェーズ2（中期改善 - 2週間）
1. AudioServiceシングルトンの実装
2. Zustandストアへの音声状態統合
3. レイヤー切替時のピン表示最適化

### フェーズ3（長期改善 - 1ヶ月）
1. 完全なリソース管理システムの実装
2. エラーバウンダリの追加
3. パフォーマンス最適化とテスト

## 6. テスト戦略

### ユニットテスト
- AudioServiceの各メソッドのテスト
- Zustandストアのアクションテスト
- クリーンアップ処理の検証

### 統合テスト
- モーダルの開閉と音声再生の連携
- レイヤー切替時の動作
- 複数ピンの連続選択

### E2Eテスト
- ユーザーシナリオベースのテスト
- メモリリークの検証
- パフォーマンステスト

## まとめ
AudioPin機能の問題は、主にリソース管理と状態管理の不備に起因しています。提案した解決策を段階的に実装することで、安定性とユーザー体験を大幅に改善できます。特に音声のメモリリークは緊急性が高いため、フェーズ1の実装を最優先で進めることを推奨します。