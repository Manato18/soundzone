import { useCallback, useRef } from 'react';
import { 
  useProfileQuery, 
  useCheckProfileExistsQuery,
  useCreateProfileMutation,
  useUploadAvatarMutation 
} from './use-account-query';
import {
  useProfileCreationForm as useProfileCreationFormSelector,
  useAvatarUploadState,
  useHasCompletedProfile,
  useAccountFormStore,
} from '../../application/account-store';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import { Profile } from '../../domain/entities/Profile';

// 画像データの一時管理用の型
interface ImageData {
  uri: string;
  blob: Blob;
}

// メイン統合フック（シンプルなAPI）
export const useAccountProfile = () => {
  const { user } = useAuth();
  const userId = user?.id;
  
  // TanStack Queryでサーバー状態を管理
  const { data: profile, isLoading: isLoadingProfile } = useProfileQuery(userId);
  const { data: profileExists, isLoading: isCheckingExists } = useCheckProfileExistsQuery(userId);
  
  // Zustandでフォーム状態を管理
  const hasCompletedProfile = useHasCompletedProfile();
  
  return {
    // サーバー状態
    profile,
    profileExists: profileExists ?? false,
    hasCompletedProfile,
    
    // ローディング状態
    isLoading: isLoadingProfile || isCheckingExists,
    
    // ユーザー情報
    userId,
    userEmail: user?.email,
    emailVerified: user?.emailVerified ?? false,
  };
};

// プロフィール作成フォーム専用フック
export const useProfileCreationForm = () => {
  const { user } = useAuth();
  const form = useProfileCreationFormSelector();
  const uploadState = useAvatarUploadState();
  
  // アクションを個別に取得して参照の安定性を保つ
  const updateForm = useAccountFormStore((state) => state.updateForm);
  const setFormError = useAccountFormStore((state) => state.setFormError);
  const clearFormErrors = useAccountFormStore((state) => state.clearFormErrors);
  const resetForm = useAccountFormStore((state) => state.resetForm);
  const setUploadState = useAccountFormStore((state) => state.setUploadState);
  const setHasCompletedProfile = useAccountFormStore((state) => state.setHasCompletedProfile);
  
  const createProfileMutation = useCreateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  
  // 画像データの一時保存（Blobはstoreに入れない）
  const imageDataRef = useRef<ImageData | null>(null);
  
  // バリデーション
  const validateDisplayName = useCallback((name: string): boolean => {
    const error = Profile.validateDisplayName(name);
    setFormError('displayName', error);
    return !error;
  }, [setFormError]);
  
  const validateBio = useCallback((bio: string): boolean => {
    const error = Profile.validateBio(bio);
    setFormError('bio', error);
    return !error;
  }, [setFormError]);
  
  const validateAvatar = useCallback((): boolean => {
    if (!form.avatarUri && !uploadState.uploadedUrl) {
      setFormError('avatar', 'プロフィール画像を選択してください');
      return false;
    }
    setFormError('avatar', undefined);
    return true;
  }, [form.avatarUri, uploadState.uploadedUrl, setFormError]);
  
  // 画像選択（Blobは別管理）
  const selectImage = useCallback((uri: string, blob: Blob) => {
    // Blobは参照で保持
    imageDataRef.current = { uri, blob };
    // storeにはURIのみ保存
    updateForm({ avatarUri: uri });
  }, [updateForm]);
  
  // 画像サイズチェック
  const checkImageSize = useCallback((size: number): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (size > maxSize) {
      setFormError('avatar', '画像サイズは5MB以下にしてください');
      return false;
    }
    return true;
  }, [setFormError]);
  
  // プロフィール作成
  const createProfile = useCallback(async () => {
    if (!user) return { success: false, error: '認証が必要です' };
    
    // バリデーション
    const isDisplayNameValid = validateDisplayName(form.displayName);
    const isBioValid = validateBio(form.bio);
    const isAvatarValid = validateAvatar();
    
    if (!isDisplayNameValid || !isBioValid || !isAvatarValid) {
      return { success: false, error: 'バリデーションエラー' };
    }
    
    try {
      updateForm({ isSubmitting: true });
      setFormError('general', undefined);
      
      let avatarUrl = uploadState.uploadedUrl;
      
      // 画像がまだアップロードされていない場合
      if (!avatarUrl && imageDataRef.current) {
        const uploadResult = await uploadAvatarMutation.mutateAsync({
          userId: user.id,
          file: imageDataRef.current.blob,
        });
        avatarUrl = uploadResult;
      }
      
      if (!avatarUrl) {
        throw new Error('アバター画像のアップロードに失敗しました');
      }
      
      // プロフィール作成
      await createProfileMutation.mutateAsync({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: form.displayName.trim(),
        avatarUrl,
        bio: form.bio.trim(),
      });
      
      // 画像データをクリア
      imageDataRef.current = null;
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'プロフィールの作成に失敗しました';
      setFormError('general', message);
      return { success: false, error: message };
    } finally {
      updateForm({ isSubmitting: false });
    }
  }, [
    user,
    form,
    uploadState.uploadedUrl,
    updateForm,
    setFormError,
    validateDisplayName,
    validateBio,
    validateAvatar,
    createProfileMutation,
    uploadAvatarMutation,
  ]);
  
  // クリーンアップ（プロフィール作成成功時のみ実行）
  const cleanup = useCallback(() => {
    imageDataRef.current = null;
    resetForm();
  }, [resetForm]);
  
  return {
    // フォーム状態
    form,
    uploadState,
    
    // バリデーション
    validateDisplayName,
    validateBio,
    validateAvatar,
    
    // アクション
    updateForm,
    selectImage,
    checkImageSize,
    createProfile,
    cleanup,
    
    // ミューテーション状態
    isCreating: createProfileMutation.isPending,
    isUploading: uploadAvatarMutation.isPending,
  };
};