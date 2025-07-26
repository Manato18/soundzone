import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView from 'react-native-maps';
import AudioPlayerModal from '../../../../components/AudioPlayerModal';
import { AudioPinMarkers } from '../../audioPin/presentation/components/AudioPinMarkers';
import { useAudioPins } from '../../audioPin/presentation/hooks/useAudioPins';
import { LayerSelector } from '../../layers/presentation/components/LayerSelector';
import { useLayerSelection } from '../../layers/presentation/hooks/useLayerSelection';
import { useLocationContext } from '../../location/presentation/hooks/useLocationContext';
import { LocationButton } from '../../map/presentation/components/LocationButton';
import { MapContainer } from '../../map/presentation/components/MapContainer';
import { useMapRegion } from '../../map/presentation/hooks/useMapRegion';
import { useMapWithLocation } from '../../map/presentation/hooks/useMapWithLocation';
import { useMapFollowing } from '../../map/presentation/hooks/useMapFollowing';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  // 各ドメインのhookを使用
  const { stableLocation, errorMsg } = useLocationContext();
  const { region, updateRegion } = useMapRegion();
  const { centerOnUserLocation } = useMapWithLocation(mapRef);
  const { isFollowingUser } = useMapFollowing();
  const { layers, selectedLayerIds, toggleLayer, getSelectedLayerIds } = useLayerSelection();
  
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
        selectedLayerIds={selectedLayerIds}
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