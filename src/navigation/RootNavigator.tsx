import { NavigationContainer } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presenter/hooks/useAuth';
import { queryKeys } from '../shared/presenter/queries/queryClient';
import { supabase } from '../shared/services/supabase';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Supabaseの認証状態変更を監視
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            // サインアウト時はキャッシュをクリア
            console.log('Clearing auth cache due to sign out');
            queryClient.setQueryData(queryKeys.auth.user(), null);
            queryClient.setQueryData(queryKeys.auth.session(), null);
            queryClient.removeQueries({ queryKey: queryKeys.auth.all });
          }
          
          // 認証クエリを無効化して再取得
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        } else if (event === 'SIGNED_IN') {
          // サインイン時も認証クエリを無効化して最新情報を取得
          console.log('Invalidating auth cache due to sign in');
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        }
      }
    );

    // クリーンアップ
    return () => {
      subscription.unsubscribe();
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

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
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