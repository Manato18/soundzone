import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';

import { MMKVStorage, StorageKeys } from '../../../../shared/infra/storage/mmkvStorage';
import { handleQueryError, queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { supabase } from '../../../../shared/services/supabase';

// 認証リクエスト・レスポンス型定義
export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  user?: QueryUser;
  error?: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface SignUpResponse {
  success: boolean;
  user?: QueryUser;
  needsEmailVerification: boolean;
  error?: string;
}

// TanStack Query用のユーザー型（シンプル版）
export interface QueryUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

// 詳細認証状態型定義
export interface AuthStatusDetails {
  isSignedIn: boolean;
  isEmailVerified: boolean;
  needsEmailVerification: boolean;
  user?: QueryUser;
}

// OTP認証関連の型定義
export interface VerifyOTPRequest {
  email: string;
  token: string;
  type: 'signup' | 'email' | 'recovery';
}

export interface VerifyOTPResponse {
  success: boolean;
  user?: QueryUser;
  error?: string;
}

export interface SendOTPRequest {
  email: string;
  shouldCreateUser?: boolean;
  type?: 'signup' | 'magiclink';
}

export interface SendOTPResponse {
  success: boolean;
  needsEmailVerification: boolean;
  error?: string;
}

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface ResendVerificationEmailResponse {
  success: boolean;
  error?: string;
}

// 現在のユーザー情報を取得するクエリ
export const useCurrentUserQuery = (
  options?: Omit<UseQueryOptions<QueryUser | null, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('No valid session found');
          return null;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.log('No valid user found');
          return null;
        }

        console.log('User query successful:', user.email);
        return {
          id: user.id,
          email: user.email || '',
          emailVerified: user.email_confirmed_at !== null,
          name: user.user_metadata?.name,
          avatarUrl: user.user_metadata?.avatar_url,
        };
      } catch (error) {
        console.error('Current user query error:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    refetchOnMount: true, // マウント時に再フェッチ
    refetchOnWindowFocus: false, // ウィンドウフォーカス時は再フェッチしない
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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          return null;
        }

        return { 
          authenticated: true, 
          session,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            emailVerified: session.user.email_confirmed_at !== null,
            name: session.user.user_metadata?.name,
            avatarUrl: session.user.user_metadata?.avatar_url,
          }
        };
      } catch (error) {
        console.error('Session query error:', error);
        return null;
      }
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
    mutationFn: async ({ email, password }: SignInRequest): Promise<SignInResponse> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return {
            success: false,
            error: error.message,
          };
        }

        if (data.user) {
          const user = {
            id: data.user.id,
            email: data.user.email || '',
            emailVerified: data.user.email_confirmed_at !== null,
            name: data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url,
          };

          // ログイン成功時にMMKVに保存
          MMKVStorage.setString(StorageKeys.LAST_LOGIN_EMAIL, email);

          return {
            success: true,
            user,
          };
        }

        return {
          success: false,
          error: 'ログインに失敗しました',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        };
      }
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // キャッシュを更新
        queryClient.setQueryData(queryKeys.auth.user(), data.user);
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() });
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
  options?: Omit<UseMutationOptions<SignUpResponse, Error, SignUpRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: SignUpRequest): Promise<SignUpResponse> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          return {
            success: false,
            needsEmailVerification: false,
            error: error.message,
          };
        }

        if (data.user) {
          const user = {
            id: data.user.id,
            email: data.user.email || '',
            emailVerified: data.user.email_confirmed_at !== null,
            name: data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url,
          };

          return {
            success: true,
            user,
            needsEmailVerification: !data.session, // セッションがない場合はメール認証が必要
          };
        }

        return {
          success: false,
          needsEmailVerification: false,
          error: 'サインアップに失敗しました',
        };
      } catch (error) {
        return {
          success: false,
          needsEmailVerification: false,
          error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        };
      }
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // サインアップ成功時はキャッシュを更新
        queryClient.setQueryData(queryKeys.auth.user(), data.user);
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() });
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }

      // MMKVから認証情報をクリア
      MMKVStorage.delete(StorageKeys.AUTH_SESSION);
      MMKVStorage.delete(StorageKeys.AUTH_USER);
      MMKVStorage.delete(StorageKeys.AUTH_TOKENS);
    },
    onSuccess: async () => {
      console.log('Sign out successful - clearing cache');
      // 認証関連のクエリをクリア
      queryClient.setQueryData(queryKeys.auth.user(), null);
      queryClient.setQueryData(queryKeys.auth.session(), null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      
      // 認証クエリを強制的に無効化・再実行
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      
      // 他の認証が必要なクエリも無効化
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Sign out error:', error);
    },
    ...options,
  });
};

// パスワードリセットミューテーション
export const usePasswordResetMutation = (
  options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw new Error(error.message);
      }
    },
    ...options,
  });
};

// OTPコード検証ミューテーション
export const useVerifyOTPMutation = (
  options?: Omit<UseMutationOptions<VerifyOTPResponse, Error, VerifyOTPRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, token, type }: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type,
        });

        if (error) {
          return {
            success: false,
            error: error.message,
          };
        }

        if (data.user) {
          const user = {
            id: data.user.id,
            email: data.user.email || '',
            emailVerified: data.user.email_confirmed_at !== null,
            name: data.user.user_metadata?.name,
            avatarUrl: data.user.user_metadata?.avatar_url,
          };

          return {
            success: true,
            user,
          };
        }

        return {
          success: false,
          error: 'OTP検証に失敗しました',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'OTP検証中にエラーが発生しました',
        };
      }
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // 検証成功時にキャッシュを更新
        queryClient.setQueryData(queryKeys.auth.user(), data.user);
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() });
      }
    },
    onError: (error) => {
      console.error('Verify OTP error:', error);
    },
    ...options,
  });
};

// OTPコード送信ミューテーション（signup用）
export const useSendOTPMutation = (
  options?: Omit<UseMutationOptions<SendOTPResponse, Error, SendOTPRequest>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email, shouldCreateUser = true, type = 'signup' }: SendOTPRequest): Promise<SendOTPResponse> => {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser,
          },
        });

        if (error) {
          return {
            success: false,
            needsEmailVerification: false,
            error: error.message,
          };
        }

        return {
          success: true,
          needsEmailVerification: !data.session, // セッションがない場合はメール認証が必要
        };
      } catch (error) {
        return {
          success: false,
          needsEmailVerification: false,
          error: error instanceof Error ? error.message : 'OTP送信中にエラーが発生しました',
        };
      }
    },
    onError: (error) => {
      console.error('Send OTP error:', error);
    },
    ...options,
  });
};

// メール認証再送信ミューテーション
export const useResendVerificationEmailMutation = (
  options?: Omit<UseMutationOptions<ResendVerificationEmailResponse, Error, ResendVerificationEmailRequest>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email }: ResendVerificationEmailRequest): Promise<ResendVerificationEmailResponse> => {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });

        if (error) {
          return {
            success: false,
            error: error.message,
          };
        }

        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'メール再送信中にエラーが発生しました',
        };
      }
    },
    onError: (error) => {
      console.error('Resend verification email error:', error);
    },
    ...options,
  });
};

// 認証状態チェックのヘルパー（詳細化）
export const useAuthStatus = () => {
  const { data: user, isLoading: isUserLoading, error } = useCurrentUserQuery();
  
  const authStatusDetails: AuthStatusDetails = {
    isSignedIn: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    needsEmailVerification: !!user && !user.emailVerified,
    user: user || undefined,
  };
  
  return {
    isAuthenticated: !!user,
    user,
    isLoading: isUserLoading,
    error: error ? handleQueryError(error) : null,
    // 詳細認証状態
    authStatusDetails,
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