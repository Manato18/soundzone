import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { UserLocationData } from '../../domain/entities/Location';

export const useLocation = () => {
  const [location, setLocation] = useState<UserLocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // 位置情報の許可を取得
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('位置情報の許可が必要です');
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
        setErrorMsg('位置情報サービスが無効です');
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
      setErrorMsg('位置情報の許可取得でエラーが発生しました');
      return false;
    }
  };

  // 現在位置を取得
  const getCurrentLocation = async (): Promise<UserLocationData | null> => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      });
      
      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      console.error('現在位置取得エラー:', error);
      setErrorMsg('現在位置の取得に失敗しました');
      return null;
    }
  };

  // 位置情報の監視を開始
  const startLocationTracking = async (): Promise<void> => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // 2秒ごとに更新
          distanceInterval: 5, // 5m移動したら更新
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
      
      setIsLocationEnabled(true);
    } catch (error) {
      console.error('位置情報監視エラー:', error);
      setErrorMsg('位置情報の監視開始に失敗しました');
    }
  };

  // 位置情報の監視を停止
  const stopLocationTracking = (): void => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsLocationEnabled(false);
  };

  // 初期化処理
  useEffect(() => {
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermission();
      
      if (hasPermission) {
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
  }, []);

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