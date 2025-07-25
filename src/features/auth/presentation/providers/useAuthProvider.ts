import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../application/auth-store';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { authStateManager } from '../../infra/services/authStateManager';

/**
 * AuthProvider専用のカスタムフック
 * Providerレベルでの認証操作を提供
 */
export const useAuthProvider = () => {
  const queryClient = useQueryClient();
  const reset = useAuthStore(state => state.reset);

  /**
   * 全ての認証関連データをクリア
   * ログアウト時に呼び出される
   */
  const clearAllAuthData = useCallback(async () => {
    console.log('[useAuthProvider] Clearing all auth data...');
    
    // 1. Zustandストアをリセット
    reset();
    
    // 2. React Queryのキャッシュをクリア
    queryClient.setQueryData(queryKeys.auth.user(), null);
    queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    
    // 3. 認証関連以外のクエリも無効化（ユーザー固有データのクリア）
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth'
    });
    
    console.log('[useAuthProvider] All auth data cleared');
  }, [queryClient, reset]);

  /**
   * 認証状態を手動で再同期
   * エラー復旧時などに使用
   */
  const resyncAuthState = useCallback(async () => {
    console.log('[useAuthProvider] Resyncing auth state...');
    
    try {
      await authStateManager.refreshUserData();
      console.log('[useAuthProvider] Auth state resynced');
    } catch (error) {
      console.error('[useAuthProvider] Failed to resync auth state:', error);
      throw error;
    }
  }, []);

  /**
   * 現在の認証状態を取得
   */
  const getAuthState = useCallback(async () => {
    return authStateManager.getAuthState();
  }, []);

  return {
    clearAllAuthData,
    resyncAuthState,
    getAuthState,
  };
};