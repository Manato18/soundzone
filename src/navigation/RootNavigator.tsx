import { NavigationContainer } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/use-auth';
import { AccountProvider, useAccountContext } from '../features/account/presentation/providers/AccountProvider';
import { IAuthUser } from '../shared/domain/interfaces/IAuthContext';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import ProfileCreationNavigator from './ProfileCreationNavigator';

// 内部ナビゲーターコンポーネント（AccountContext内で使用）
function InnerNavigator() {
  const { hasCompletedProfile, isCheckingProfile } = useAccountContext();
  
  React.useEffect(() => {
    console.log('🔷 [InnerNavigator] State:', { hasCompletedProfile, isCheckingProfile });
  }, [hasCompletedProfile, isCheckingProfile]);

  // ローディング中の表示
  if (isCheckingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 認証済み & メール確認済み & プロフィール未作成の場合
  if (!hasCompletedProfile) {
    return <ProfileCreationNavigator />;
  }

  // すべて完了している場合
  return <AppNavigator />;
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  // authStateManagerの初期化はAuthProviderで一元管理されるため、ここでは行わない

  // Auth情報をIAuthUser形式に変換（メモ化して参照を安定化）
  const authUser: IAuthUser | null = useMemo(() => {
    if (user && user.emailVerified) {
      return { id: user.id, email: user.email, emailVerified: user.emailVerified };
    }
    return null;
  }, [user?.id, user?.email, user?.emailVerified]);

  // ローディング中の表示
  if (isAuthLoading) {
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

  // 未認証の場合
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 認証済みだがメール未確認の場合
  if (!user?.emailVerified) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 認証済み & メール確認済みの場合はAccountProviderでラップ
  return (
    <NavigationContainer>
      <AccountProvider authUser={authUser}>
        <InnerNavigator />
      </AccountProvider>
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