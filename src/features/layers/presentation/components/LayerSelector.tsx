import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Layer } from '../../domain/entities/Layer';

interface LayerSelectorProps {
  layers: Layer[];
  onLayerToggle: (layerId: string) => void;
}

export const LayerSelector: React.FC<LayerSelectorProps> = ({ layers, onLayerToggle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>レイヤー</Text>
      {layers.map((layer) => (
        <TouchableOpacity
          key={layer.id}
          style={[
            styles.layerItem,
            layer.isSelected && { backgroundColor: '#E8E8E8' }
          ]}
          onPress={() => onLayerToggle(layer.id)}
          activeOpacity={0.7}
        >
          <View style={styles.layerContent}>
            <Ionicons
              name={layer.icon as any}
              size={20}
              color={layer.isSelected ? layer.color : '#666'}
              style={styles.icon}
            />
            <Text style={[
              styles.layerName,
              layer.isSelected && { color: layer.color, fontWeight: '600' }
            ]}>
              {layer.name}
            </Text>
          </View>
          {layer.isSelected && (
            <View style={[styles.selectedIndicator, { backgroundColor: layer.color }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  layerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  layerName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  selectedIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    position: 'absolute',
    right: 2,
  },
}); 