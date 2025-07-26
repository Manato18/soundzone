import { initializeStorage } from '../storage/mmkvStorage';

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

      // 認証関連の初期化はAuthProviderで一元管理されるため、ここでは行わない
      // AuthProviderが以下を管理:
      // - セッション復元
      // - トークン自動更新
      // - 認証状態の監視

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