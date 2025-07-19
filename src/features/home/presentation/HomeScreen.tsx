import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import AudioPlayerModal from '../../../../components/AudioPlayerModal';
import { AudioPinMarkers } from '../../audioPin/presentation/components/AudioPinMarkers';
import { useAudioPinFiltering } from '../../audioPin/presentation/hooks/useAudioPinFiltering';
import { useAudioPins } from '../../audioPin/presentation/hooks/useAudioPins';
import { LayerSelector } from '../../layers/presentation/components/LayerSelector';
import { useLayerSelection } from '../../layers/presentation/hooks/useLayerSelection';
import { useLocation } from '../../location/presentation/hooks/useLocation';
import { LocationButton } from '../../map/presentation/components/LocationButton';
import { MapContainer } from '../../map/presentation/components/MapContainer';
import { useMapRegion } from '../../map/presentation/hooks/useMapRegion';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  // 各ドメインのhookを使用
  const { location, errorMsg } = useLocation();
  const { 
    audioPins, 
    selectedAudio, 
    modalVisible, 
    isLoading, 
    error: audioPinError,
    handlePinPress, 
    handleCloseModal,
    refreshPins
  } = useAudioPins();
  const { region, updateRegion } = useMapRegion();
  
  // レイヤー機能
  const { layers, toggleLayer, getSelectedLayerIds } = useLayerSelection();
  const { filteredPins } = useAudioPinFiltering({
    pins: audioPins,
    selectedLayerIds: getSelectedLayerIds(),
  });

  // 現在位置を中心に戻すハンドラー
  const centerOnUserLocation = () => {
    if (location && mapRef.current) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      
      mapRef.current.animateToRegion(newRegion, 1000);
      updateRegion(newRegion);
    }
  };

  return (
    <View style={styles.container}>
      <MapContainer
        ref={mapRef}
        region={region}
        onRegionChange={updateRegion}
        userLocation={location}
      >
        <AudioPinMarkers
          pins={filteredPins}
          onPinPress={handlePinPress}
        />
      </MapContainer>

      {/* オーディオピン読み込み中のインジケーター */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4a9eff" />
        </View>
      )}

      <LayerSelector
        layers={layers}
        onLayerToggle={toggleLayer}
      />

      <LocationButton
        onPress={centerOnUserLocation}
        disabled={!location}
      />

      {/* 位置情報エラーの表示 */}
      <ErrorDisplay errorMsg={errorMsg} />

      {/* オーディオピンエラーの表示 */}
      {audioPinError && (
        <ErrorDisplay 
          errorMsg={`音声ピンの読み込みエラー: ${audioPinError}`}
          onRetry={refreshPins}
        />
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
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
}); 