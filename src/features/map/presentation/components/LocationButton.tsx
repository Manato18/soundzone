import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface LocationButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const LocationButton: React.FC<LocationButtonProps> = ({ onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={styles.locationButton}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons 
        name="locate" 
        size={24} 
        color={disabled ? "#999" : "#007AFF"} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
}); 