import React, { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import { useAccountStore, useHasCompletedProfile } from '../../application/account-store';
import { accountStateManager, AccountError } from '../../infrastructure/services/accountStateManager';

// Context値の型定義
interface AccountContextValue {
  hasCompletedProfile: boolean;
  isCheckingProfile: boolean;
}

// Context作成
const AccountContext = createContext<AccountContextValue | undefined>(undefined);

// Provider実装
export const AccountProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const hasCompletedProfile = useHasCompletedProfile();
  const setHasCompletedProfile = useAccountStore((state) => state.setHasCompletedProfile);
  
  // 無限ループ防止用のフラグ
  const isInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  
  // プロフィールチェック中の状態
  const [isCheckingProfile, setIsCheckingProfile] = React.useState(false);

  // エラーハンドリングの設定
  useEffect(() => {
    accountStateManager.setErrorCallback((error: AccountError) => {
      // エラータイプに応じてユーザーへのフィードバック
      switch (error.code) {
        case 'PROFILE_NOT_FOUND':
          // プロフィール未作成は正常な状態なのでアラート不要
          break;
        case 'PROFILE_CREATE_FAILED':
        case 'PROFILE_UPDATE_FAILED':
          Alert.alert('エラー', error.message, [{ text: 'OK' }]);
          break;
        case 'AVATAR_UPLOAD_FAILED':
          Alert.alert('アップロードエラー', error.message, [{ text: 'OK' }]);
          break;
        case 'NETWORK_ERROR':
          Alert.alert('通信エラー', 'インターネット接続を確認してください', [{ text: 'OK' }]);
          break;
      }
    });
  }, []);

  // 認証状態の変化を監視してプロフィール状態を確認
  useEffect(() => {
    // 無限ループ防止: 同じユーザーIDで重複実行しない
    if (lastUserId.current === user?.id) {
      return;
    }

    // 認証済みでメール確認済みの場合
    if (isAuthenticated && user?.emailVerified) {
      lastUserId.current = user.id;
      
      // 初回のみプロフィール存在確認を行う
      if (!isInitialized.current) {
        isInitialized.current = true;
        setIsCheckingProfile(true);
        
        // accountStateManagerでプロフィール初期化
        accountStateManager.initializeProfile(user.id).finally(() => {
          setIsCheckingProfile(false);
        });
      }
    } else {
      // ログアウト時のリセット
      lastUserId.current = null;
      isInitialized.current = false;
      setIsCheckingProfile(false);
      
      // accountStateManagerのクリーンアップ
      if (!isAuthenticated) {
        accountStateManager.cleanup();
      }
    }
  }, [isAuthenticated, user?.id, user?.emailVerified]);

  // Auth機能からのログアウトイベントを監視
  useEffect(() => {
    const handleLogout = () => {
      // AccountストアをリセットしてAuth連携
      useAccountStore.getState().reset();
    };

    // Authストアの変更を監視（CentralizedStateManagement.mdのパターン）
    const unsubscribe = useAccountStore.subscribe(
      (state) => state.profile,
      (profile) => {
        if (!profile && lastUserId.current) {
          // プロフィールがnullになった = ログアウト
          handleLogout();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const value: AccountContextValue = {
    hasCompletedProfile,
    isCheckingProfile,
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