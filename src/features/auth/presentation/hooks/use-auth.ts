import { useCallback, useEffect, useRef } from 'react';
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
  useAuthSettings,
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
  useSetLastLoginEmail,
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
    // エラーハンドリング
    onError: (error) => {
      console.error('Failed to fetch current user:', error);
      setUser(null);
    },
  });
};

// === ミューテーション ===
export const useSignInMutation = (
  options?: Omit<UseMutationOptions<AuthResult<QueryUser>, Error, { email: string; password: string }>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const setUser = useSetUser();
  const setLastLoginEmail = useSetLastLoginEmail();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signIn(email, password);
      
      if (result.success && result.data) {
        setUser(result.data);
        setLastLoginEmail(result.data.email);
        queryClient.setQueryData(queryKeys.auth.user(), result.data);
        
        // 認証後に関連するクエリを再フェッチ
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] !== 'auth' 
        });
      }
      
      return result;
    },
    onError: (error) => {
      console.error('Sign in error:', error);
    },
    ...options,
  });
};

export const useSignUpMutation = (
  options?: Omit<UseMutationOptions<SignUpResult, Error, { email: string; password: string }>, 'mutationFn'>
) => {
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
    onError: (error) => {
      console.error('Sign up error:', error);
    },
    ...options,
  });
};

export const useSignOutMutation = (
  options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const reset = useReset();

  return useMutation({
    mutationFn: async () => {
      await authService.signOut();
    },
    onSuccess: () => {
      // 状態をリセット
      reset();
      
      // キャッシュをクリア
      queryClient.setQueryData(queryKeys.auth.user(), null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      
      // 認証関連以外のクエリも無効化
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] !== 'auth' 
      });
    },
    onError: (error) => {
      console.error('Sign out error:', error);
    },
    ...options,
  });
};

export const useVerifyOTPMutation = (
  options?: Omit<UseMutationOptions<AuthResult<QueryUser>, Error, { email: string; token: string; type: 'signup' | 'email' | 'recovery' }>, 'mutationFn'>
) => {
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
    onError: (error) => {
      console.error('OTP verification error:', error);
    },
    ...options,
  });
};

export const useResendVerificationEmailMutation = (
  options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email }) => {
      await authService.resendVerificationEmail(email);
    },
    onError: (error) => {
      console.error('Resend verification email error:', error);
    },
    ...options,
  });
};

export const usePasswordResetMutation = (
  options?: Omit<UseMutationOptions<void, Error, { email: string }>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn: async ({ email }) => {
      await authService.resetPassword(email);
    },
    onError: (error) => {
      console.error('Password reset error:', error);
    },
    ...options,
  });
};

// === 複合Hook（ビジネスロジック） ===

// メイン認証Hook
export const useAuth = () => {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const settings = useAuthSettings();
  const { isLoading } = useCurrentUserQuery();

  const signInMutation = useSignInMutation();
  const signUpMutation = useSignUpMutation();
  const signOutMutation = useSignOutMutation();

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
      // サインアウトは失敗してもローカル状態をクリアする
      signOutMutation.onSuccess?.();
    }
  }, [signOutMutation]);

  return {
    // 状態
    user,
    isAuthenticated,
    isLoading: isLoading || signInMutation.isPending || signUpMutation.isPending || signOutMutation.isPending,
    settings,
    
    // 操作
    signIn,
    signUp,
    signOut,
    
    // ミューテーション状態
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    
    // エラー状態
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    signOutError: signOutMutation.error,
  };
};

// ログインフォームHook
export const useLoginFormHook = () => {
  const form = useLoginForm();
  const settings = useAuthSettings();
  const updateLoginForm = useUpdateLoginForm();
  const setLoginError = useSetLoginError();
  const clearLoginForm = useClearLoginForm();
  const setLoginSubmitting = useSetLoginSubmitting();
  const signInMutation = useSignInMutation();

  // 初回マウント時に最後のログインメールを設定
  const hasSetInitialEmail = useRef(false);
  useEffect(() => {
    if (settings.lastLoginEmail && !hasSetInitialEmail.current) {
      updateLoginForm({ email: settings.lastLoginEmail });
      hasSetInitialEmail.current = true;
    }
  }, [settings.lastLoginEmail, updateLoginForm]);

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      setLoginError('email', 'メールアドレスを入力してください');
      return { success: false };
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setLoginError('email', '有効なメールアドレスを入力してください');
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
  const startResendCooldown = useStartResendCooldown();
  const signUpMutation = useSignUpMutation();

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      setSignUpError('email', 'メールアドレスを入力してください');
      return { success: false };
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setSignUpError('email', '有効なメールアドレスを入力してください');
      return { success: false };
    }
    
    if (!form.password.trim()) {
      setSignUpError('password', 'パスワードを入力してください');
      return { success: false };
    }
    
    if (form.password.length < 8) {
      setSignUpError('password', 'パスワードは8文字以上で入力してください');
      return { success: false };
    }
    
    // パスワード強度チェック（オプション）
    const hasUpperCase = /[A-Z]/.test(form.password);
    const hasLowerCase = /[a-z]/.test(form.password);
    const hasNumbers = /\d/.test(form.password);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setSignUpError('password', 'パスワードは大文字、小文字、数字を含む必要があります');
      return { success: false };
    }
    
    if (form.password !== form.confirmPassword) {
      setSignUpError('confirmPassword', 'パスワードが一致しません');
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
        // 新規登録直後は再送信を防ぐためクールダウンタイマーを開始
        startResendCooldown();
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
  }, [form.email, form.password, form.confirmPassword, signUpMutation, setSignUpError, setSignUpSubmitting, clearSignUpForm, showEmailVerificationModal, startResendCooldown]);

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

    // OTPコードのバリデーション
    if (!code.trim()) {
      setVerificationError('code', '認証コードを入力してください');
      return { success: false, error: '認証コードを入力してください' };
    }
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setVerificationError('code', '6桁の数字を入力してください');
      return { success: false, error: '6桁の数字を入力してください' };
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