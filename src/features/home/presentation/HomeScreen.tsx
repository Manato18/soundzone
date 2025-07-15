import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import AudioPlayerModal from '../../../../components/AudioPlayerModal';
import { AudioPinMarkers } from '../../audioPin/presentation/components/AudioPinMarkers';
import { useAudioPins } from '../../audioPin/presentation/hooks/useAudioPins';
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
          pins={audioPins}
          onPinPress={handlePinPress}
        />
      </MapContainer>

      <LocationButton
        onPress={centerOnUserLocation}
        disabled={!location}
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