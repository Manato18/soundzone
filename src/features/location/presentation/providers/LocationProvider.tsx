import React, { createContext, useEffect, PropsWithChildren } from 'react';
import { locationStateManager } from '../../infrastructure/services/locationStateManager';
import { UserLocationData } from '../../domain/entities/Location';

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
  // 初期化
  useEffect(() => {
    // マウント時に位置情報サービスを初期化
    locationStateManager.initialize();

    // クリーンアップ
    return () => {
      locationStateManager.cleanup();
    };
  }, []);

  // Context値を返すためのゲッター関数
  // 注意: ここではuseLocationStoreを使用せず、locationStateManagerを通じてアクセス
  const getContextValue = (): LocationContextValue => {
    // locationStateManagerのメソッドをContext値として公開
    return {
      // 状態は後でuseLocationContextで取得するため、ここでは仮の値
      location: null,
      stableLocation: null,
      errorMsg: null,
      isLocationEnabled: false,
      isLoading: false,
      isTracking: false,
      
      // アクション（locationStateManagerのメソッドを委譲）
      getCurrentLocation: () => locationStateManager.getCurrentLocation(),
      startLocationTracking: () => locationStateManager.startLocationTracking(),
      stopLocationTracking: () => locationStateManager.stopLocationTracking(),
      requestLocationPermission: () => locationStateManager.requestLocationPermission(),
    };
  };

  return (
    <LocationContext.Provider value={getContextValue()}>
      {children}
    </LocationContext.Provider>
  );
};