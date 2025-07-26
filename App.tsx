import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import 'react-native-gesture-handler';

import { queryClient } from './src/shared/presenter/queries/queryClient';
import RootNavigator from './src/navigation/RootNavigator';
import { AppInitializer } from './src/shared/infra/initialization/appInitializer';
import { AuthProvider } from './src/features/auth/presentation/providers';
import { LayersProvider } from './src/features/layers/presentation/providers/LayersProvider';
import { LocationProvider } from './src/features/location/presentation/providers/LocationProvider';

export default function App() {
  const [loaded] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        await AppInitializer.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // エラーハンドリング: アプリを続行させるか、エラー画面を表示
        setIsInitialized(true);
      }
    }
    initApp();
  }, []);

  if (!loaded || !isInitialized) {
    // フォントローディング中または初期化中
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <LayersProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </LayersProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
} 