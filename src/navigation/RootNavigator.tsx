import { NavigationContainer } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/use-auth';
import { queryKeys } from '../shared/presenter/queries/queryClient';
import { supabase } from '../shared/services/supabase';
import { sessionPersistence } from '../features/auth/infra/services/sessionPersistence';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  // Supabaseの認証状態変更を監視
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          // サインアウト時はキャッシュをクリア
          console.log('Clearing auth cache due to sign out');
          queryClient.setQueryData(queryKeys.auth.user(), null);
          queryClient.setQueryData(queryKeys.auth.session(), null);
          queryClient.removeQueries({ queryKey: queryKeys.auth.all });
          
          // 認証クエリを無効化して再取得
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        } else if (event === 'SIGNED_IN') {
          // サインイン時も認証クエリを無効化して最新情報を取得
          console.log('User signed in, invalidating auth queries');
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
          
          // セッションを永続化
          if (session) {
            await sessionPersistence.persistSession(session);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // トークン更新時も最新情報を取得
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
          
          // 更新されたセッションを永続化
          if (session) {
            await sessionPersistence.persistSession(session);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
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