import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface LocationData {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface UserLocationData {
  coords: {
    latitude: number;
    longitude: number;
    heading: number | null;
    accuracy: number | null;
  };
}

export default function HomeScreen() {
  const [location, setLocation] = useState<UserLocationData | null>(null);
  const [region, setRegion] = useState<LocationData>({
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // 位置情報の許可を取得
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('位置情報の許可が必要です');
        Alert.alert(
          '位置情報の許可',
          '位置情報の許可が必要です。設定から許可してください。',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // 位置情報サービスが有効かチェック
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setErrorMsg('位置情報サービスが無効です');
        Alert.alert(
          '位置情報サービス',
          '位置情報サービスを有効にしてください。',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('位置情報許可エラー:', error);
      setErrorMsg('位置情報の許可取得でエラーが発生しました');
      return false;
    }
  };

  // 現在位置を取得
  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      });
      
      setLocation(currentLocation);
      
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      return currentLocation;
    } catch (error) {
      console.error('現在位置取得エラー:', error);
      setErrorMsg('現在位置の取得に失敗しました');
      return null;
    }
  };

  // 位置情報の監視を開始
  const startLocationTracking = async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // 2秒ごとに更新
          distanceInterval: 5, // 5m移動したら更新
        },
        (newLocation) => {
          setLocation(newLocation);
          // バックグラウンドでもregionを更新（中心は変更しない）
        }
      );
      
      setIsLocationEnabled(true);
    } catch (error) {
      console.error('位置情報監視エラー:', error);
      setErrorMsg('位置情報の監視開始に失敗しました');
    }
  };

  // 現在位置を中心に戻すボタンのハンドラー
  const centerOnUserLocation = () => {
    if (location && mapRef.current) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
    }
  };

  // 初期化処理
  useEffect(() => {
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermission();
      
      if (hasPermission) {
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          await startLocationTracking();
        }
      }
    };

    initializeLocation();

    // クリーンアップ
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // 画面がフォーカスされた時に現在位置を中心にする
  useEffect(() => {
    if (location && isLocationEnabled) {
      centerOnUserLocation();
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
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
        {/* 現在位置にカスタムマーカーを表示（方角も含む） */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="現在位置"
            description={`精度: ${location.coords.accuracy ? Math.round(location.coords.accuracy) : '不明'}m${
              location.coords.heading !== null 
                ? ` | 方角: ${Math.round(location.coords.heading)}°` 
                : ''
            }`}
            rotation={location.coords.heading || 0}
          >
            <View style={styles.markerContainer}>
              <View style={[
                styles.directionIndicator,
                { 
                  transform: [{ rotate: `${location.coords.heading || 0}deg` }] 
                }
              ]}>
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* 現在位置ボタン */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={centerOnUserLocation}
        disabled={!location}
      >
        <Ionicons 
          name="locate" 
          size={24} 
          color={location ? "#007AFF" : "#999"} 
        />
      </TouchableOpacity>

      {/* エラー表示 */}
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
}); 