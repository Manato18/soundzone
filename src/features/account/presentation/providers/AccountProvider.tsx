import React, { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAccountStore, useHasCompletedProfile } from '../../application/account-store';
import { accountStateManager, AccountError } from '../../infrastructure/services/accountStateManager';
import { IAuthUser } from '../../../../shared/domain/interfaces/IAuthContext';

// Context値の型定義
interface AccountContextValue {
  hasCompletedProfile: boolean;
  isCheckingProfile: boolean;
  authUser: IAuthUser | null;
}

// Context作成
const AccountContext = createContext<AccountContextValue | undefined>(undefined);

// Provider Props
interface AccountProviderProps extends PropsWithChildren {
  authUser: IAuthUser | null;
}

// Provider実装
export const AccountProvider: React.FC<AccountProviderProps> = ({ children, authUser }) => {
  const hasCompletedProfile = useHasCompletedProfile();
  const setHasCompletedProfile = useAccountStore((state) => state.setHasCompletedProfile);
  
  // 無限ループ防止用のフラグ
  const isInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const initPromise = useRef<Promise<void> | null>(null);
  
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

    // authUserが存在する場合（認証済みでメール確認済み）
    if (authUser && authUser.emailVerified) {
      // 無限ループ防止: 同じユーザーIDで重複実行しない
      if (lastUserId.current === authUser.id && isInitialized.current) {
        return;
      }

      // 初期化中の場合は待機
      if (initPromise.current) {
        return;
      }

      lastUserId.current = authUser.id;
      setIsCheckingProfile(true);
      
      // accountStateManagerでプロフィール初期化
      initPromise.current = accountStateManager.initializeProfile(authUser.id)
        .finally(() => {
          setIsCheckingProfile(false);
          isInitialized.current = true;
          initPromise.current = null;
        });
    } else if (!authUser && lastUserId.current) {
      // ログアウト時のリセット
      lastUserId.current = null;
      isInitialized.current = false;
      initPromise.current = null;
      setIsCheckingProfile(false);
      
      // accountStateManagerのクリーンアップ
      accountStateManager.cleanup();
    }
  }, [authUser]);

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (initPromise.current) {
        initPromise.current = null;
      }
    };
  }, []);

  const value: AccountContextValue = {
    hasCompletedProfile,
    isCheckingProfile,
    authUser,
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