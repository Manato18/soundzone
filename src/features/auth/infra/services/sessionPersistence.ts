import * as SecureStore from 'expo-secure-store';
import { Session } from '@supabase/supabase-js';
import { MMKVStorage, StorageKeys } from '../../../../shared/infra/storage/mmkvStorage';

interface PersistedSessionData {
  userId: string;
  sessionId: string;
  lastActiveTime: number;
}

export class SessionPersistence {
  private static instance: SessionPersistence;
  private readonly SECURE_REFRESH_TOKEN_KEY = 'soundzone_refresh_token';
  private readonly SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30日

  private constructor() {}

  static getInstance(): SessionPersistence {
    if (!SessionPersistence.instance) {
      SessionPersistence.instance = new SessionPersistence();
    }
    return SessionPersistence.instance;
  }

  /**
   * セッション情報を永続化
   */
  async persistSession(session: Session): Promise<void> {
    try {
      // リフレッシュトークンをSecure Storeに保存
      if (session.refresh_token) {
        await SecureStore.setItemAsync(
          this.SECURE_REFRESH_TOKEN_KEY,
          session.refresh_token,
          {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }
        );
      }

      // メタデータをMMKVに保存
      const sessionData: PersistedSessionData = {
        userId: session.user.id,
        sessionId: session.access_token.substring(0, 8), // セッション識別用の短縮ID
        lastActiveTime: Date.now(),
      };

      MMKVStorage.setObject(StorageKeys.AUTH_SESSION, sessionData);
      console.log('[SessionPersistence] Session persisted successfully');
    } catch (error) {
      console.error('[SessionPersistence] Failed to persist session:', error);
    }
  }

  /**
   * 永続化されたセッション情報を取得
   */
  async getPersistedSession(): Promise<{
    refreshToken: string | null;
    sessionData: PersistedSessionData | null;
  }> {
    try {
      // リフレッシュトークンを取得
      const refreshToken = await SecureStore.getItemAsync(this.SECURE_REFRESH_TOKEN_KEY);
      
      // メタデータを取得
      const sessionData = MMKVStorage.getObject<PersistedSessionData>(
        StorageKeys.AUTH_SESSION
      ) || null;

      // セッションタイムアウトチェック
      if (sessionData && this.isSessionExpired(sessionData)) {
        console.log('[SessionPersistence] Session expired, clearing...');
        await this.clearPersistedSession();
        return { refreshToken: null, sessionData: null };
      }

      return { refreshToken, sessionData };
    } catch (error) {
      console.error('[SessionPersistence] Failed to get persisted session:', error);
      return { refreshToken: null, sessionData: null };
    }
  }

  /**
   * セッション情報をクリア
   */
  async clearPersistedSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.SECURE_REFRESH_TOKEN_KEY);
      MMKVStorage.delete(StorageKeys.AUTH_SESSION);
      console.log('[SessionPersistence] Session cleared successfully');
    } catch (error) {
      console.error('[SessionPersistence] Failed to clear session:', error);
    }
  }

  /**
   * 最終アクティブ時刻を更新
   */
  updateLastActiveTime(): void {
    const sessionData = MMKVStorage.getObject<PersistedSessionData>(
      StorageKeys.AUTH_SESSION
    );
    
    if (sessionData) {
      sessionData.lastActiveTime = Date.now();
      MMKVStorage.setObject(StorageKeys.AUTH_SESSION, sessionData);
    }
  }

  /**
   * セッションが期限切れかチェック
   */
  private isSessionExpired(sessionData: PersistedSessionData): boolean {
    const timeSinceLastActive = Date.now() - sessionData.lastActiveTime;
    return timeSinceLastActive > this.SESSION_TIMEOUT;
  }
}

export const sessionPersistence = SessionPersistence.getInstance();