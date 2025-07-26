import { useAccountStore } from '../../application/account-store';
import { accountService } from './accountService';
import { QueryProfile } from '../../domain/entities/Profile';

// AccountErrorタイプ定義
export type AccountError = {
  code: 'PROFILE_NOT_FOUND' | 'PROFILE_CREATE_FAILED' | 'PROFILE_UPDATE_FAILED' | 'AVATAR_UPLOAD_FAILED' | 'NETWORK_ERROR';
  message: string;
};

// Infrastructure Layer: Account状態の統合管理（シングルトン）
class AccountStateManager {
  private static instance: AccountStateManager;
  private errorCallback: ((error: AccountError) => void) | null = null;
  private isInitializing: boolean = false;
  private lastCheckedUserId: string | null = null;

  // シングルトンパターン
  static getInstance(): AccountStateManager {
    if (!AccountStateManager.instance) {
      AccountStateManager.instance = new AccountStateManager();
    }
    return AccountStateManager.instance;
  }

  private constructor() {
    // プライベートコンストラクタ
  }

  // エラーコールバックの設定
  setErrorCallback(callback: (error: AccountError) => void): void {
    this.errorCallback = callback;
  }

  // エラー通知
  private notifyError(error: AccountError): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  // プロフィール初期化（Auth認証後に呼ばれる）
  async initializeProfile(userId: string): Promise<void> {
    // 無限ループ防止: 同じユーザーIDで重複実行しない
    if (this.isInitializing || this.lastCheckedUserId === userId) {
      console.log('Profile initialization already in progress or completed for user:', userId);
      return;
    }

    this.isInitializing = true;
    this.lastCheckedUserId = userId;

    try {
      // プロフィール存在確認
      const exists = await accountService.checkProfileExists(userId);
      
      if (exists) {
        // 既存プロフィールを取得
        const profile = await accountService.fetchProfile(userId);
        if (profile) {
          useAccountStore.getState().setProfile(profile);
          useAccountStore.getState().setHasCompletedProfile(true);
        }
      } else {
        // プロフィールが存在しない場合は作成画面へ誘導
        useAccountStore.getState().setHasCompletedProfile(false);
      }
    } catch (error) {
      console.error('Failed to initialize profile:', error);
      this.notifyError({
        code: 'NETWORK_ERROR',
        message: 'プロフィールの取得に失敗しました',
      });
    } finally {
      this.isInitializing = false;
    }
  }

  // プロフィール作成
  async createProfile(params: {
    userId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string;
    bio: string;
  }): Promise<QueryProfile> {
    try {
      const profile = await accountService.createProfile(params);
      
      // ストアを更新
      useAccountStore.getState().setProfile(profile);
      useAccountStore.getState().setHasCompletedProfile(true);
      
      return profile;
    } catch (error) {
      console.error('Failed to create profile:', error);
      this.notifyError({
        code: 'PROFILE_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'プロフィールの作成に失敗しました',
      });
      throw error;
    }
  }

  // プロフィール更新
  async updateProfile(
    userId: string,
    updates: Partial<Pick<QueryProfile, 'displayName' | 'avatarUrl' | 'bio'>>
  ): Promise<QueryProfile> {
    try {
      const profile = await accountService.updateProfile(userId, updates);
      
      // ストアを更新
      useAccountStore.getState().setProfile(profile);
      
      return profile;
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.notifyError({
        code: 'PROFILE_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'プロフィールの更新に失敗しました',
      });
      throw error;
    }
  }

  // アバター画像アップロード
  async uploadAvatar(params: {
    userId: string;
    file: File | Blob;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    try {
      // アップロード状態を更新
      useAccountStore.getState().setAvatarUploading(true);
      useAccountStore.getState().setAvatarUploadProgress(0);

      const avatarUrl = await accountService.uploadAvatar({
        ...params,
        onProgress: (progress) => {
          useAccountStore.getState().setAvatarUploadProgress(progress);
          params.onProgress?.(progress);
        },
      });

      // アップロード完了
      useAccountStore.getState().setAvatarUploadedUrl(avatarUrl);
      useAccountStore.getState().setAvatarUploading(false);
      
      return avatarUrl;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      useAccountStore.getState().setAvatarUploadError(
        error instanceof Error ? error.message : 'アバター画像のアップロードに失敗しました'
      );
      useAccountStore.getState().setAvatarUploading(false);
      
      this.notifyError({
        code: 'AVATAR_UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'アバター画像のアップロードに失敗しました',
      });
      throw error;
    }
  }

  // 既存アバター削除
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      await accountService.deleteAvatar(avatarUrl);
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      // 削除エラーは通知しない（ユーザーに影響がないため）
    }
  }

  // クリーンアップ（ログアウト時）
  cleanup(): void {
    this.lastCheckedUserId = null;
    this.isInitializing = false;
    useAccountStore.getState().reset();
  }
}

// シングルトンインスタンスをエクスポート
export const accountStateManager = AccountStateManager.getInstance();