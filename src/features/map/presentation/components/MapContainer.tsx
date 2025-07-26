import React, { ReactNode, forwardRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import { UserLocationData } from '../../../location/domain/entities/Location';
import { MapRegion } from '../../domain/entities/MapRegion';
import { useMapFollowing } from '../hooks/useMapFollowing';
import { useMapSettings } from '../hooks/useMapSettings';

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
        {/* 現在位置にシンプルなマーカーを表示 */}
        {userLocation && 
         userLocation.coords && 
         typeof userLocation.coords.latitude === 'number' && 
         typeof userLocation.coords.longitude === 'number' &&
         !isNaN(userLocation.coords.latitude) && 
         !isNaN(userLocation.coords.longitude) && (
          <Marker
            key="user-location-marker"
            identifier="user-location"
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="現在位置"
            description={`精度: ${userLocation.coords.accuracy ? Math.round(userLocation.coords.accuracy) : '不明'}m`}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            flat={true}
          >
            <View style={styles.markerContainer}>
              <Svg width="60" height="60" viewBox="0 0 60 60">
                {/* 方向を示す扇形（SVG内でtransformを処理） */}
                {userLocation.coords.heading !== null && (
                  <Path
                    d="M 30 30 L 30 5 A 25 25 0 0 1 47.5 12.5 Z"
                    fill="#007AFF"
                    fillOpacity={0.3}
                    stroke="#007AFF"
                    strokeWidth="1"
                    strokeOpacity={0.5}
                    transform={`rotate(${userLocation.coords.heading} 30 30)`}
                  />
                )}
                
                {/* 外側の白い円（影を作る） */}
                <Circle
                  cx="30"
                  cy="30"
                  r="13"
                  fill="white"
                />
                
                {/* メインの青い円 */}
                <Circle
                  cx="30"
                  cy="30"
                  r="10"
                  fill="#007AFF"
                  stroke="white"
                  strokeWidth="3"
                />
                
                {/* 内側の白い円 */}
                <Circle
                  cx="30"
                  cy="30"
                  r="4"
                  fill="white"
                />
              </Svg>
            </View>
          </Marker>
        )}

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
  markerContainer: {
    width: 60,
    height: 60,
  },
}); 