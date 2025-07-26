import { useEffect, useRef } from 'react';
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
  
  // 位置情報が更新された時の処理
  useEffect(() => {
    if (!stableLocation || !isFollowingUser || !mapRef.current) {
      return;
    }
    
    // 位置が変わった場合のみ地図を更新
    const prevLocation = previousLocationRef.current;
    if (
      !prevLocation ||
      prevLocation.coords.latitude !== stableLocation.coords.latitude ||
      prevLocation.coords.longitude !== stableLocation.coords.longitude
    ) {
      const newRegion = {
        latitude: stableLocation.coords.latitude,
        longitude: stableLocation.coords.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      
      // アニメーション付きで地図を移動
      mapRef.current.animateToRegion(newRegion, 500); // 0.5秒アニメーション（バランス重視）
      updateRegion(newRegion);
      
      if (__DEV__) {
        console.log(`[MapWithLocation] 位置更新による地図追従:`, {
          lat: newRegion.latitude.toFixed(6),
          lng: newRegion.longitude.toFixed(6),
        });
      }
      
      previousLocationRef.current = stableLocation;
    }
  }, [stableLocation, isFollowingUser, region.latitudeDelta, region.longitudeDelta, updateRegion, mapRef]);
  
  // 現在位置に移動する関数
  const centerOnUserLocation = () => {
    if (stableLocation && mapRef.current) {
      const newRegion = {
        latitude: stableLocation.coords.latitude,
        longitude: stableLocation.coords.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      
      mapRef.current.animateToRegion(newRegion, 500); // 0.5秒アニメーション（バランス重視）
      updateRegion(newRegion);
      setIsFollowingUser(true);
      
      if (__DEV__) {
        console.log(`[MapWithLocation] 現在位置ボタンタップ:`, {
          lat: newRegion.latitude.toFixed(6),
          lng: newRegion.longitude.toFixed(6),
        });
      }
    }
  };
  
  // コンポーネントのアンマウント時にrefをクリア
  useEffect(() => {
    return () => {
      previousLocationRef.current = null;
    };
  }, []);
  
  return {
    centerOnUserLocation,
    isFollowingUser,
  };
};