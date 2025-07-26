import { useCallback } from 'react';
import { authInterceptor } from '../../infra/services/authInterceptor';

/**
 * 認証付きAPI呼び出しのためのカスタムフック
 * トークンの自動更新と401エラー時のリトライを処理
 */
export function useAuthApi() {
  /**
   * 認証が必要なAPI呼び出しをラップ
   */
  const authApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T> => {
    // トークンの有効性を確認
    await authInterceptor.ensureValidToken();
    
    // 401エラー時の自動リトライを含むAPI呼び出し
    return authInterceptor.handleUnauthorized(apiCall);
  }, []);

  return { authApiCall };
}