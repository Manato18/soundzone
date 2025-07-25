import React, { useEffect, useRef, PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authStateManager } from '../../infra/services/authStateManager';
import { sessionRestoration } from '../../infra/services/sessionRestoration';
import { useAuthStore } from '../../application/auth-store';
import { Alert } from 'react-native';

/**
 * AuthProvider
 * アプリケーションレベルで認証状態を一元管理するProvider
 * 
 * 責務:
 * - アプリケーション起動時のセッション復元
 * - 認証状態変更の監視とストア同期
 * - トークンの自動更新管理
 * - ログアウト時の全データクリア
 * 
 * LayersProviderと同様のパターンで実装し、一貫性を保つ
 */
export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const isInitializedRef = useRef(false);
  const isRestoringRef = useRef(false);

  // 初回マウント時の初期化処理
  useEffect(() => {
    let isMounted = true;
    
    if (isInitializedRef.current) {
      return;
    }

    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth...');
        
        // 1. まずセッション復元を試みる（authStateManager初期化前に実行）
        if (!isRestoringRef.current && isMounted) {
          isRestoringRef.current = true;
          const restored = await sessionRestoration.restoreSession();
          
          if (restored && isMounted) {
            console.log('[AuthProvider] Session restored successfully');
          } else if (isMounted) {
            console.log('[AuthProvider] No session to restore');
          }
          isRestoringRef.current = false;
        }
        
        // 2. セッション復元後にauthStateManagerを初期化
        // これにより、復元されたセッションがある場合は正しく認識される
        await authStateManager.initialize(queryClient);
        
        if (isMounted) {
          isInitializedRef.current = true;
          console.log('[AuthProvider] Auth initialization completed');
        }
      } catch (error) {
        if (isMounted) {
          console.error('[AuthProvider] Failed to initialize auth:', error);
          
          // 初期化エラーをユーザーに通知（開発環境のみ）
          if (process.env.NODE_ENV === 'development') {
            Alert.alert(
              '認証初期化エラー',
              'アプリの認証機能の初期化に失敗しました。アプリを再起動してください。'
            );
          }
        }
      }
    };

    initializeAuth();

    // クリーンアップ処理
    return () => {
      isMounted = false;
      console.log('[AuthProvider] Cleaning up...');
      authStateManager.cleanup();
      isInitializedRef.current = false;
    };
  }, [queryClient]);

  // 開発環境でのデバッグ情報
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const unsubscribe = useAuthStore.subscribe((state) => {
        console.log('[AuthProvider] Auth state changed:', {
          isAuthenticated: state.isAuthenticated,
          userId: state.user?.id,
          authProcessState: state.authProcessState,
        });
      });

      return unsubscribe;
    }
  }, []);

  // セッション復元中の表示制御
  // LayersProviderと異なり、認証は必須ではないため、
  // 復元中でも子コンポーネントをレンダリングする
  return <>{children}</>;
};