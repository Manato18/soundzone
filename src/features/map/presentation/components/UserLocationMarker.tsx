import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import { UserLocationData } from '../../../location/domain/entities/Location';

interface UserLocationMarkerProps {
  location: UserLocationData;
}

export const UserLocationMarker = memo<UserLocationMarkerProps>(({ location }) => {
  if (!location?.coords || 
      typeof location.coords.latitude !== 'number' || 
      typeof location.coords.longitude !== 'number' ||
      isNaN(location.coords.latitude) || 
      isNaN(location.coords.longitude)) {
    return null;
  }

  const markerSize = 60; // 元のサイズに戻す

  return (
    <Marker
      key="user-location-marker"
      identifier="user-location"
      coordinate={{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }}
      title="現在位置"
      description={`精度: ${location.coords.accuracy ? Math.round(location.coords.accuracy) : '不明'}m`}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      flat={true}
    >
      <View style={[styles.markerContainer, { width: markerSize, height: markerSize }]}>
        <Svg width={markerSize} height={markerSize} viewBox={`0 0 ${markerSize} ${markerSize}`}>
          {/* 方向を示す扇形（SVG内でtransformを処理） */}
          {location.coords.heading !== null && location.coords.heading !== undefined && (
            <Path
              d="M 30 30 L 30 5 A 25 25 0 0 1 47.5 12.5 Z"
              fill="#007AFF"
              fillOpacity={0.3}
              stroke="#007AFF"
              strokeWidth="1"
              strokeOpacity={0.5}
              transform={`rotate(${location.coords.heading} 30 30)`}
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
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数：位置か方向が変わった場合のみ再レンダリング
  if (!prevProps.location?.coords || !nextProps.location?.coords) {
    return false;
  }
  
  return (
    prevProps.location.coords.latitude === nextProps.location.coords.latitude &&
    prevProps.location.coords.longitude === nextProps.location.coords.longitude &&
    prevProps.location.coords.heading === nextProps.location.coords.heading &&
    prevProps.location.coords.accuracy === nextProps.location.coords.accuracy
  );
});

UserLocationMarker.displayName = 'UserLocationMarker';

const styles = StyleSheet.create({
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});