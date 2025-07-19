import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presentation/AuthContext';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
}); 