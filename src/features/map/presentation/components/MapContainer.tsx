import React, { ReactNode, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
    width: 26,
    height: 26,
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