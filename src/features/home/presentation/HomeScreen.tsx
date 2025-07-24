import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const { audioPins, selectedAudio, modalVisible, handlePinPress, handleCloseModal } = useAudioPins();
  const { region, updateRegion } = useMapRegion();
  
  // 最後の有効な位置情報を保持（チカチカ防止）
  const [stableLocation, setStableLocation] = useState(location);
  
  useEffect(() => {
    // locationが有効な値の場合のみ更新
    if (location && location.coords && location.coords.latitude && location.coords.longitude) {
      setStableLocation(location);
    }
  }, [location]);
  
  // レイヤー機能
  const { layers, toggleLayer, getSelectedLayerIds } = useLayerSelection();
  const { filteredPins } = useAudioPinFiltering({
    pins: audioPins,
    selectedLayerIds: getSelectedLayerIds(),
  });

  // 現在位置を中心に戻すハンドラー
  const centerOnUserLocation = () => {
    if (stableLocation && mapRef.current) {
      const newRegion = {
        latitude: stableLocation.coords.latitude,
        longitude: stableLocation.coords.longitude,
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
        userLocation={stableLocation}
      >
        <AudioPinMarkers
          pins={filteredPins}
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
}); 