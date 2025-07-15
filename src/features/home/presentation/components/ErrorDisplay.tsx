import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ErrorDisplayProps {
  errorMsg: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorMsg }) => {
  if (!errorMsg) return null;

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{errorMsg}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
}); 