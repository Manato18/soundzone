import React, { createContext, useEffect, PropsWithChildren } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { locationStateManager } from '../../infrastructure/services/locationStateManager';
import { UserLocationData, LocationError } from '../../domain/entities/Location';
import { 
  useCurrentLocation,
  useStableLocation,
  useLocationError,
  useIsLocationEnabled,
  useIsLocationLoading,
  useIsLocationTracking
} from '../../application/location-store';

/**
 * LocationContextの型定義
 */
export interface LocationContextValue {
  location: UserLocationData | null;
  stableLocation: UserLocationData | null;
  errorMsg: string | null;
  isLocationEnabled: boolean;
  isLoading: boolean;
  isTracking: boolean;
  
  // アクション
  getCurrentLocation: () => Promise<UserLocationData | null>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
  requestLocationPermission: () => Promise<boolean>;
}

/**
 * LocationContext
 */
export const LocationContext = createContext<LocationContextValue | undefined>(undefined);

/**
 * LocationProvider
 * StateManagement.mdの設計原則に基づく位置情報の一元管理Provider
 */
export const LocationProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Zustandストアから状態を取得
  const location = useCurrentLocation();
  const stableLocation = useStableLocation();
  const errorMsg = useLocationError();
  const isLocationEnabled = useIsLocationEnabled();
  const isLoading = useIsLocationLoading();
  const isTracking = useIsLocationTracking();
  
  // エラーハンドリング設定と初期化
  useEffect(() => {
    // エラーコールバックの設定
    locationStateManager.setErrorCallback((error: LocationError) => {
      // UIアラートをPresentation層で処理
      if (error.code === 'PERMISSION_DENIED') {
        Alert.alert(
          '位置情報の許可',
          '位置情報の許可が必要です。設定から許可してください。',
          [{ text: 'OK' }]
        );
      } else if (error.code === 'SERVICES_DISABLED') {
        Alert.alert(
          '位置情報サービス',
          '位置情報サービスを有効にしてください。',
          [{ text: 'OK' }]
        );
      }
    });
    
    // マウント時に位置情報サービスを初期化
    locationStateManager.initialize();

    // クリーンアップ
    return () => {
      locationStateManager.cleanup();
    };
  }, []);
  
  // AppStateの監視によるフォアグラウンド復帰時の処理
  useEffect(() => {
    let appStateSubscription: any;
    
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
        } else if (hasPermission && isLocationEnabled) {
          // 既に権限があり有効な場合は、位置情報を再取得
          locationStateManager.getCurrentLocation();
        }
      }
    };
    
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, [isLocationEnabled]);

  // Context値の生成
  const contextValue: LocationContextValue = {
    // ストアから取得した状態
    location,
    stableLocation,
    errorMsg,
    isLocationEnabled,
    isLoading,
    isTracking,
    
    // アクション（locationStateManagerのメソッドを委譲）
    getCurrentLocation: () => locationStateManager.getCurrentLocation(),
    startLocationTracking: () => locationStateManager.startLocationTracking(),
    stopLocationTracking: () => locationStateManager.stopLocationTracking(),
    requestLocationPermission: () => locationStateManager.requestLocationPermission(),
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};