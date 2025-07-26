import { useCallback } from 'react';
import { useAccountContext } from '../providers/AccountProvider';
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
  const profile = useAccountProfile();
  const hasCompletedProfile = useHasCompletedProfile();

  return {
    // 状態
    profile,
    hasCompletedProfile,
    
    // AccountProviderから取得
    isCheckingProfile: false, // AccountProviderで管理
  };
};

// プロフィール作成フォームフック
export const useProfileCreationFormHook = () => {
  const { authUser } = useAccountContext();
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
    if (!avatarUpload.uploadedUrl && !form.avatarPreviewUrl && !form.avatarLocalUri) {
      actions.setProfileCreationError('avatar', 'アバター画像を選択してください');
      return false;
    }
    actions.setProfileCreationError('avatar', undefined);
    return true;
  }, [avatarUpload.uploadedUrl, form.avatarPreviewUrl, form.avatarLocalUri, actions]);

  // フォーム全体のバリデーション
  const validateForm = useCallback(() => {
    const isDisplayNameValid = validateDisplayName(form.displayName);
    const isBioValid = validateBio(form.bio);
    const isAvatarValid = validateAvatar();
    
    return isDisplayNameValid && isBioValid && isAvatarValid;
  }, [form.displayName, form.bio, validateDisplayName, validateBio, validateAvatar]);

  // プロフィール作成
  const createProfile = useCallback(async () => {
    if (!authUser || !validateForm()) {
      return { success: false, error: 'バリデーションエラー' };
    }

    // ローカルに保存されたBlobがあるかチェック
    if (!form.avatarLocalBlob && !avatarUpload.uploadedUrl) {
      return { success: false, error: 'アバター画像を選択してください' };
    }

    try {
      let avatarUrl = avatarUpload.uploadedUrl;
      
      // まだアップロードしていない場合はアップロード
      if (form.avatarLocalBlob && !avatarUpload.uploadedUrl) {
        actions.setProfileCreationSubmitting(true);
        actions.setProfileCreationError('general', undefined);
        
        // 画像をアップロード
        const uploadResult = await uploadAvatarMutation.mutateAsync({
          userId: authUser.id,
          file: form.avatarLocalBlob,
        });
        
        avatarUrl = uploadResult;
      }
      
      if (!avatarUrl) {
        throw new Error('アバター画像のアップロードに失敗しました');
      }

      // プロフィールを作成
      await createProfileMutation.mutateAsync({
        userId: authUser.id,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        displayName: form.displayName.trim(),
        avatarUrl: avatarUrl,
        bio: form.bio.trim(),
      });

      return { success: true };
    } catch (error) {
      actions.setProfileCreationError('general', error instanceof Error ? error.message : 'プロフィールの作成に失敗しました');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'プロフィールの作成に失敗しました' 
      };
    } finally {
      actions.setProfileCreationSubmitting(false);
    }
  }, [authUser, form, avatarUpload.uploadedUrl, validateForm, createProfileMutation, uploadAvatarMutation, actions]);

  // アバター画像のサイズチェック
  const checkAvatarSize = useCallback((size: number) => {
    if (size > 5 * 1024 * 1024) {
      actions.setProfileCreationError('avatar', '画像サイズは5MB以下にしてください');
      return false;
    }
    return true;
  }, [actions]);

  // クリーンアップ（画面を離れる時など）
  const cleanup = useCallback(() => {
    // React Nativeでは URL.revokeObjectURL は不要（URIを直接使用しているため）
    actions.resetProfileCreationForm();
  }, [actions]);

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
    setDisplayName: actions.setDisplayName,
    setBio: actions.setBio,
    setAvatarLocalData: actions.setAvatarLocalData,
    createProfile,
    checkAvatarSize,
    cleanup,
    
    // ミューテーション状態
    isCreating: createProfileMutation.isPending,
    isUploading: uploadAvatarMutation.isPending,
  };
};

// プロフィール編集フック（将来の実装用）
export const useProfileEditHook = () => {
  const { authUser } = useAccountContext();
  const profile = useAccountProfile();
  const updateProfileMutation = useUpdateProfileMutation();

  const updateProfile = useCallback(async (
    updates: Partial<Pick<typeof profile, 'displayName' | 'avatarUrl' | 'bio'>>
  ) => {
    if (!authUser || !profile) {
      return { success: false, error: 'プロフィールが見つかりません' };
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: authUser.id,
        updates,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'プロフィールの更新に失敗しました' 
      };
    }
  }, [authUser, profile, updateProfileMutation]);

  return {
    profile,
    updateProfile,
    isUpdating: updateProfileMutation.isPending,
  };
};