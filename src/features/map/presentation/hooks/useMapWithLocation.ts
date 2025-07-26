import { useEffect, useRef, useCallback, useMemo } from 'react';
import MapView from 'react-native-maps';
import { useStableLocation } from '../../../location/application/location-store';
import { UserLocationData } from '../../../location/domain/entities/Location';
import { useMapStore } from '../../application/map-store';

/**
 * 地図と位置情報の連携フック
 * 位置情報の更新に応じて地図を自動的に追従させる
 */
export const useMapWithLocation = (mapRef: React.RefObject<MapView | null>) => {
  const region = useMapStore((state) => state.region);
  const updateRegion = useMapStore((state) => state.updateRegion);
  const isFollowingUser = useMapStore((state) => state.isFollowingUser);
  const setIsFollowingUser = useMapStore((state) => state.setIsFollowingUser);
  
  const stableLocation = useStableLocation();
  const previousLocationRef = useRef<UserLocationData | null>(null);
  const regionRef = useRef(region);
  regionRef.current = region;
  
  // 地図更新関数をメモ化
  const updateMapRegion = useCallback((location: UserLocationData) => {
    if (!mapRef.current) return;
    
    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: regionRef.current.latitudeDelta,
      longitudeDelta: regionRef.current.longitudeDelta,
    };
    
    // アニメーション付きで地図を移動
    mapRef.current.animateToRegion(newRegion, 500); // 0.5秒アニメーション（バランス重視）
    updateRegion(newRegion);
    
    if (__DEV__) {
      console.log(`[MapWithLocation] 地図更新:`, {
        lat: newRegion.latitude.toFixed(6),
        lng: newRegion.longitude.toFixed(6),
      });
    }
  }, [updateRegion]);
  
  // 位置情報が更新された時の処理
  useEffect(() => {
    if (!stableLocation || !isFollowingUser) {
      return;
    }
    
    // 位置が変わった場合のみ地図を更新
    const prevLocation = previousLocationRef.current;
    if (
      !prevLocation ||
      prevLocation.coords.latitude !== stableLocation.coords.latitude ||
      prevLocation.coords.longitude !== stableLocation.coords.longitude
    ) {
      updateMapRegion(stableLocation);
      previousLocationRef.current = stableLocation;
    }
  }, [stableLocation, isFollowingUser, updateMapRegion]);
  
  // 現在位置に移動する関数
  const centerOnUserLocation = useCallback(() => {
    if (stableLocation) {
      updateMapRegion(stableLocation);
      setIsFollowingUser(true);
    }
  }, [stableLocation, updateMapRegion, setIsFollowingUser]);
  
  // コンポーネントのアンマウント時にrefをクリア
  useEffect(() => {
    return () => {
      previousLocationRef.current = null;
    };
  }, []);
  
  // 戻り値をメモ化
  return useMemo(() => ({
    centerOnUserLocation,
    isFollowingUser,
  }), [centerOnUserLocation, isFollowingUser]);
};