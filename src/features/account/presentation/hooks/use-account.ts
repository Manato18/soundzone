import { useCallback } from 'react';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import {
  useAccountStore,
  useAccountProfile,
  useHasCompletedProfile,
  useProfileCreationForm,
  useAvatarUpload,
  useAccountActions,
} from '../../application/account-store';
import {
  useProfileQuery,
  useCheckProfileExistsQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
} from './use-account-query';
import { Profile } from '../../domain/entities/Profile';

// 統合フック - Account機能の中心的なインターフェース
export const useAccount = () => {
  const { user } = useAuth();
  const profile = useAccountProfile();
  const hasCompletedProfile = useHasCompletedProfile();
  const actions = useAccountActions();

  // プロフィール取得
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, 
    error: profileError,
    refetch: refetchProfile,
  } = useProfileQuery(user?.id);

  // プロフィール存在確認
  const { 
    data: profileExists, 
    isLoading: isCheckingExists,
  } = useCheckProfileExistsQuery(user?.id);

  return {
    // 状態
    profile: profile || profileData || null,
    hasCompletedProfile,
    profileExists: profileExists ?? false,
    
    // ローディング状態
    isLoadingProfile,
    isCheckingExists,
    
    // エラー
    profileError,
    
    // アクション
    refetchProfile,
    resetAccount: actions.reset,
  };
};

// プロフィール作成フォームフック
export const useProfileCreationFormHook = () => {
  const { user } = useAuth();
  const form = useProfileCreationForm();
  const avatarUpload = useAvatarUpload();
  const actions = useAccountActions();
  
  const createProfileMutation = useCreateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const deleteAvatarMutation = useDeleteAvatarMutation();

  // 表示名のバリデーション
  const validateDisplayName = useCallback((name: string) => {
    const error = Profile.validateDisplayName(name);
    actions.setProfileCreationError('displayName', error);
    return !error;
  }, [actions]);

  // 自己紹介のバリデーション
  const validateBio = useCallback((bio: string) => {
    const error = Profile.validateBio(bio);
    actions.setProfileCreationError('bio', error);
    return !error;
  }, [actions]);

  // アバター画像のバリデーション
  const validateAvatar = useCallback(() => {
    if (!avatarUpload.uploadedUrl && !form.avatarPreviewUrl) {
      actions.setProfileCreationError('avatar', 'アバター画像を選択してください');
      return false;
    }
    actions.setProfileCreationError('avatar', undefined);
    return true;
  }, [avatarUpload.uploadedUrl, form.avatarPreviewUrl, actions]);

  // フォーム全体のバリデーション
  const validateForm = useCallback(() => {
    const isDisplayNameValid = validateDisplayName(form.displayName);
    const isBioValid = validateBio(form.bio);
    const isAvatarValid = validateAvatar();
    
    return isDisplayNameValid && isBioValid && isAvatarValid;
  }, [form.displayName, form.bio, validateDisplayName, validateBio, validateAvatar]);

  // プロフィール作成
  const createProfile = useCallback(async () => {
    if (!user || !validateForm()) {
      return { success: false, error: 'バリデーションエラー' };
    }

    if (!avatarUpload.uploadedUrl) {
      return { success: false, error: 'アバター画像のアップロードが完了していません' };
    }

    try {
      await createProfileMutation.mutateAsync({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: form.displayName.trim(),
        avatarUrl: avatarUpload.uploadedUrl,
        bio: form.bio.trim(),
      });

      return { success: true };
    } catch (error) {
      console.error('Profile creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'プロフィールの作成に失敗しました' 
      };
    }
  }, [user, form, avatarUpload.uploadedUrl, validateForm, createProfileMutation]);

  // アバター画像選択とアップロード
  const selectAndUploadAvatar = useCallback(async (file: File | Blob) => {
    if (!user) {
      actions.setAvatarUploadError('ログインが必要です');
      return { success: false, error: 'ログインが必要です' };
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      actions.setAvatarUploadError('画像サイズは5MB以下にしてください');
      return { success: false, error: '画像サイズは5MB以下にしてください' };
    }

    // プレビューURL生成
    const previewUrl = URL.createObjectURL(file);
    actions.setAvatarPreviewUrl(previewUrl);

    try {
      // 古いアバターがあれば削除
      if (avatarUpload.uploadedUrl) {
        await deleteAvatarMutation.mutateAsync(avatarUpload.uploadedUrl);
      }

      // 新しいアバターをアップロード
      const url = await uploadAvatarMutation.mutateAsync({
        userId: user.id,
        file,
      });

      return { success: true, url };
    } catch (error) {
      console.error('Avatar upload failed:', error);
      
      // エラー時はプレビューもクリア
      actions.setAvatarPreviewUrl(undefined);
      URL.revokeObjectURL(previewUrl);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'アップロードに失敗しました' 
      };
    }
  }, [user, avatarUpload.uploadedUrl, actions, uploadAvatarMutation, deleteAvatarMutation]);

  // クリーンアップ（画面を離れる時など）
  const cleanup = useCallback(() => {
    // プレビューURLの解放
    if (form.avatarPreviewUrl) {
      URL.revokeObjectURL(form.avatarPreviewUrl);
    }
    actions.resetProfileCreationForm();
  }, [form.avatarPreviewUrl, actions]);

  return {
    // フォーム状態
    form,
    avatarUpload,
    
    // バリデーション
    validateDisplayName,
    validateBio,
    validateAvatar,
    validateForm,
    
    // アクション
    updateForm: actions.updateProfileCreationForm,
    createProfile,
    selectAndUploadAvatar,
    cleanup,
    
    // ミューテーション状態
    isCreating: createProfileMutation.isPending,
    isUploading: uploadAvatarMutation.isPending,
  };
};

// プロフィール編集フック（将来の実装用）
export const useProfileEditHook = () => {
  const { user } = useAuth();
  const profile = useAccountProfile();
  const updateProfileMutation = useUpdateProfileMutation();

  const updateProfile = useCallback(async (
    updates: Partial<Pick<typeof profile, 'displayName' | 'avatarUrl' | 'bio'>>
  ) => {
    if (!user || !profile) {
      return { success: false, error: 'プロフィールが見つかりません' };
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        updates,
      });

      return { success: true };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'プロフィールの更新に失敗しました' 
      };
    }
  }, [user, profile, updateProfileMutation]);

  return {
    profile,
    updateProfile,
    isUpdating: updateProfileMutation.isPending,
  };
};