# Map機能の問題点と解決策

## 1. オーディオピンの再生に関する問題

### 問題点
- TrackPlayerのクリーンアップ不足により、モーダルを閉じても音声が再生され続ける
- TrackPlayerのセットアップが複数回実行される可能性

### 解決策

#### 1.1 TrackPlayerの適切なクリーンアップ
```typescript
// AudioPlayerModalのクリーンアップ処理を強化
const cleanupTrackPlayer = async () => {
  try {
    // 再生を停止
    await TrackPlayer.stop();
    // キューをクリア
    await TrackPlayer.reset();
    // 必要に応じてTrackPlayerを破棄
    if (!otherModalOpen) {
      await TrackPlayer.destroy();
    }
  } catch (error) {
    console.error('TrackPlayer cleanup error:', error);
  }
};

// useEffectのクリーンアップで確実に実行
useEffect(() => {
  return () => {
    cleanupTrackPlayer();
  };
}, []);
```

#### 1.2 シングルトンパターンの実装
```typescript
// TrackPlayerのシングルトン管理
class TrackPlayerManager {
  private static instance: TrackPlayerManager;
  private isInitialized = false;
  
  static getInstance() {
    if (!TrackPlayerManager.instance) {
      TrackPlayerManager.instance = new TrackPlayerManager();
    }
    return TrackPlayerManager.instance;
  }
  
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      await TrackPlayer.setupPlayer();
      this.isInitialized = true;
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

#### 1.3 AudioPinStoreでの再生状態管理
- グローバルな再生状態を管理し、複数のモーダル間で共有
- 新しいピンを選択した際に、前の再生を自動停止

## 2. レイヤー選択時のピン再取得問題

### 問題点
- レイヤー変更時に毎回API呼び出しが発生し、ピンが一時的に消える

### 解決策

#### 2.1 クライアントサイドフィルタリング
```typescript
// 全ピンを取得し、クライアント側でフィルタリング
const useFilteredAudioPins = (selectedLayerIds: string[]) => {
  // 全ピンを取得（レイヤーIDなしでクエリ）
  const { data: allPins } = useAudioPinsQuery({ 
    layerIds: undefined // 全ピンを取得
  });
  
  // クライアント側でフィルタリング
  const filteredPins = useMemo(() => {
    if (!selectedLayerIds.length) return allPins;
    
    return allPins?.filter(pin => 
      pin.layerIds.some(layerId => selectedLayerIds.includes(layerId))
    ) || [];
  }, [allPins, selectedLayerIds]);
  
  return filteredPins;
};
```

#### 2.2 オプティミスティックアップデート
```typescript
// レイヤー変更時の即座の表示更新
const handleLayerToggle = (layerId: string) => {
  // 即座にUIを更新（チラつき防止）
  setOptimisticLayerIds(prev => {
    const newIds = prev.includes(layerId) 
      ? prev.filter(id => id !== layerId)
      : [...prev, layerId];
    return newIds;
  });
  
  // 実際の状態更新
  toggleLayer(layerId);
};
```

#### 2.3 キャッシュ戦略の改善
```typescript
// React Queryのキャッシュ設定を調整
{
  staleTime: Infinity, // データを常に新鮮とみなす
  gcTime: 30 * 60 * 1000, // 30分間キャッシュ保持
  refetchOnMount: false,
  refetchOnWindowFocus: false,
}
```

## 3. メモリリーク・パフォーマンス問題

### 問題点
- PanResponderのメモリリーク
- Subscriptionの不適切なクリーンアップ
- 大量のマーカー表示時のパフォーマンス低下

### 解決策

#### 3.1 PanResponderの適切な管理
```typescript
// PanResponderの作成を最適化
const panResponder = useRef(
  PanResponder.create({
    // 設定...
  })
).current; // useRefで一度だけ作成

// コンポーネントのアンマウント時にクリーンアップ
useEffect(() => {
  return () => {
    // PanResponderに関連するリソースをクリア
    panResponder.panHandlers = {};
  };
}, []);
```

#### 3.2 Subscriptionの確実なクリーンアップ
```typescript
// useLocationの改善
const subscriptions = useRef<{
  location?: LocationSubscription;
  heading?: LocationSubscription;
}>({});

const cleanup = useCallback(() => {
  Object.values(subscriptions.current).forEach(sub => {
    sub?.remove();
  });
  subscriptions.current = {};
}, []);

// useEffectで確実にクリーンアップ
useEffect(() => {
  return cleanup;
}, [cleanup]);
```

#### 3.3 マーカーの仮想化とクラスタリング
```typescript
// react-native-maps-super-clusterの導入
import ClusteredMapView from 'react-native-maps-super-cluster';

// 表示範囲内のマーカーのみレンダリング
const visiblePins = useMemo(() => {
  return pins.filter(pin => {
    const distance = calculateDistance(userLocation, pin.location);
    return distance < MAX_VISIBLE_DISTANCE;
  });
}, [pins, userLocation]);

// クラスタリング設定
<ClusteredMapView
  radius={40}
  maxZoom={15}
  minZoom={5}
  extent={512}
  nodeSize={64}
  // その他の設定
/>
```

## 4. 状態管理の一貫性問題

### 問題点
- 部分的な永続化による状態の不整合
- 複数ストア間の同期問題

### 解決策

#### 4.1 永続化戦略の見直し
```typescript
// 明確な永続化ルール
const persistConfig = {
  // UI状態は永続化しない
  blacklist: ['isModalVisible', 'playbackState', 'isLoading'],
  
  // 設定とユーザーデータのみ永続化
  whitelist: ['settings', 'favoriteLayerIds', 'defaultLayerIds'],
  
  // バージョン管理
  version: 1,
  migrate: (state, version) => {
    // マイグレーションロジック
    return state;
  }
};
```

#### 4.2 ストア間の通信パターン
```typescript
// イベントエミッターパターンの導入
class StoreEventEmitter extends EventEmitter {
  emitLayerChange(layerIds: string[]) {
    this.emit('layer-change', layerIds);
  }
  
  onLayerChange(callback: (layerIds: string[]) => void) {
    this.on('layer-change', callback);
  }
}

// 各ストアでイベントをリッスン
useEffect(() => {
  const unsubscribe = storeEvents.onLayerChange((layerIds) => {
    // 他のストアの状態を更新
    refetchAudioPins();
  });
  
  return unsubscribe;
}, []);
```

## 5. 位置情報の精度問題

### 問題点
- stableLocationの更新条件が緩い
- heading情報のnull値処理が不完全

### 解決策

#### 5.1 位置情報の検証強化
```typescript
const isValidLocation = (location: UserLocationData): boolean => {
  if (!location?.coords) return false;
  
  const { latitude, longitude, accuracy } = location.coords;
  
  // より厳密な検証
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    accuracy < 100 // 精度100m以下のみ採用
  );
};
```

#### 5.2 Heading情報の補間
```typescript
// Kalmanフィルターの実装
class HeadingFilter {
  private lastHeading: number | null = null;
  private lastTimestamp: number = 0;
  
  filter(heading: number | null, timestamp: number): number | null {
    if (heading === null) {
      // 前回の値から推定
      if (this.lastHeading !== null && timestamp - this.lastTimestamp < 1000) {
        return this.lastHeading;
      }
      return null;
    }
    
    // スムージング処理
    if (this.lastHeading !== null) {
      const alpha = 0.3; // フィルター係数
      heading = this.lastHeading * (1 - alpha) + heading * alpha;
    }
    
    this.lastHeading = heading;
    this.lastTimestamp = timestamp;
    return heading;
  }
}
```

## 6. エラーハンドリング不足

### 問題点
- API呼び出し失敗時の再試行メカニズムなし
- ネットワークエラー時のフォールバック処理なし

### 解決策

#### 6.1 再試行メカニズムの実装
```typescript
// React Queryの再試行設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // ネットワークエラーの場合は3回まで再試行
        if (error.code === 'NETWORK_ERROR') {
          return failureCount < 3;
        }
        // 認証エラーの場合は再試行しない
        if (error.code === 'UNAUTHORIZED') {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

#### 6.2 オフラインサポート
```typescript
// オフラインデータの永続化
const offlineCache = {
  async savePins(pins: AudioPin[]) {
    await AsyncStorage.setItem('offline_pins', JSON.stringify(pins));
  },
  
  async loadPins(): Promise<AudioPin[]> {
    const data = await AsyncStorage.getItem('offline_pins');
    return data ? JSON.parse(data) : [];
  }
};

// ネットワーク状態の監視
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return unsubscribe;
  }, []);
  
  return isOnline;
};
```

## 7. UIの応答性問題

### 問題点
- モーダルアニメーション中の状態更新によるクラッシュ
- 追従モード停止時のフィードバック不足

### 解決策

#### 7.1 アニメーションと状態更新の分離
```typescript
// InteractionManagerを使用した安全な状態更新
const safeSetState = (updater: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    updater();
  });
};

// アニメーション完了後の処理
Animated.spring(slideAnim, config).start(({ finished }) => {
  if (finished) {
    safeSetState(() => {
      // 状態更新
    });
  }
});
```

#### 7.2 ユーザーフィードバックの改善
```typescript
// 追従モード変更の通知
const NotificationBanner = () => {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const unsubscribe = useMapStore.subscribe(
      state => state.isFollowingUser,
      (isFollowing, prevIsFollowing) => {
        if (!isFollowing && prevIsFollowing) {
          setMessage('現在地追従を停止しました');
          setShow(true);
          setTimeout(() => setShow(false), 3000);
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return show ? <Banner message={message} /> : null;
};
```

## 実装優先順位

1. **高優先度**
   - オーディオピンの再生問題の修正
   - レイヤー選択時のチラつき解消
   - メモリリークの修正

2. **中優先度**
   - 位置情報精度の改善
   - エラーハンドリングの強化

3. **低優先度**
   - UIフィードバックの改善
   - パフォーマンス最適化（クラスタリング等）

## テスト方針

各修正に対して以下のテストを実施：

1. **単体テスト**: 各機能の正常動作確認
2. **統合テスト**: ストア間の連携確認
3. **パフォーマンステスト**: メモリ使用量、レンダリング速度
4. **エッジケーステスト**: ネットワーク切断、権限拒否等