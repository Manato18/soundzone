import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLayerSelection } from './hooks/useLayerSelection';

export default function LayersScreen() {
  const { layers, selectedLayerIds, toggleLayer, toggleAllLayers } = useLayerSelection();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>レイヤー管理</Text>
        <Text style={styles.subtitle}>表示するレイヤーを選択してください</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.controlSection}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => toggleAllLayers(true)}
          >
            <Text style={styles.controlButtonText}>すべて選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.controlButtonSecondary]}
            onPress={() => toggleAllLayers(false)}
          >
            <Text style={[styles.controlButtonText, styles.controlButtonTextSecondary]}>
              すべて解除
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.layersSection}>
          {layers.map((layer) => {
            const isSelected = selectedLayerIds.includes(layer.id);
            return (
            <TouchableOpacity
              key={layer.id}
              style={[
                styles.layerCard,
                isSelected && { borderColor: layer.color, borderWidth: 2 }
              ]}
              onPress={() => toggleLayer(layer.id)}
            >
              <View style={styles.layerHeader}>
                <View style={styles.layerIcon}>
                  <Ionicons
                    name={layer.icon as any}
                    size={24}
                    color={isSelected ? layer.color : '#666'}
                  />
                </View>
                <View style={styles.layerInfo}>
                  <Text style={[
                    styles.layerName,
                    isSelected && { color: layer.color }
                  ]}>
                    {layer.name}
                  </Text>
                  <Text style={styles.layerDescription}>
                    {layer.description}
                  </Text>
                </View>
                <View style={styles.layerToggle}>
                  <View style={[
                    styles.toggle,
                    isSelected && { backgroundColor: layer.color }
                  ]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  controlSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  controlButtonTextSecondary: {
    color: '#007AFF',
  },
  layersSection: {
    padding: 16,
    gap: 12,
  },
  layerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  layerDescription: {
    fontSize: 14,
    color: '#666',
  },
  layerToggle: {
    marginLeft: 12,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 