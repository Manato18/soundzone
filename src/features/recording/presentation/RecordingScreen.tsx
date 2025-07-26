import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocationContext } from '../../location/presentation/hooks/useLocationContext';

export default function RecordingScreen() {
  const { location } = useLocationContext();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>録音画面</Text>
      <Text style={styles.subtitle}>音声録音とテキスト追加機能を実装予定</Text>
      
      {/* 位置情報表示セクション */}
      {location && location.coords && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationTitle}>現在の位置情報</Text>
          <Text style={styles.locationText}>
            緯度: {location.coords.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            経度: {location.coords.longitude.toFixed(6)}
          </Text>
          {location.coords.altitude !== null && (
            <Text style={styles.locationText}>
              高度: {location.coords.altitude.toFixed(1)}m
            </Text>
          )}
          {location.coords.accuracy !== null && (
            <Text style={styles.locationText}>
              精度: ±{location.coords.accuracy.toFixed(1)}m
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 250,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  locationText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontFamily: 'monospace',
  },
}); 