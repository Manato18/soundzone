import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AudioPlayerModal from '../../../../components/AudioPlayerModal';

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

interface AudioData {
  id: string;
  title: string;
  userName: string;
  userImage: string;
  audioUrl: string;
  description: string;
  latitude: number;
  longitude: number;
}

// 京都付近の音声ピンデータ
const AUDIO_PINS: AudioData[] = [
  {
    id: '1',
    title: '1個目のピン',
    userName: 'Andrew Daniels',
    userImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin1.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0116,
    longitude: 135.7681, // 京都市中心部（京都駅付近）
  },
  {
    id: '2',
    title: '2個目のピン',
    userName: 'Sarah Johnson',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin2.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0395,
    longitude: 135.7290, // 清水寺付近
  },
  {
    id: '3',
    title: '3個目のピン',
    userName: 'Mike Chen',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin3.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0394,
    longitude: 135.7290, // 伏見稲荷付近
  },
];

export default function HomeScreen() {
  const [location, setLocation] = useState<UserLocationData | null>(null);
  const [region, setRegion] = useState<LocationData>({
    latitude: 35.0116, // 京都を初期表示
    longitude: 135.7681,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<AudioData | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // ピンタップ時のハンドラー
  const handlePinPress = (audioData: AudioData) => {
    console.log('handlePinPress called with:', audioData.title);
    setSelectedAudio(audioData);
    setModalVisible(true);
    console.log('Modal should be visible now');
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    console.log('handleCloseModal called');
    setModalVisible(false);
    setSelectedAudio(null);
  };

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
        {/* 現在位置にシンプルなマーカーを表示 */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="現在位置"
            description={`精度: ${location.coords.accuracy ? Math.round(location.coords.accuracy) : '不明'}m`}
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

        {/* 音声ピンマーカー */}
        {AUDIO_PINS.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
            title={pin.title}
            description={`${pin.userName}の音声`}
            onPress={() => {
              console.log('Pin pressed:', pin.title);
              handlePinPress(pin);
            }}
          >
            <Image
              source={require('../../../../assets/images/pin_icon.png')}
              style={styles.pinIcon}
              resizeMode="contain"
            />
          </Marker>
        ))}
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

      {/* 音声再生モーダル */}
      <AudioPlayerModal
        visible={modalVisible}
        onClose={handleCloseModal}
        audioData={selectedAudio}
      />
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
  pinIcon: {
    width: 40,
    height: 40,
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