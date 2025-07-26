import React, { ReactNode, forwardRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import { UserLocationData } from '../../../location/domain/entities/Location';
import { MapRegion } from '../../domain/entities/MapRegion';
import { useMapFollowing } from '../hooks/useMapFollowing';
import { useMapSettings } from '../hooks/useMapSettings';
import { UserLocationMarker } from './UserLocationMarker';

interface MapContainerProps {
  region: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  userLocation: UserLocationData | null;
  children?: ReactNode;
}

export const MapContainer = forwardRef<MapView, MapContainerProps>(
  ({ region, onRegionChange, userLocation, children }, ref) => {
    // // デバッグ用：位置情報の変化を監視
    // React.useEffect(() => {
    //   if (userLocation?.coords) {
    //     console.log('Location update:', {
    //       lat: userLocation.coords.latitude,
    //       lng: userLocation.coords.longitude,
    //       heading: userLocation.coords.heading,
    //     });
    //   }
    // }, [userLocation]);
    
    const { mapType, showCompass, showScale } = useMapSettings();
    const { stopFollowing } = useMapFollowing();

    const handleRegionChange = useCallback((newRegion: MapRegion) => {
      // ユーザーが地図を動かしたら追従を停止
      stopFollowing();
      onRegionChange(newRegion);
      
      if (__DEV__) {
        console.log(`[MapContainer] 地図手動操作（追従停止）:`, {
          lat: newRegion.latitude.toFixed(6),
          lng: newRegion.longitude.toFixed(6),
        });
      }
    }, [stopFollowing, onRegionChange]);

    return (
      <MapView
        ref={ref}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={showCompass}
        showsScale={showScale}
        mapType={mapType}
        followsUserLocation={false}
        userLocationAnnotationTitle="現在位置"
        userLocationCalloutEnabled={true}
        rotateEnabled={true}
      >
        {/* 現在位置マーカー（メモ化されたコンポーネント） */}
        {userLocation && <UserLocationMarker location={userLocation} />}

        {/* 子コンポーネント（音声ピンマーカーなど） */}
        {children}
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
}); 