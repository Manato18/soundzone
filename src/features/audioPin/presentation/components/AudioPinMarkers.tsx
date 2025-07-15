import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { AudioPin } from '../../domain/entities/AudioPin';

interface AudioPinMarkersProps {
  pins: AudioPin[];
  onPinPress: (pin: AudioPin) => void;
}

export const AudioPinMarkers: React.FC<AudioPinMarkersProps> = ({ pins, onPinPress }) => {
  return (
    <>
      {pins.map((pin) => (
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
            onPinPress(pin);
          }}
        >
          <Image
            source={require('../../../../../assets/images/pin_icon.png')}
            style={styles.pinIcon}
            resizeMode="contain"
          />
        </Marker>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  pinIcon: {
    width: 40,
    height: 40,
  },
}); 