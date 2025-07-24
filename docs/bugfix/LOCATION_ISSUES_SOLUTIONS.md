# 位置情報機能の問題と解決策

## 概要
このドキュメントは、SoundZoneアプリの位置情報機能（`@src/features/location/`）で発見された問題とその解決策をまとめたものです。

## 1. 状態の不整合問題

### 問題
- **stableLocationの二重管理**: HomeScreenで独自の`stableLocation`状態を管理し、location storeの状態と二重管理になっている
- **heading更新の競合**: 位置情報（2秒間隔）とheading（100ms間隔）の更新頻度が異なるため、タイミングによってheadingがnullになる

### 解決策

#### 1.1 Single Source of Truth の確立
```typescript
// location-store.ts に安定化ロジックを統合
interface LocationState {
  currentLocation: Location | null;
  stableLocation: Location | null; // 追加
  // ...
}

// 安定化ロジックをstoreに移動
const updateLocation = (location: Location) => {
  const isValidLocation = location.coords.latitude !== 0 && location.coords.longitude !== 0;
  if (isValidLocation) {
    set({ 
      currentLocation: location,
      stableLocation: location 
    });
  } else {
    set({ currentLocation: location }); // stableLocationは更新しない
  }
};
```

#### 1.2 Heading更新の統合
```typescript
// 位置情報とheadingを統合した更新メカニズム
interface UnifiedLocationUpdate {
  position?: Location;
  heading?: number;
  timestamp: number;
}

// 統合された更新関数
const updateUnifiedLocation = (update: UnifiedLocationUpdate) => {
  const current = get().currentLocation;
  const merged = {
    ...current,
    ...(update.position || {}),
    coords: {
      ...current?.coords,
      ...update.position?.coords,
      heading: update.heading ?? current?.coords.heading
    },
    timestamp: update.timestamp
  };
  set({ currentLocation: merged });
};
```

## 2. パフォーマンス問題

### 問題
- **不要な計算**: 冗長な数式計算
- **メモリリーク**: refがクリアされない
- **頻繁な再レンダリング**: 100msごとのheading更新

### 解決策

#### 2.1 計算の最適化
```typescript
// Before
const headingUpdateInterval = Math.floor(1000 / (1000 / settings.headingUpdateInterval));

// After
const headingUpdateInterval = settings.headingUpdateInterval;
```

#### 2.2 メモリリークの修正
```typescript
// useMapWithLocation.ts
useEffect(() => {
  return () => {
    // クリーンアップ時にrefをクリア
    previousLocationRef.current = null;
  };
}, []);
```

#### 2.3 再レンダリングの最適化
```typescript
// デバウンスを使用した更新
const debouncedHeadingUpdate = useMemo(
  () => debounce((heading: number) => {
    updateHeading(heading);
  }, 50), // 50msでデバウンス
  []
);

// 選択的な更新
const updateHeadingIfSignificant = (newHeading: number) => {
  const currentHeading = get().currentLocation?.coords.heading || 0;
  const difference = Math.abs(newHeading - currentHeading);
  
  // 5度以上の変化がある場合のみ更新
  if (difference > 5) {
    debouncedHeadingUpdate(newHeading);
  }
};
```

## 3. エラーハンドリングの改善

### 問題
- **リトライ機能なし**: 失敗時の自動リトライがない
- **本番環境でのconsole.error**: 詳細なエラーログが露出
- **権限再要求の仕組みなし**: 拒否後の再要求フローがない

### 解決策

#### 3.1 リトライメカニズムの実装
```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config = defaultRetryConfig
): Promise<T> => {
  let lastError: Error;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < config.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
      }
    }
  }
  
  throw lastError!;
};
```

#### 3.2 環境別ログ制御
```typescript
// utils/logger.ts
const isDevelopment = __DEV__;

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // 本番環境では最小限の情報のみ
      console.error(message);
      // Sentryなどのエラー追跡サービスに送信
    }
  },
  // ...
};
```

#### 3.3 権限再要求フローの実装
```typescript
interface PermissionRecoveryOptions {
  showSettingsPrompt: boolean;
  onSettingsReturn?: () => void;
}

const handlePermissionDenied = async (options: PermissionRecoveryOptions) => {
  if (options.showSettingsPrompt) {
    Alert.alert(
      '位置情報の許可が必要です',
      'アプリの設定から位置情報の使用を許可してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '設定を開く',
          onPress: () => {
            Linking.openSettings();
            // アプリがフォアグラウンドに戻った時の処理を登録
            if (options.onSettingsReturn) {
              AppState.addEventListener('change', handleAppStateChange);
            }
          }
        }
      ]
    );
  }
};
```

## 4. 同期問題の解決

### 問題
- **複数の検証ポイント**: 同じ検証が複数箇所で実施
- **直接的なstore参照**: データフローが不明瞭
- **初期化タイミング**: 不明確な初期化

### 解決策

#### 4.1 共通検証ロジックの統一
```typescript
// utils/location-validation.ts
export const isValidCoordinates = (coords: { latitude: number; longitude: number }): boolean => {
  return (
    coords.latitude !== 0 && 
    coords.longitude !== 0 &&
    coords.latitude >= -90 && 
    coords.latitude <= 90 &&
    coords.longitude >= -180 && 
    coords.longitude <= 180
  );
};

export const isValidLocation = (location: Location | null): location is Location => {
  return location !== null && isValidCoordinates(location.coords);
};
```

#### 4.2 明確なデータフローの確立
```typescript
// LocationProvider.tsx - 新規作成
export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
};

// 各コンポーネントではContextから取得
export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return context;
};
```

#### 4.3 明確な初期化フロー
```typescript
// App.tsx での初期化
export default function App() {
  const [isLocationReady, setIsLocationReady] = useState(false);
  
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        await LocationService.initialize();
        setIsLocationReady(true);
      } catch (error) {
        // エラーハンドリング
      }
    };
    
    initializeLocation();
  }, []);
  
  if (!isLocationReady) {
    return <LoadingScreen />;
  }
  
  return (
    <LocationProvider>
      <AppContent />
    </LocationProvider>
  );
}
```

## 5. 他機能への影響の解決

### 問題
- **音声ピン機能**: 位置情報null時の挙動が不明確
- **地図の自動追従**: ユーザー操作中の意図しない移動
- **レイヤー切り替え**: 不要な位置情報再取得

### 解決策

#### 5.1 音声ピン作成時のガード
```typescript
// useCreateAudioPin.ts
const createAudioPin = async (data: CreateAudioPinInput) => {
  const location = getCurrentLocation();
  
  if (!isValidLocation(location)) {
    throw new Error('有効な位置情報が取得できません。位置情報を有効にしてください。');
  }
  
  return await createAudioPinMutation({
    ...data,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  });
};
```

#### 5.2 ユーザー操作検出の改善
```typescript
// useMapInteraction.ts
interface MapInteractionState {
  isUserInteracting: boolean;
  lastInteractionTime: number;
  interactionTimeout: NodeJS.Timeout | null;
}

const INTERACTION_TIMEOUT = 5000; // 5秒後に自動追従を再開

const handleMapInteraction = () => {
  clearTimeout(interactionState.interactionTimeout);
  
  setInteractionState({
    isUserInteracting: true,
    lastInteractionTime: Date.now(),
    interactionTimeout: setTimeout(() => {
      setInteractionState(prev => ({
        ...prev,
        isUserInteracting: false
      }));
    }, INTERACTION_TIMEOUT)
  });
};
```

#### 5.3 レイヤー切り替え時の最適化
```typescript
// useLayerSelection.ts
const selectLayer = useCallback((layerId: string) => {
  // 位置情報の再取得を防ぐため、現在の位置情報を保持
  const currentLocation = locationStore.getState().currentLocation;
  
  // レイヤーを切り替え
  setSelectedLayer(layerId);
  
  // ピンの再フェッチ（位置情報は再利用）
  refetchPinsForLayer(layerId, currentLocation);
}, []);
```

## 実装優先順位

1. **高優先度**
   - 状態の不整合問題の解決（Single Source of Truth）
   - エラーハンドリングの改善
   - メモリリークの修正

2. **中優先度**
   - パフォーマンス最適化
   - 同期問題の解決

3. **低優先度**
   - 他機能への影響の最適化

## まとめ

これらの解決策を段階的に実装することで、位置情報機能の安定性とパフォーマンスを大幅に改善できます。特に、状態管理の一元化とエラーハンドリングの強化は、ユーザー体験の向上に直接つながるため、優先的に実装することを推奨します。