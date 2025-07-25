# Map機能の問題点と解決策

## 3. メモリリーク・パフォーマンス問題

### 問題点
- PanResponderのメモリリーク
- Subscriptionの不適切なクリーンアップ
- 大量のマーカー表示時のパフォーマンス低下

### 実装された修正 ✅ [2025-07-25]

#### useMapWithLocationのメモリリーク修正
**問題**: `previousLocationRef.current`がコンポーネントアンマウント時にクリアされていない

**修正内容**: 
```typescript
// コンポーネントのアンマウント時にrefをクリア
useEffect(() => {
  return () => {
    previousLocationRef.current = null;
  };
}, []);
```

**修正ファイル**: `/src/features/map/presentation/hooks/useMapWithLocation.ts`

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