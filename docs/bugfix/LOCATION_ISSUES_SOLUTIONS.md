# 位置情報機能の問題と解決策

## 概要
このドキュメントは、SoundZoneアプリの位置情報機能（`@src/features/location/`）で発見された問題とその解決策をまとめたものです。

## 実装済みの項目（2025-07-26時点）

### 解決済みの問題
1. **状態管理の一元化** ✅
   - LocationProviderによる状態の一元管理実装済み
   - Zustandストアでの実装完了
   - useLocationContextフックの実装

2. **パフォーマンス最適化** ✅
   - heading更新の250msスロットリング実装済み（locationStateManager.ts:14,133-136）
   - shallow比較による再レンダリング最小化（location-store.ts:234-242）

3. **エラーハンドリング改善** ✅
   - エラーコールバックパターンによるUI分離（locationStateManager.ts:15,250-252）
   - 権限状態変更時の自動検知と対応（LocationProvider.tsx:79-108）
   - AppState監視による権限変更検知と再初期化

4. **権限管理** ✅
   - 権限取得成功時のエラークリア（locationStateManager.ts:63）
   - フォアグラウンド復帰時の権限再チェック

## 2. パフォーマンス問題

### 問題
- **不要な計算**: 冗長な数式計算
- **メモリリーク**: refがクリアされない
- **頻繁な再レンダリング**: 100msごとのheading更新 ✅ [解決済み]

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

#### 2.3 再レンダリングの最適化 ✅ [実装済み]
250msのスロットリングが実装済み（locationStateManager.ts）:
```typescript
private lastHeadingUpdate: number = 0;
private headingThrottleInterval: number = 250; // 250ms のスロットリング

// In heading update handler
if (now - this.lastHeadingUpdate < this.headingThrottleInterval) {
  return;
}
```

## 3. エラーハンドリングの改善

### 問題
- **リトライ機能なし**: 失敗時の自動リトライがない
- **本番環境でのconsole.error**: 詳細なエラーログが露出 ⚠️ [部分的に解決]
- **権限再要求の仕組みなし**: 拒否後の再要求フローがない ✅ [解決済み]

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

#### 3.3 権限再要求フローの実装 ✅ [実装済み]
AppState監視によるフォアグラウンド復帰時の権限再チェックが実装済み（LocationProvider.tsx）:
```typescript
useEffect(() => {
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // フォアグラウンドに復帰した時、権限状態を再チェック
      const hasPermission = await locationStateManager.requestLocationPermission();
      
      if (hasPermission && !isLocationEnabled) {
        // 権限が付与されている場合、位置情報サービスを初期化
        await locationStateManager.initialize();
      } else if (!hasPermission && isLocationEnabled) {
        // 権限が取り消された場合、位置情報サービスを停止
        locationStateManager.stopLocationTracking();
      }
    }
  };
  
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
}, [isLocationEnabled]);
```

## 4. 同期問題の解決

### 問題
- **複数の検証ポイント**: 同じ検証が複数箇所で実施
- **直接的なstore参照**: データフローが不明瞭 ✅ [解決済み]
- **初期化タイミング**: 不明確な初期化 ✅ [解決済み]

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

#### 4.2 明確なデータフローの確立 ✅ [実装済み]
LocationProviderとuseLocationContextが実装済み:
- LocationProvider.tsx: 位置情報の一元管理Provider
- useLocationContext.ts: Contextとストアの状態を統合したフック

#### 4.3 明確な初期化フロー ✅ [実装済み]
LocationProvider内で自動初期化が実装済み（LocationProvider.tsx）:
```typescript
useEffect(() => {
  // エラーコールバックの設定
  locationStateManager.setErrorCallback((error: LocationError) => {
    // UIアラートをPresentation層で処理
  });
  
  // マウント時に位置情報サービスを初期化
  locationStateManager.initialize();

  // クリーンアップ
  return () => {
    locationStateManager.cleanup();
  };
}, []);
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

1. **完了済み** ✅
   - 状態の不整合問題の解決（Single Source of Truth）
   - エラーハンドリングの改善（権限管理、エラーコールバック）
   - パフォーマンス最適化（heading更新のスロットリング、shallow比較）
   - 同期問題の解決（LocationProvider、初期化フロー）

2. **未実装の高優先度**
   - リトライメカニズムの実装
   - メモリリークの修正（refクリア）
   - 厳密な位置情報バリデーション関数

3. **中優先度**
   - 環境別ログ制御の完全実装
   - 他機能への影響の最適化

## まとめ

位置情報機能の主要な問題は2025-07-26時点でほぼ解決されています：
- **状態管理の一元化**: LocationProviderとZustandストアによる実装完了
- **パフォーマンス最適化**: 250msスロットリングとshallow比較の実装
- **権限管理**: AppState監視による自動検知と再初期化
- **エラーハンドリング**: コールバックパターンによるUI分離

残っている課題は主にリトライメカニズムと詳細なバリデーション機能の実装です。