import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { authService, AuthResult, SignUpResult } from '../../infrastructure/auth-service';
import { QueryUser } from '../../domain/entities/User';
import {
  useAuthUser,
  useIsAuthenticated,
  useLoginForm,
  useSignUpForm,
  useEmailVerification,
  useSetUser,
  useUpdateLoginForm,
  useSetLoginError,
  useClearLoginForm,
  useSetLoginSubmitting,
  useUpdateSignUpForm,
  useSetSignUpError,
  useClearSignUpForm,
  useSetSignUpSubmitting,
  useSetVerificationCode,
  useSetVerificationError,
  useSetVerificationSubmitting,
  useSetResending,
  useStartResendCooldown,
  useDecrementResendCooldown,
  useClearEmailVerificationForm,
  useShowEmailVerificationModal,
  useHideEmailVerificationModal,
  useReset,
  useLoadPersistentSettings,
} from '../../application/auth-store';

// Presentation Layer: UI向けのHookと TanStack Query

// === クエリ ===
export const useCurrentUserQuery = () => {
  const setUser = useSetUser();
  
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      setUser(user);
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// === ミューテーション ===
export const useSignInMutation = (options?: Omit<UseMutationOptions<AuthResult<QueryUser>, Error, { email: string; password: string }>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  const setUser = useSetUser();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signIn(email, password);
      
      if (result.success && result.data) {
        setUser(result.data);
        queryClient.setQueryData(queryKeys.auth.user(), result.data);
      }
      
      return result;
    },
    ...options,
  });
};

export const useSignUpMutation = (options?: Omit<UseMutationOptions<SignUpResult, Error, { email: string; password: string }>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  const setUser = useSetUser();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signUp(email, password);
      
      if (result.success && result.data) {
        if (!result.needsEmailVerification) {
          // メール認証不要の場合は即座にログイン状態に
          setUser(result.data);
          queryClient.setQueryData(queryKeys.auth.user(), result.data);
        }
      }
      
      return result;
    },
    ...options,
  });
};

export const useSignOutMutation = (options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  const reset = useReset();

  return useMutation({
    mutationFn: async () => {
      await authService.signOut();
      reset();
      queryClient.setQueryData(queryKeys.auth.user(), null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
    ...options,
  });
};

export const useVerifyOTPMutation = (options?: Omit<UseMutationOptions<AuthResult<QueryUser>, Error, { email: string; token: string; type: 'signup' | 'email' | 'recovery' }>, 'mutationFn'>) => {
  const queryClient = useQueryClient();
  const setUser = useSetUser();

  return useMutation({
    mutationFn: async ({ email, token, type }) => {
      const result = await authService.verifyOTP(email, token, type);
      
      if (result.success && result.data) {
        setUser(result.data);
        queryClient.setQueryData(queryKeys.auth.user(), result.data);
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
      }
      
      return result;
    },
    ...options,
  });
};

export const useResendVerificationEmailMutation = (options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>) => {
  return useMutation({
    mutationFn: async ({ email }) => {
      await authService.resendVerificationEmail(email);
    },
    ...options,
  });
};

export const usePasswordResetMutation = (options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>) => {
  return useMutation({
    mutationFn: async ({ email }) => {
      await authService.resetPassword(email);
    },
    ...options,
  });
};

// === 複合Hook（ビジネスロジック） ===

// メイン認証Hook
export const useAuth = () => {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const loadPersistentSettings = useLoadPersistentSettings();
  const { isLoading } = useCurrentUserQuery();

  const signInMutation = useSignInMutation();
  const signUpMutation = useSignUpMutation();
  const signOutMutation = useSignOutMutation();

  // 初期化時に永続化された設定をロード
  useEffect(() => {
    loadPersistentSettings();
  }, [loadPersistentSettings]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await signInMutation.mutateAsync({ email, password });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  }, [signInMutation]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const result = await signUpMutation.mutateAsync({ email, password });
      return result;
    } catch (error) {
      return {
        success: false,
        needsEmailVerification: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  }, [signUpMutation]);

  const signOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [signOutMutation]);

  return {
    // 状態
    user,
    isAuthenticated,
    isLoading: isLoading || signInMutation.isPending || signUpMutation.isPending || signOutMutation.isPending,
    
    // 操作
    signIn,
    signUp,
    signOut,
    
    // ミューテーション状態
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
};

// ログインフォームHook
export const useLoginFormHook = () => {
  const form = useLoginForm();
  const updateLoginForm = useUpdateLoginForm();
  const setLoginError = useSetLoginError();
  const clearLoginForm = useClearLoginForm();
  const setLoginSubmitting = useSetLoginSubmitting();
  const signInMutation = useSignInMutation();

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      setLoginError('email', 'メールアドレスを入力してください');
      return { success: false };
    }
    if (!form.password.trim()) {
      setLoginError('password', 'パスワードを入力してください');
      return { success: false };
    }

    setLoginSubmitting(true);
    
    try {
      const result = await signInMutation.mutateAsync({ 
        email: form.email, 
        password: form.password 
      });
      
      if (!result.success) {
        setLoginError('general', result.error || 'ログインに失敗しました');
        return { success: false };
      }
      
      clearLoginForm();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログイン中にエラーが発生しました';
      setLoginError('general', errorMessage);
      return { success: false };
    } finally {
      setLoginSubmitting(false);
    }
  }, [form.email, form.password, signInMutation, setLoginError, setLoginSubmitting, clearLoginForm]);

  return {
    form,
    updateEmail: (email: string) => updateLoginForm({ email }),
    updatePassword: (password: string) => updateLoginForm({ password }),
    handleSubmit,
    clearForm: clearLoginForm,
    isSubmitting: form.isSubmitting || signInMutation.isPending,
  };
};

// サインアップフォームHook
export const useSignUpFormHook = () => {
  const form = useSignUpForm();
  const updateSignUpForm = useUpdateSignUpForm();
  const setSignUpError = useSetSignUpError();
  const clearSignUpForm = useClearSignUpForm();
  const setSignUpSubmitting = useSetSignUpSubmitting();
  const showEmailVerificationModal = useShowEmailVerificationModal();
  const signUpMutation = useSignUpMutation();

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      setSignUpError('email', 'メールアドレスを入力してください');
      return { success: false };
    }
    if (!form.password.trim()) {
      setSignUpError('password', 'パスワードを入力してください');
      return { success: false };
    }
    if (form.password !== form.confirmPassword) {
      setSignUpError('confirmPassword', 'パスワードが一致しません');
      return { success: false };
    }
    if (form.password.length < 8) {
      setSignUpError('password', 'パスワードは8文字以上で入力してください');
      return { success: false };
    }

    setSignUpSubmitting(true);
    
    try {
      const result = await signUpMutation.mutateAsync({ 
        email: form.email, 
        password: form.password 
      });
      
      if (!result.success) {
        setSignUpError('general', result.error || 'サインアップに失敗しました');
        return { success: false };
      }
      
      clearSignUpForm();
      
      if (result.needsEmailVerification) {
        showEmailVerificationModal(form.email);
      }
      
      return { 
        success: true, 
        needsEmailVerification: result.needsEmailVerification,
        email: form.email
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'サインアップ中にエラーが発生しました';
      setSignUpError('general', errorMessage);
      return { success: false };
    } finally {
      setSignUpSubmitting(false);
    }
  }, [form.email, form.password, form.confirmPassword, signUpMutation, setSignUpError, setSignUpSubmitting, clearSignUpForm, showEmailVerificationModal]);

  return {
    form,
    updateEmail: (email: string) => updateSignUpForm({ email }),
    updatePassword: (password: string) => updateSignUpForm({ password }),
    updateConfirmPassword: (confirmPassword: string) => updateSignUpForm({ confirmPassword }),
    handleSubmit,
    clearForm: clearSignUpForm,
    isSubmitting: form.isSubmitting || signUpMutation.isPending,
  };
};

// メール認証Hook
export const useEmailVerificationHook = () => {
  const verification = useEmailVerification();
  const setVerificationSubmitting = useSetVerificationSubmitting();
  const setVerificationError = useSetVerificationError();
  const decrementResendCooldown = useDecrementResendCooldown();
  const clearEmailVerificationForm = useClearEmailVerificationForm();
  const hideEmailVerificationModal = useHideEmailVerificationModal();
  const setResending = useSetResending();
  const startResendCooldown = useStartResendCooldown();
  const setVerificationCode = useSetVerificationCode();
  const verifyOTPMutation = useVerifyOTPMutation();
  const resendEmailMutation = useResendVerificationEmailMutation();

  // クールダウンタイマー
  useEffect(() => {
    if (verification.resendCooldown > 0) {
      const timer = setTimeout(() => {
        decrementResendCooldown();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verification.resendCooldown, decrementResendCooldown]);

  const verifyOTP = useCallback(async (code: string) => {
    if (!verification.email) {
      return { success: false, error: 'メールアドレスが設定されていません' };
    }

    setVerificationSubmitting(true);
    setVerificationError('code', undefined);
    
    try {
      const result = await verifyOTPMutation.mutateAsync({
        email: verification.email,
        token: code,
        type: 'signup',
      });
      
      if (!result.success) {
        setVerificationError('code', result.error || 'OTP検証に失敗しました');
        return { success: false, error: result.error };
      }
      
      clearEmailVerificationForm();
      hideEmailVerificationModal();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP検証中にエラーが発生しました';
      setVerificationError('general', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setVerificationSubmitting(false);
    }
  }, [verification.email, verifyOTPMutation, setVerificationError, setVerificationSubmitting, clearEmailVerificationForm, hideEmailVerificationModal]);

  const resendEmail = useCallback(async () => {
    if (!verification.email) {
      return { success: false, error: 'メールアドレスが設定されていません' };
    }
    
    if (verification.resendCooldown > 0) {
      return { success: false, error: `${verification.resendCooldown}秒後に再送信できます` };
    }

    setResending(true);
    
    try {
      await resendEmailMutation.mutateAsync({ email: verification.email });
      startResendCooldown();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'メール再送信中にエラーが発生しました';
      setVerificationError('general', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setResending(false);
    }
  }, [verification.email, verification.resendCooldown, resendEmailMutation, setResending, startResendCooldown, setVerificationError]);

  return {
    verification,
    verifyOTP,
    resendEmail,
    updateCode: setVerificationCode,
    clearErrors: () => {
      setVerificationError('code', undefined);
      setVerificationError('general', undefined);
    },
    isVerifying: verification.isVerifying || verifyOTPMutation.isPending,
    isResending: verification.isResending || resendEmailMutation.isPending,
  };
};