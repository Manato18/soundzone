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
  const { isAuthenticated, isLoading, authStatusDetails } = useAuth();
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
        } else if (event === 'TOKEN_REFRESHED') {
          // トークン更新時も最新情報を取得
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
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
  // 1. 未認証: AuthNavigator（ログイン・新規登録）
  // 2. メール認証待ち: EmailVerificationScreen（直接表示）
  // 3. 認証完了: AppNavigator（メインアプリ）
  
  console.log('Current auth status:', {
    isAuthenticated,
    isSignedIn: authStatusDetails.isSignedIn,
    isEmailVerified: authStatusDetails.isEmailVerified,
    needsEmailVerification: authStatusDetails.needsEmailVerification,
  });

  if (!authStatusDetails.isSignedIn) {
    // 未認証状態 → AuthNavigator
    console.log('Showing AuthNavigator - user not signed in');
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (authStatusDetails.needsEmailVerification) {
    // メール認証待ち状態 → EmailVerificationScreen（直接表示）
    console.log('Showing EmailVerificationScreen - needs email verification');
    // Note: この実装では、EmailVerificationScreenを単体で表示
    // 実際の実装では、NavigatorでWrapするか、AuthNavigatorに統合する
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 認証完了状態 → AppNavigator
  console.log('Showing AppNavigator - user authenticated and verified');
  return (
    <NavigationContainer>
      <AppNavigator />
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