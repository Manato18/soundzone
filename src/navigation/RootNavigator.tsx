import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/use-auth';
import { useAccount } from '../features/account/presentation/hooks/use-account';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import ProfileCreationNavigator from './ProfileCreationNavigator';

export default function RootNavigator() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { hasCompletedProfile, isCheckingProfile } = useAccount();

  // authStateManagerの初期化はAuthProviderで一元管理されるため、ここでは行わない

  // ローディング中の表示
  if (isAuthLoading || (isAuthenticated && user?.emailVerified && isCheckingProfile)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 認証状態による画面分岐
  // 1. 未認証: AuthNavigator（ログイン・新規登録・メール認証）
  // 2. 認証済み & メール未確認: AuthNavigator（メール認証画面）
  // 3. 認証済み & メール確認済み & プロフィール未作成: ProfileCreationNavigator
  // 4. 認証済み & メール確認済み & プロフィール作成済み: AppNavigator
  
  console.log('🔍 Current auth & account status:', {
    isAuthenticated,
    isAuthLoading,
    isCheckingProfile,
    hasCompletedProfile,
    user: user ? {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    } : null,
  });

  // 未認証の場合
  if (!isAuthenticated) {
    console.log('🔐 Showing AuthNavigator - user not authenticated');
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 認証済みだがメール未確認の場合
  if (!user?.emailVerified) {
    console.log('📧 Showing AuthNavigator - email not verified');
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 認証済み & メール確認済み & プロフィール未作成の場合
  if (!hasCompletedProfile) {
    console.log('👤 Showing ProfileCreationNavigator - profile not completed');
    return (
      <NavigationContainer>
        <ProfileCreationNavigator />
      </NavigationContainer>
    );
  }

  // すべて完了している場合
  console.log('✅ Showing AppNavigator - all requirements met');
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