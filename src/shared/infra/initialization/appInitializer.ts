import { initializeStorage } from '../storage/mmkvStorage';
import { authTokenManager } from '../../../features/auth/infra/services/authTokenManager';
import { sessionRestoration } from '../../../features/auth/infra/services/sessionRestoration';

export class AppInitializer {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // MMKVストレージの初期化
      await initializeStorage();
      console.log('MMKV storage initialized successfully');

      // セッション復元を試みる
      const sessionRestored = await sessionRestoration.restoreSession();
      console.log('Session restoration:', sessionRestored ? 'successful' : 'no session found');

      // トークン自動更新の初期化（セッション復元が失敗した場合のみ）
      if (!sessionRestored) {
        await authTokenManager.initialize();
        console.log('Auth token manager initialized successfully');
      }

      // 他の初期化処理をここに追加
      // 例: Analytics, Crash reporting, etc.

      this.isInitialized = true;
    } catch (error) {
      console.error('App initialization failed:', error);
      // クリティカルなエラーの場合は再スロー
      throw error;
    }
  }

  static isAppInitialized(): boolean {
    return this.isInitialized;
  }
}