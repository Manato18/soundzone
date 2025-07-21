import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import { queryKeys, handleQueryError } from '../../../../shared/presenter/queries/queryClient';
import { SignInRequest, SignInResponse } from '../../application/useCases/SignInUseCase';
import { AuthContainer } from '../../application/container/AuthContainer';

// TanStack Query用のユーザー型（シンプル版）
export interface QueryUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

// UseCaseインスタンス（DIコンテナから取得）
const authContainer = AuthContainer.getInstance();
const signInUseCase = authContainer.getSignInUseCase();
const signUpUseCase = authContainer.getSignUpUseCase();
const signOutUseCase = authContainer.getSignOutUseCase();
const getCurrentUserUseCase = authContainer.getGetCurrentUserUseCase();

// 現在のユーザー情報を取得するクエリ
export const useCurrentUserQuery = (
  options?: Omit<UseQueryOptions<QueryUser | null, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      try {
        const result = await getCurrentUserUseCase.execute();
        if (!result.success) {
          // エラーがセッション関連の場合はnullを返す（エラーをthrowしない）
          if (result.error?.includes('session') || result.error?.includes('認証')) {
            return null;
          }
          // その他のエラーはthrow
          throw new Error(result.error || 'ユーザー情報取得に失敗しました');
        }
        
        if (!result.user) {
          return null;
        }
        
        return result.user;
      } catch (error) {
        // セッション関連エラーの場合はnullを返す
        if (error instanceof Error && 
            (error.message.includes('認証') || 
             error.message.includes('session') || 
             error.message.includes('Auth session missing'))) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    ...options,
  });
};

// セッション情報を取得するクエリ
export const useSessionQuery = (
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      // セッション取得の実装が必要な場合
      // とりあえずCurrentUserから推測
      const result = await getCurrentUserUseCase.execute();
      return result.user ? { authenticated: true, user: result.user } : null;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// サインインミューテーション
export const useSignInMutation = (
  options?: Omit<UseMutationOptions<SignInResponse, Error, SignInRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SignInRequest) => {
      return await signInUseCase.execute(request);
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // キャッシュを更新
        queryClient.setQueryData(queryKeys.auth.user(), data.user);
        queryClient.setQueryData(queryKeys.auth.session(), {
          authenticated: true,
          user: data.user,
          session: data.session,
        });
      }
    },
    onError: (error) => {
      console.error('Sign in error:', error);
    },
    ...options,
  });
};

// サインアップミューテーション
export const useSignUpMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, { email: string; password: string }>,
    'mutationFn'
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await signUpUseCase.execute({ email, password });
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // サインアップ成功時はキャッシュを更新
        queryClient.setQueryData(queryKeys.auth.user(), data.user);
        queryClient.setQueryData(queryKeys.auth.session(), {
          authenticated: true,
          user: data.user,
          needsEmailVerification: data.needsEmailVerification,
        });
      }
    },
    onError: (error) => {
      console.error('Sign up error:', error);
    },
    ...options,
  });
};

// サインアウトミューテーション
export const useSignOutMutation = (
  options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await signOutUseCase.execute();
    },
    onSuccess: () => {
      // 認証関連のクエリをクリア
      queryClient.setQueryData(queryKeys.auth.user(), null);
      queryClient.setQueryData(queryKeys.auth.session(), null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      
      // 他の認証が必要なクエリも無効化
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Sign out error:', error);
    },
    ...options,
  });
};

// パスワードリセットミューテーション（将来実装）
export const usePasswordResetMutation = (
  options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // TODO: パスワードリセットUseCase実装後に更新
      throw new Error('パスワードリセット機能は未実装です');
    },
    ...options,
  });
};

// メール認証ミューテーション（将来実装）
export const useEmailVerificationMutation = (
  options?: Omit<UseMutationOptions<void, Error, { token: string }>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      // TODO: メール認証UseCase実装後に更新
      throw new Error('メール認証機能は未実装です');
    },
    ...options,
  });
};

// 認証状態チェックのヘルパー
export const useAuthStatus = () => {
  const { data: user, isLoading: isUserLoading, error } = useCurrentUserQuery();
  
  return {
    isAuthenticated: !!user,
    user,
    isLoading: isUserLoading,
    error: error ? handleQueryError(error) : null,
  };
};

// 認証が必要なクエリで使用するヘルパー
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuthStatus();
  
  return {
    isAuthenticated,
    isLoading,
    canProceed: isAuthenticated && !isLoading,
  };
};