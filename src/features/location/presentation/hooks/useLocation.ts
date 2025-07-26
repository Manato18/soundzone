import { useLocationContext } from './useLocationContext';

/**
 * 既存のuseLocationインターフェースを維持するラッパーフック
 * 内部ではuseLocationContextを使用し、一元管理された位置情報を提供
 * 
 * @deprecated 新しいコードではuseLocationContextを直接使用してください
 */
export const useLocation = () => {
  const context = useLocationContext();
  
  // 既存のインターフェースに合わせて返す
  return {
    location: context.location,
    errorMsg: context.errorMsg,
    isLocationEnabled: context.isLocationEnabled,
    getCurrentLocation: context.getCurrentLocation,
    startLocationTracking: context.startLocationTracking,
    stopLocationTracking: context.stopLocationTracking,
    requestLocationPermission: context.requestLocationPermission,
  };
};