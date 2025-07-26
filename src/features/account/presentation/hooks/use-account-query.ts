import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../shared/presenter/queries/queryKeys';
import { accountService } from '../../infrastructure/services/accountService';
import { QueryProfile } from '../../domain/entities/Profile';
import { useAccountFormStore } from '../../application/account-store';

// プロフィール取得（サーバー状態はTanStack Queryで管理）
export const useProfileQuery = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.account.profile(userId || ''),
    queryFn: () => accountService.fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000,   // 15分
  });
};

// プロフィール存在確認
export const useCheckProfileExistsQuery = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.account.exists(userId || ''),
    queryFn: () => accountService.checkProfileExists(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000,   // 15分
  });
};

// プロフィール作成ミューテーション
export const useCreateProfileMutation = () => {
  const queryClient = useQueryClient();
  const setHasCompletedProfile = useAccountFormStore((state) => state.setHasCompletedProfile);
  const resetForm = useAccountFormStore((state) => state.resetForm);

  return useMutation({
    mutationFn: (params) => accountService.createProfile(params),
    
    onSuccess: (profile, variables) => {
      // キャッシュを更新
      queryClient.setQueryData(
        queryKeys.account.profile(variables.userId),
        profile
      );
      queryClient.setQueryData(
        queryKeys.account.exists(variables.userId),
        true
      );
      
      // 状態を更新
      setHasCompletedProfile(true);
      resetForm();
    },
    
    onError: (error) => {
      console.error('Profile creation failed:', error);
    },
  });
};

// プロフィール更新ミューテーション
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: {
      userId: string;
      updates: Partial<Pick<QueryProfile, 'displayName' | 'avatarUrl' | 'bio'>>;
    }) => accountService.updateProfile(userId, updates),
    
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
        queryClient.setQueryData(
          queryKeys.account.profile(userId),
          { ...previousProfile, ...updates }
        );
      }
      
      return { previousProfile };
    },
    
    onError: (error, { userId }, context) => {
      // エラー時はロールバック
      if (context?.previousProfile) {
        queryClient.setQueryData(
          queryKeys.account.profile(userId),
          context.previousProfile
        );
      }
    },
    
    onSettled: (data, error, { userId }) => {
      // 最新データを取得
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.profile(userId)
      });
    },
  });
};

// アバターアップロードミューテーション（画像管理の改善）
export const useUploadAvatarMutation = () => {
  const setUploadState = useAccountFormStore((state) => state.setUploadState);

  return useMutation({
    mutationFn: (params) => accountService.uploadAvatar(params),
    
    onMutate: () => {
      setUploadState({ 
        isUploading: true, 
        uploadProgress: 0,
        error: undefined 
      });
    },
    
    onSuccess: (avatarUrl) => {
      setUploadState({ 
        uploadedUrl: avatarUrl,
        isUploading: false,
        uploadProgress: 100 
      });
    },
    
    onError: (error) => {
      setUploadState({ 
        error: error instanceof Error ? error.message : 'アップロードに失敗しました',
        isUploading: false,
        uploadProgress: 0 
      });
    },
  });
};

// アバター削除ミューテーション
export const useDeleteAvatarMutation = () => {
  return useMutation({
    mutationFn: (params) => accountService.deleteAvatar(params),
    onError: (error) => {
      // 削除エラーは無視（ユーザーに影響なし）
      console.warn('Avatar deletion failed:', error);
    },
  });
};