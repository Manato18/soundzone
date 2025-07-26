import { useContext } from 'react';
import { LocationContext } from '../providers/LocationProvider';
import { 
  useCurrentLocation, 
  useStableLocation, 
  useLocationError, 
  useIsLocationEnabled, 
  useIsLocationLoading,
  useIsLocationTracking 
} from '../../application/location-store';

/**
 * LocationContextを使用するためのフック
 * StateManagement.mdの設計原則に基づき、Contextとストアの状態を統合
 */
export const useLocationContext = () => {
  const context = useContext(LocationContext);
  
  if (!context) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }

  // Zustandストアから最新の状態を取得
  const location = useCurrentLocation();
  const stableLocation = useStableLocation();
  const errorMsg = useLocationError();
  const isLocationEnabled = useIsLocationEnabled();
  const isLoading = useIsLocationLoading();
  const isTracking = useIsLocationTracking();

  // Contextのアクションとストアの状態を結合
  return {
    ...context,
    // ストアから取得した最新の状態で上書き
    location,
    stableLocation,
    errorMsg,
    isLocationEnabled,
    isLoading,
    isTracking,
  };
};