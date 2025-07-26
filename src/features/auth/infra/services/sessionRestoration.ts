import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../../shared/services/supabase';
import { sessionPersistence } from './sessionPersistence';

export class SessionRestoration {
  private static instance: SessionRestoration;
  private isRestoring = false;

  private constructor() {}

  static getInstance(): SessionRestoration {
    if (!SessionRestoration.instance) {
      SessionRestoration.instance = new SessionRestoration();
    }
    return SessionRestoration.instance;
  }

  /**
   * アプリ起動時のセッション復元
   * @returns 復元されたセッション、または復元失敗時はnull
   */
  async restoreSession(): Promise<Session | null> {
    // 既に復元中の場合はスキップ
    if (this.isRestoring) {
      console.log('[SessionRestoration] Already restoring session');
      return null;
    }

    this.isRestoring = true;

    try {
      console.log('[SessionRestoration] Starting session restoration...');
      
      // 永続化されたセッション情報を取得
      const { refreshToken, sessionData } = await sessionPersistence.getPersistedSession();
      
      if (!refreshToken || !sessionData) {
        console.log('[SessionRestoration] No persisted session found');
        return null;
      }

      console.log('[SessionRestoration] Found persisted session, attempting to restore...');
      
      // リフレッシュトークンを使用してセッションを復元
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        console.error('[SessionRestoration] Failed to restore session:', error);
        await sessionPersistence.clearPersistedSession();
        return null;
      }

      if (data.session) {
        console.log('[SessionRestoration] Session restored successfully');
        
        // 新しいセッション情報を永続化
        await sessionPersistence.persistSession(data.session);
        
        // 復元されたセッションを返す（authTokenManagerの初期化はauthStateManagerで行う）
        return data.session;
      }

      return null;
    } catch (error) {
      console.error('[SessionRestoration] Unexpected error during session restoration:', error);
      return null;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * セッション復元中かどうか
   */
  isRestoringSession(): boolean {
    return this.isRestoring;
  }
}

export const sessionRestoration = SessionRestoration.getInstance();