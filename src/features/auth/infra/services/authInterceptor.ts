import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../../shared/services/supabase';

export class AuthInterceptor {
  private static instance: AuthInterceptor;
  private readonly TOKEN_EXPIRY_BUFFER = 60 * 1000; // 1分のバッファ

  private constructor() {}

  static getInstance(): AuthInterceptor {
    if (!AuthInterceptor.instance) {
      AuthInterceptor.instance = new AuthInterceptor();
    }
    return AuthInterceptor.instance;
  }

  /**
   * APIリクエスト前にトークンの有効性をチェック
   * 必要に応じて更新を行う
   */
  async ensureValidToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[AuthInterceptor] No active session');
        return null;
      }

      // トークンの有効期限をチェック
      if (this.isTokenExpiringSoon(session)) {
        console.log('[AuthInterceptor] Token expiring soon, refreshing...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[AuthInterceptor] Failed to refresh token:', error);
          return null;
        }
        
        return data.session?.access_token || null;
      }

      return session.access_token;
    } catch (error) {
      console.error('[AuthInterceptor] Error ensuring valid token:', error);
      return null;
    }
  }

  /**
   * トークンの有効期限が近いかチェック
   */
  private isTokenExpiringSoon(session: Session): boolean {
    if (!session.expires_at) {
      return true;
    }

    const expiresAt = session.expires_at * 1000; // Unix timestamp to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    return timeUntilExpiry <= this.TOKEN_EXPIRY_BUFFER;
  }

  /**
   * 401エラー時の自動リトライ処理
   */
  async handleUnauthorized<T>(
    apiCall: () => Promise<T>,
    retryCount: number = 1
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      if (error?.status === 401 && retryCount > 0) {
        console.log('[AuthInterceptor] 401 error detected, attempting token refresh...');
        
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && data.session) {
          console.log('[AuthInterceptor] Token refreshed, retrying API call...');
          return this.handleUnauthorized(apiCall, retryCount - 1);
        }
      }
      
      throw error;
    }
  }
}

export const authInterceptor = AuthInterceptor.getInstance();