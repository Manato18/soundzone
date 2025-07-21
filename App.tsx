import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import 'react-native-gesture-handler';

import { queryClient } from './src/shared/presenter/queries/queryClient';
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
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
} 