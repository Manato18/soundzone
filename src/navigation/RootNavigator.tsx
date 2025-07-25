import { NavigationContainer } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/use-auth';
import { authStateManager } from '../features/auth/infra/services/authStateManager';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  // authStateManagerの初期化（アプリ起動時に一度だけ）
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authStateManager.initialize(queryClient);
        console.log('Auth state manager initialized');
      } catch (error) {
        console.error('Failed to initialize auth state manager:', error);
      }
    };

    initializeAuth();

    // クリーンアップ
    return () => {
      authStateManager.cleanup();
    };
  }, [queryClient]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 認証状態による画面分岐
  // 1. 未認証: AuthNavigator（ログイン・新規登録・メール認証）
  // 2. 認証完了: AppNavigator（メインアプリ）
  
  console.log('🔍 Current auth status:', {
    isAuthenticated,
    isLoading,
    user: user ? {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    } : null,
  });

  // メール認証完了済みの場合のみAppNavigatorに遷移
  const shouldShowApp = isAuthenticated && user?.emailVerified;
  
  console.log('🎯 Navigation decision:', {
    shouldShowApp,
    reason: shouldShowApp ? 'User is authenticated and email verified' : 
            !isAuthenticated ? 'User not authenticated' : 
            'Email not verified'
  });

  if (shouldShowApp) {
    // 認証完了状態 → AppNavigator
    console.log('✅ Showing AppNavigator - user authenticated and verified');
    return (
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );
  }

  // 未認証またはメール認証待ち状態 → AuthNavigator
  console.log('🔐 Showing AuthNavigator - user not authenticated or needs email verification');
  return (
    <NavigationContainer>
      <AuthNavigator />
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