import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView from 'react-native-maps';
import AudioPlayerModal from '../../../../components/AudioPlayerModal';
import { AudioPinMarkers } from '../../audioPin/presentation/components/AudioPinMarkers';
import { useAudioPins } from '../../audioPin/presentation/hooks/useAudioPins';
import { LayerSelector } from '../../layers/presentation/components/LayerSelector';
import { useLayerSelection } from '../../layers/presentation/hooks/useLayerSelection';
import { useLocation } from '../../location/presentation/hooks/useLocation';
import { LocationButton } from '../../map/presentation/components/LocationButton';
import { MapContainer } from '../../map/presentation/components/MapContainer';
import { useMapRegion } from '../../map/presentation/hooks/useMapRegion';
import { useMapWithLocation } from '../../map/presentation/hooks/useMapWithLocation';
import { useMapFollowing } from '../../map/presentation/hooks/useMapFollowing';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  // 各ドメインのhookを使用
  const { location, errorMsg } = useLocation();
  const { region, updateRegion } = useMapRegion();
  const { centerOnUserLocation } = useMapWithLocation(mapRef);
  const { isFollowingUser } = useMapFollowing();
  const { layers, toggleLayer, getSelectedLayerIds } = useLayerSelection();
  
  // 最後の有効な位置情報を保持（チカチカ防止）
  const [stableLocation, setStableLocation] = useState(location);
  
  useEffect(() => {
    // locationが有効な値の場合のみ更新
    // 緯度・経度が有効な数値であることを確認
    if (location && 
        location.coords && 
        typeof location.coords.latitude === 'number' && 
        typeof location.coords.longitude === 'number' &&
        !isNaN(location.coords.latitude) && 
        !isNaN(location.coords.longitude)) {
      setStableLocation(location);
    }
  }, [location]);
  
  // オーディオピン機能（選択されたレイヤーでフィルタリング）
  const { 
    audioPins, 
    selectedAudio, 
    modalVisible, 
    handlePinPress, 
    handleCloseModal,
    isLoading,
    error
  } = useAudioPins({
    layerIds: getSelectedLayerIds(),
  });

  return (
    <View style={styles.container}>
      <MapContainer
        ref={mapRef}
        region={region}
        onRegionChange={updateRegion}
        userLocation={stableLocation}
      >
        <AudioPinMarkers
          pins={audioPins}
          onPinPress={handlePinPress}
        />
      </MapContainer>

      <LayerSelector
        layers={layers}
        onLayerToggle={toggleLayer}
      />

      <LocationButton
        onPress={centerOnUserLocation}
        disabled={!stableLocation}
      />

      {/* デバッグ用：追従状態の表示 */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            追従: {isFollowingUser ? 'ON' : 'OFF'}
          </Text>
        </View>
      )}

      <ErrorDisplay errorMsg={errorMsg} />

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
  debugInfo: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 