import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorDisplayProps {
  errorMsg: string | null;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorMsg, onRetry }) => {
  if (!errorMsg) return null;

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{errorMsg}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      )}
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
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 