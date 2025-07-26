import React, { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import { useAccountStore, useHasCompletedProfile } from '../../application/account-store';

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
      // 実際のプロフィール取得はProfileCreationScreenで行う
      if (!isInitialized.current) {
        isInitialized.current = true;
        setIsCheckingProfile(true);
        
        // TODO: 実際のプロフィール存在確認APIを実装後、ここで確認
        // 現時点では新規登録時は必ずfalseとして扱う
        setTimeout(() => {
          setIsCheckingProfile(false);
        }, 100);
      }
    } else {
      // ログアウト時のリセット
      lastUserId.current = null;
      isInitialized.current = false;
      setIsCheckingProfile(false);
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