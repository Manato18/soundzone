import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { accountService } from '../../infrastructure/services/accountService';
import { accountStateManager } from '../../infrastructure/services/accountStateManager';
import { useAccountStore } from '../../application/account-store';
import { QueryProfile } from '../../domain/entities/Profile';

// プロフィール取得クエリ
export const useProfileQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId ? queryKeys.account.profile(userId) : [],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const profile = await accountService.fetchProfile(userId);
      return profile;
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000,     // 1時間
    // 成功時にZustandストアを更新
    onSuccess: (data) => {
      if (data) {
        useAccountStore.getState().setProfile(data);
      }
    },
  });
};

// プロフィール存在確認クエリ
export const useCheckProfileExistsQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId ? queryKeys.account.checkExists(userId) : [],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return await accountService.checkProfileExists(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,  // 5分
    gcTime: 10 * 60 * 1000,    // 10分
  });
};

// プロフィール作成ミューテーション
export const useCreateProfileMutation = () => {
  const queryClient = useQueryClient();
  const setProfile = useAccountStore((state) => state.setProfile);
  const setProfileCreationSubmitting = useAccountStore((state) => state.setProfileCreationSubmitting);
  const setProfileCreationError = useAccountStore((state) => state.setProfileCreationError);

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      email: string;
      emailVerified: boolean;
      displayName: string;
      avatarUrl: string;
      bio: string;
    }) => {
      // Zustandストアの送信状態を更新
      setProfileCreationSubmitting(true);
      
      // accountStateManagerを通じて作成（自動的にストア更新）
      return await accountStateManager.createProfile(params);
    },
    
    onSuccess: (data, variables) => {
      // キャッシュを更新
      queryClient.setQueryData(
        queryKeys.account.profile(variables.userId),
        data
      );
      queryClient.setQueryData(
        queryKeys.account.checkExists(variables.userId),
        true
      );
      
      // 成功時のクリーンアップ
      setProfileCreationSubmitting(false);
      useAccountStore.getState().resetProfileCreationForm();
    },
    
    onError: (error, variables) => {
      console.error('Profile creation failed:', error);
      
      // エラー処理
      setProfileCreationSubmitting(false);
      setProfileCreationError(
        'general',
        error instanceof Error ? error.message : 'プロフィールの作成に失敗しました'
      );
    },
  });
};

// プロフィール更新ミューテーション
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      updates: Partial<Pick<QueryProfile, 'displayName' | 'avatarUrl' | 'bio'>>;
    }) => {
      // accountStateManagerを通じて更新（自動的にストア更新）
      return await accountStateManager.updateProfile(params.userId, params.updates);
    },
    
    // 楽観的更新
    onMutate: async ({ userId, updates }) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.account.profile(userId) 
      });
      
      // 現在のデータを保存
      const previousProfile = queryClient.getQueryData<QueryProfile>(
        queryKeys.account.profile(userId)
      );
      
      // 楽観的更新
      if (previousProfile) {
        const updatedProfile = {
          ...previousProfile,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData(
          queryKeys.account.profile(userId),
          updatedProfile
        );
      }
      
      // ロールバック用のコンテキストを返す
      return { previousProfile };
    },
    
    onError: (error, variables, context) => {
      console.error('Profile update failed:', error);
      
      // エラー時はロールバック
      if (context?.previousProfile) {
        queryClient.setQueryData(
          queryKeys.account.profile(variables.userId),
          context.previousProfile
        );
      }
    },
    
    onSettled: (data, error, variables) => {
      // 最終的に最新データを取得
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.profile(variables.userId),
      });
    },
  });
};

// アバターアップロードミューテーション
export const useUploadAvatarMutation = () => {
  const setAvatarUploading = useAccountStore((state) => state.setAvatarUploading);
  const setAvatarUploadProgress = useAccountStore((state) => state.setAvatarUploadProgress);
  const setAvatarUploadedUrl = useAccountStore((state) => state.setAvatarUploadedUrl);
  const setAvatarUploadError = useAccountStore((state) => state.setAvatarUploadError);

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      file: File | Blob;
    }) => {
      // アップロード開始
      setAvatarUploading(true);
      setAvatarUploadProgress(0);
      
      // accountStateManagerを通じてアップロード
      return await accountStateManager.uploadAvatar({
        userId: params.userId,
        file: params.file,
        onProgress: (progress) => {
          setAvatarUploadProgress(progress);
        },
      });
    },
    
    onSuccess: (avatarUrl) => {
      // 成功時の処理（accountStateManagerで既にストア更新済み）
      console.log('Avatar uploaded successfully:', avatarUrl);
    },
    
    onError: (error) => {
      console.error('Avatar upload failed:', error);
      // エラー処理（accountStateManagerで既にストア更新済み）
    },
    
    onSettled: () => {
      // 完了時の処理
      setAvatarUploading(false);
    },
  });
};

// 既存アバター削除ミューテーション
export const useDeleteAvatarMutation = () => {
  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      await accountStateManager.deleteAvatar(avatarUrl);
    },
    onError: (error) => {
      console.error('Avatar deletion failed:', error);
      // 削除エラーは無視（ユーザーには影響なし）
    },
  });
};