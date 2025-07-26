import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../../shared/services/supabase';

export class AuthTokenManager {
  private static instance: AuthTokenManager;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // 5分前に更新
  
  private constructor() {}

  static getInstance(): AuthTokenManager {
    if (!AuthTokenManager.instance) {
      AuthTokenManager.instance = new AuthTokenManager();
    }
    return AuthTokenManager.instance;
  }

  /**
   * トークン自動更新の初期化
   * 注: 認証状態の監視はauthStateManagerで一元管理されるため、
   * このメソッドは初回のセッションチェックのみ行う
   */
  async initialize(): Promise<void> {
    // 現在のセッションを取得
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      this.scheduleTokenRefresh(session);
    }
  }

  /**
   * 認証状態変更時の処理（authStateManagerから呼び出される）
   */
  handleAuthStateChange(event: string, session: Session | null): void {
    console.log('[AuthTokenManager] Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        if (session) {
          this.scheduleTokenRefresh(session);
        }
        break;
      case 'SIGNED_OUT':
        this.clearRefreshTimer();
        break;
    }
  }

  /**
   * トークン更新のスケジューリング
   */
  private scheduleTokenRefresh(session: Session): void {
    // 既存のタイマーをクリア
    this.clearRefreshTimer();

    if (!session.expires_at) {
      console.warn('[AuthTokenManager] Session has no expiration time');
      return;
    }

    const expiresAt = session.expires_at * 1000; // Unix timestamp to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = timeUntilExpiry - this.TOKEN_REFRESH_MARGIN;

    if (refreshTime <= 0) {
      // 既に更新が必要な場合は即座に更新
      console.log('[AuthTokenManager] Token needs immediate refresh');
      this.refreshToken();
    } else {
      // タイマーをセット
      console.log(`[AuthTokenManager] Scheduling token refresh in ${refreshTime / 1000}s`);
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  /**
   * トークンの手動更新
   */
  private async refreshToken(): Promise<void> {
    try {
      console.log('[AuthTokenManager] Refreshing token...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AuthTokenManager] Token refresh failed:', error);
        // エラー時は再ログインが必要
        await supabase.auth.signOut();
      } else if (data.session) {
        console.log('[AuthTokenManager] Token refreshed successfully');
        // 新しいセッションで次回の更新をスケジュール
        this.scheduleTokenRefresh(data.session);
      }
    } catch (error) {
      console.error('[AuthTokenManager] Unexpected error during token refresh:', error);
    }
  }

  /**
   * リフレッシュタイマーのクリア
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    console.log('[AuthTokenManager] Cleaning up...', {
      hasRefreshTimer: !!this.refreshTimer,
    });
    this.clearRefreshTimer();
    console.log('[AuthTokenManager] Cleaned up');
  }
}

export const authTokenManager = AuthTokenManager.getInstance();