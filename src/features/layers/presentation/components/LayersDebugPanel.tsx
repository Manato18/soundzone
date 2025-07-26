import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLayerSelection } from '../hooks/useLayerSelection';
import { useLayersStore } from '../../application/layers-store';

/**
 * レイヤー機能のデバッグパネル
 * 開発時の動作確認用（本番環境では非表示）
 */
export const LayersDebugPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    layers,
    selectedLayerIds,
    toggleLayer,
    toggleAllLayers,
  } = useLayerSelection();

  const isLoading = useLayersStore((state) => state.isLoading);
  const error = useLayersStore((state) => state.error);

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.headerText}>
          🔧 Layers Debug ({selectedLayerIds.length}/{layers.length})
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {/* 状態表示 */}
          <View style={styles.statusSection}>
            <Text style={styles.statusText}>
              Loading: {isLoading ? '⌛' : '✅'} | 
              Error: {error ? '❌' : '✅'}
            </Text>
          </View>

          {/* クイックアクション */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleAllLayers(true)}
            >
              <Text>全選択</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleAllLayers(false)}
            >
              <Text>全解除</Text>
            </TouchableOpacity>
          </View>

          {/* レイヤーリスト */}
          <View style={styles.layersList}>
            {layers.slice(0, 5).map((layer) => {
              const isSelected = selectedLayerIds.includes(layer.id);
              return (
                <TouchableOpacity
                  key={layer.id}
                  style={[
                    styles.layerItem,
                    isSelected && styles.layerItemSelected,
                  ]}
                  onPress={() => toggleLayer(layer.id)}
                >
                  <Text style={styles.layerText}>
                    {layer.name} {isSelected && '✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {layers.length > 5 && (
              <Text style={styles.moreText}>他 {layers.length - 5} 件...</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  header: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    padding: 10,
  },
  statusSection: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 11,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  actionButton: {
    padding: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  layersList: {
    maxHeight: 150,
  },
  layerItem: {
    padding: 5,
    marginBottom: 2,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  layerItemSelected: {
    backgroundColor: '#d0f0d0',
  },
  layerText: {
    fontSize: 11,
  },
  moreText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});