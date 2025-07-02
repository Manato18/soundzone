import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecordingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>録音画面</Text>
      <Text style={styles.subtitle}>音声録音とテキスト追加機能を実装予定</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
}); 