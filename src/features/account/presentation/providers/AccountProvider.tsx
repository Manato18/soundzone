import React, { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import { useAccountProfile } from '../hooks/use-account';
import { useAccountFormStore } from '../../application/account-store';

// シンプルなContext値
interface AccountContextValue {
  hasCompletedProfile: boolean;
  isCheckingProfile: boolean;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

// シンプルなProvider実装（StateManagerは不要）
export const AccountProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  const { profileExists, hasCompletedProfile, isLoading } = useAccountProfile();
  const setHasCompletedProfile = useAccountFormStore((state) => state.setHasCompletedProfile);
  
  // プロフィール存在確認が完了したら状態を更新
  useEffect(() => {
    if (!isLoading && user?.emailVerified) {
      setHasCompletedProfile(profileExists);
    }
  }, [isLoading, profileExists, user?.emailVerified, setHasCompletedProfile]);
  
  // エラーハンドリング（シンプルに）
  const handleError = (error: Error) => {
    if (error.message.includes('ネットワーク')) {
      Alert.alert('通信エラー', 'インターネット接続を確認してください', [{ text: 'OK' }]);
    }
  };
  
  const value: AccountContextValue = {
    hasCompletedProfile,
    isCheckingProfile: isLoading,
  };
  
  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};

// カスタムフック
export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountContext must be used within AccountProvider');
  }
  return context;
};