import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { UserLocationData, LocationError } from '../../domain/entities/Location';
import {
  useLocationStore,
} from '../../application/location-store';

export const useLocation = () => {
  // Zustandストアから状態を取得（一時的な対処として直接ストアから取得）
  const location = useLocationStore((state) => state.currentLocation);
  const errorMsg = useLocationStore((state) => state.error);
  const isLocationEnabled = useLocationStore((state) => state.isLocationEnabled);
  const settings = useLocationStore((state) => state.settings);
  
  // アクションを取得
  const setCurrentLocation = useLocationStore((state) => state.setCurrentLocation);
  const setIsLocationEnabled = useLocationStore((state) => state.setIsLocationEnabled);
  const setIsLoading = useLocationStore((state) => state.setIsLoading);
  const startTracking = useLocationStore((state) => state.startLocationTracking);
  const stopTracking = useLocationStore((state) => state.stopLocationTracking);
  const handleLocationError = useLocationStore((state) => state.handleLocationError);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // 位置情報の許可を取得
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const locationError: LocationError = {
          code: 'PERMISSION_DENIED',
          message: '位置情報の許可が必要です',
        };
        handleLocationError(locationError);
        Alert.alert(
          '位置情報の許可',
          '位置情報の許可が必要です。設定から許可してください。',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // 位置情報サービスが有効かチェック
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const locationError: LocationError = {
          code: 'SERVICES_DISABLED',
          message: '位置情報サービスが無効です',
        };
        handleLocationError(locationError);
        Alert.alert(
          '位置情報サービス',
          '位置情報サービスを有効にしてください。',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('位置情報許可エラー:', error);
      const locationError: LocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: '位置情報の許可取得でエラーが発生しました',
      };
      handleLocationError(locationError);
      return false;
    }
  };

  // 現在位置を取得
  const getCurrentLocation = async (): Promise<UserLocationData | null> => {
    try {
      setIsLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: settings.highAccuracyMode ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: settings.locationUpdateInterval,
        distanceInterval: settings.distanceFilter,
      });
      
      setCurrentLocation(currentLocation);
      setIsLoading(false);
      return currentLocation;
    } catch (error) {
      console.error('現在位置取得エラー:', error);
      const locationError: LocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: '現在位置の取得に失敗しました',
      };
      handleLocationError(locationError);
      setIsLoading(false);
      return null;
    }
  };

  // 位置情報の監視を開始
  const startLocationTracking = async (): Promise<void> => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      startTracking(); // ストアの状態を更新

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: settings.highAccuracyMode ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: settings.locationUpdateInterval,
          distanceInterval: settings.distanceFilter,
        },
        (newLocation) => {
          setCurrentLocation(newLocation);
        }
      );
      
      setIsLocationEnabled(true);
    } catch (error) {
      console.error('位置情報監視エラー:', error);
      const locationError: LocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: '位置情報の監視開始に失敗しました',
      };
      handleLocationError(locationError);
    }
  };

  // 位置情報の監視を停止
  const stopLocationTracking = (): void => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    stopTracking(); // ストアの状態を更新
    setIsLocationEnabled(false);
  };

  // 初期化処理
  useEffect(() => {
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermission();
      
      if (hasPermission) {
        setIsLocationEnabled(true);
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          await startLocationTracking();
        }
      }
    };

    initializeLocation();

    // クリーンアップ
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空の依存配列で初回のみ実行

  // 既存のインターフェースを維持
  return {
    location,
    errorMsg,
    isLocationEnabled,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
  };
}; 