import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import 'react-native-gesture-handler';

import { AuthProvider } from './src/features/auth/presentation/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [loaded] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // フォントローディング中
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
} 