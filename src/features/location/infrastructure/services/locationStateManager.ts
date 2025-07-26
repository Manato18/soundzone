import * as Location from 'expo-location';
import { LocationError, UserLocationData } from '../../domain/entities/Location';
import { useLocationStore } from '../../application/location-store';
import { isValidLocation } from '../../utils/validation';

/**
 * 位置情報状態管理サービス
 * StateManagement.mdの設計原則に基づき、位置情報取得ロジックを一元管理
 */
export class LocationStateManager {
  private static instance: LocationStateManager;
  private locationSubscription: Location.LocationSubscription | null = null;
  private headingSubscription: Location.LocationSubscription | null = null;
  private lastHeadingUpdate: number = 0;
  private headingThrottleInterval: number = 100; // 100ms のスロットリング
  private errorCallback: ((error: LocationError) => void) | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): LocationStateManager {
    if (!LocationStateManager.instance) {
      LocationStateManager.instance = new LocationStateManager();
    }
    return LocationStateManager.instance;
  }

  /**
   * 位置情報の許可を要求
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const locationError: LocationError = {
          code: 'PERMISSION_DENIED',
          message: '位置情報の許可が必要です',
        };
        useLocationStore.getState().handleLocationError(locationError);
        if (this.errorCallback) {
          this.errorCallback(locationError);
        }
        return false;
      }
      
      // 位置情報サービスが有効かチェック
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const locationError: LocationError = {
          code: 'SERVICES_DISABLED',
          message: '位置情報サービスが無効です',
        };
        useLocationStore.getState().handleLocationError(locationError);
        if (this.errorCallback) {
          this.errorCallback(locationError);
        }
        return false;
      }
      
      // 権限が正常に取得できた場合、エラーをクリア
      useLocationStore.getState().setError(null);
      
      return true;
    } catch (error) {
      console.error('位置情報許可エラー:', error);
      const locationError: LocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: '位置情報の許可取得でエラーが発生しました',
      };
      useLocationStore.getState().handleLocationError(locationError);
      return false;
    }
  }

  /**
   * 現在位置を取得（リトライ機能付き）
   */
  async getCurrentLocation(): Promise<UserLocationData | null> {
    const { setIsLoading, setCurrentLocation, setStableLocation, updateStableLocationIfNeeded, handleLocationError, settings } = useLocationStore.getState();
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    setIsLoading(true);
    
    // シンプルなリトライループ（最大3回）
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: settings.highAccuracyMode ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: settings.locationUpdateInterval,
          distanceInterval: settings.distanceFilter,
        });
        
        // バリデーションチェック
        if (!isValidLocation(currentLocation)) {
          // 無効な位置情報の場合は即座に次の試行へ
          if (attempt < maxRetries) {
            console.log(`無効な位置情報（試行 ${attempt}/${maxRetries}）、再試行します...`);
            // 短い待機時間（500ms）
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          // 最後の試行でも無効な場合
          console.error('無効な位置情報が取得されました（全試行失敗）');
          const locationError: LocationError = {
            code: 'POSITION_UNAVAILABLE',
            message: '有効な位置情報を取得できませんでした',
          };
          handleLocationError(locationError);
          setIsLoading(false);
          return null;
        }
        
        // 有効な位置情報が取得できた場合
        setCurrentLocation(currentLocation);
        
        // 初回取得時はstableLocationも設定
        const stableLocation = useLocationStore.getState().stableLocation;
        if (!stableLocation) {
          setStableLocation(currentLocation);
        } else {
          // 既存のstableLocationがある場合は条件付き更新
          updateStableLocationIfNeeded(currentLocation);
        }
        
        setIsLoading(false);
        return currentLocation;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.log(`位置情報取得エラー（試行 ${attempt}/${maxRetries}）:`, error);
          // 待機時間を段階的に増やす（1秒、2秒、3秒）
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    // 全ての試行が失敗した場合
    console.error('現在位置取得エラー（全試行失敗）:', lastError);
    const locationError: LocationError = {
      code: 'POSITION_UNAVAILABLE',
      message: '現在位置の取得に失敗しました',
    };
    handleLocationError(locationError);
    setIsLoading(false);
    return null;
  }

  /**
   * 方向情報の監視を開始
   */
  private async startHeadingTracking(): Promise<void> {
    const { updateHeading, settings } = useLocationStore.getState();
    
    try {
      if (this.headingSubscription) {
        this.headingSubscription.remove();
      }

      // 高頻度での方向更新
      const headingUpdateInterval = Math.floor(1000 / (1000 / settings.headingUpdateInterval));
      
      this.headingSubscription = await Location.watchHeadingAsync(
        (headingData) => {
          const now = Date.now();
          // スロットリング: 最後の更新から指定時間経過していない場合はスキップ
          if (now - this.lastHeadingUpdate < this.headingThrottleInterval) {
            return;
          }
          
          // trueHeadingが利用可能な場合は優先、そうでなければmagHeadingを使用
          const heading = headingData.trueHeading !== -1 ? headingData.trueHeading : headingData.magHeading;
          // 有効な値の場合のみ更新
          if (heading !== null && heading !== undefined && !isNaN(heading)) {
            updateHeading(heading);
            this.lastHeadingUpdate = now;
          }
        }
      );
    } catch (error) {
      console.error('方向情報監視エラー:', error);
    }
  }

  /**
   * 位置情報の監視を開始
   */
  async startLocationTracking(): Promise<void> {
    const { 
      setCurrentLocation, 
      updateStableLocationIfNeeded,
      setIsLocationEnabled, 
      startLocationTracking, 
      handleLocationError, 
      settings,
      currentLocation
    } = useLocationStore.getState();
    
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
      }

      startLocationTracking(); // ストアの状態を更新

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: settings.highAccuracyMode ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: settings.locationUpdateInterval,
          distanceInterval: settings.distanceFilter,
        },
        (newLocation) => {
          // バリデーションチェック
          if (!isValidLocation(newLocation)) {
            console.error('無効な位置情報が監視中に取得されました');
            return;
          }
          
          // 現在のheadingを保持
          const currentHeading = useLocationStore.getState().currentLocation?.coords.heading;
          if (newLocation.coords.heading === null && currentHeading !== null && currentHeading !== undefined) {
            newLocation.coords.heading = currentHeading;
          }
          
          setCurrentLocation(newLocation);
          updateStableLocationIfNeeded(newLocation);
        }
      );
      
      // 方向情報の監視も開始
      await this.startHeadingTracking();
      
      setIsLocationEnabled(true);
    } catch (error) {
      console.error('位置情報監視エラー:', error);
      const locationError: LocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: '位置情報の監視開始に失敗しました',
      };
      handleLocationError(locationError);
    }
  }

  /**
   * 位置情報の監視を停止
   */
  stopLocationTracking(): void {
    const { stopLocationTracking, setIsLocationEnabled } = useLocationStore.getState();
    
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    if (this.headingSubscription) {
      this.headingSubscription.remove();
      this.headingSubscription = null;
    }
    stopLocationTracking(); // ストアの状態を更新
    setIsLocationEnabled(false);
  }

  /**
   * 位置情報サービスの初期化
   */
  async initialize(): Promise<void> {
    const hasPermission = await this.requestLocationPermission();
    
    if (hasPermission) {
      const { setIsLocationEnabled } = useLocationStore.getState();
      setIsLocationEnabled(true);
      
      const currentLocation = await this.getCurrentLocation();
      if (currentLocation) {
        await this.startLocationTracking();
      }
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.stopLocationTracking();
  }

  /**
   * エラーコールバックの設定
   */
  setErrorCallback(callback: (error: LocationError) => void): void {
    this.errorCallback = callback;
  }
}

// シングルトンインスタンスのエクスポート
export const locationStateManager = LocationStateManager.getInstance();