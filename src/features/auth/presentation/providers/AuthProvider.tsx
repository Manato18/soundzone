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
  const initializationStateRef = useRef<'idle' | 'initializing' | 'initialized'>('idle');

  // 初回マウント時の初期化処理
  useEffect(() => {
    let isMounted = true;
    
    if (isInitializedRef.current) {
      return;
    }

    const initializeAuth = async () => {
      try {
        // 初期化開始を記録
        initializationStateRef.current = 'initializing';
        console.log('[AuthProvider] Initializing auth...');
        
        // 1. セッション復元を試みる
        let restoredSession = null;
        if (!isRestoringRef.current && isMounted) {
          isRestoringRef.current = true;
          restoredSession = await sessionRestoration.restoreSession();
          
          if (!isMounted) {
            console.log('[AuthProvider] Component unmounted during session restoration');
            return;
          }
          
          if (restoredSession) {
            console.log('[AuthProvider] Session restored successfully');
          } else {
            console.log('[AuthProvider] No session to restore');
          }
          isRestoringRef.current = false;
        }
        
        // 2. 復元されたセッション（またはnull）を使用してauthStateManagerを初期化
        // これにより、セッション復元の結果が確実に反映される
        if (isMounted) {
          await authStateManager.initialize(queryClient, restoredSession);
          
          if (!isMounted) {
            console.log('[AuthProvider] Component unmounted during authStateManager initialization');
            // 初期化が完了していない場合はクリーンアップを呼ばない
            return;
          }
        }
        
        if (isMounted) {
          isInitializedRef.current = true;
          initializationStateRef.current = 'initialized';
          console.log('[AuthProvider] Auth initialization completed');
        }
      } catch (error) {
        if (isMounted) {
          console.error('[AuthProvider] Failed to initialize auth:', error);
          initializationStateRef.current = 'idle'; // エラー時は初期状態に戻す
          
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
      console.log('[AuthProvider] Cleaning up...', {
        initializationState: initializationStateRef.current,
      });
      
      // 初期化が完了している場合のみクリーンアップを実行
      if (initializationStateRef.current === 'initialized') {
        authStateManager.cleanup();
      } else if (initializationStateRef.current === 'initializing') {
        console.warn('[AuthProvider] Cleanup called during initialization - skipping authStateManager cleanup');
      }
      
      isInitializedRef.current = false;
      initializationStateRef.current = 'idle';
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