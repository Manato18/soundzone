import React, { ReactNode, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import { UserLocationData } from '../../../location/domain/entities/Location';
import { MapRegion } from '../../domain/entities/MapRegion';

interface MapContainerProps {
  region: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  userLocation: UserLocationData | null;
  children?: ReactNode;
}

export const MapContainer = forwardRef<MapView, MapContainerProps>(
  ({ region, onRegionChange, userLocation, children }, ref) => {
    return (
      <MapView
        ref={ref}
        style={styles.map}
        region={region}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        followsUserLocation={false}
        userLocationAnnotationTitle="現在位置"
        userLocationCalloutEnabled={true}
        rotateEnabled={true}
      >
        {/* 現在位置にシンプルなマーカーを表示 */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="現在位置"
            description={`精度: ${userLocation.coords.accuracy ? Math.round(userLocation.coords.accuracy) : '不明'}m`}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerContainer}>
              {/* 方向を示す扇形 */}
              {userLocation.coords.heading !== null && (
                <View style={[styles.headingIndicator, { transform: [{ rotate: `${userLocation.coords.heading}deg` }] }]}>
                  <Svg width="60" height="60" viewBox="0 0 60 60" style={styles.fanShape}>
                    <Path
                      d="M 30 30 L 30 5 A 25 25 0 0 1 47.5 12.5 Z"
                      fill="#007AFF"
                      fillOpacity={0.3}
                      stroke="#007AFF"
                      strokeWidth="1"
                      strokeOpacity={0.5}
                    />
                  </Svg>
                </View>
              )}
              {/* メインの青いドット */}
              <View style={styles.locationDot}>
                <View style={styles.innerDot} />
              </View>
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
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  headingIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanShape: {
    position: 'absolute',
  },
  locationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
}); 