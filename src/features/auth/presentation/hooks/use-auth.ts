import { useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import {
  useAuthProcessState,
  useAuthSettings,
  useAuthUser,
  useClearEmailVerificationForm,
  useClearLoginForm,
  useClearSignUpForm,
  useDecrementResendCooldown,
  useEmailVerification,
  useHideEmailVerificationModal,
  useIsAuthenticated,
  useLoginForm,
  useReset,
  useSetAuthProcessState,
  useSetEmailVerificationEmail,
  useSetLastLoginEmail,
  useSetLoginError,
  useSetLoginSubmitting,
  useSetResending,
  useSetSignUpError,
  useSetSignUpSubmitting,
  useSetVerificationCode,
  useSetVerificationError,
  useSetVerificationSubmitting,
  useShowEmailVerificationModal,
  useSignUpForm,
  useStartResendCooldown,
  useUpdateLoginForm,
  useUpdateSignUpForm,
} from '../../application/auth-store';
import { QueryUser } from '../../domain/entities/User';
import { AuthResult, authService, SignUpResult } from '../../infra/services/authService';
import { rateLimiter } from '../../infra/services/rateLimiter';

// Presentation Layer: UI向けのHookと TanStack Query

// === クエリ ===
export const useCurrentUserQuery = () => {
  const user = useAuthUser();
  
  const query = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      // authStateManagerが管理するため、ここでは現在のユーザー情報を返すだけ
      const currentUser = await authService.getCurrentUser();
      return currentUser;
    },
    // authStateManagerが状態を管理するため、キャッシュを長めに設定
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 1時間
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // 初期データとしてZustandストアの値を使用
    initialData: user,
  });

  return query;
};

// === ミューテーション ===
export const useSignInMutation = (
  options?: Omit<UseMutationOptions<AuthResult<QueryUser>, Error, { email: string; password: string }>, 'mutationFn'>
) => {
  const setLastLoginEmail = useSetLastLoginEmail();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signIn(email, password);
      
      if (result.success && result.data) {
        // authStateManagerがSupabaseの認証状態変更を検知して自動的に状態を同期するため、
        // ここでは最後のログインメールのみを保存
        setLastLoginEmail(result.data.email);
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
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signUp(email, password);
      
      // authStateManagerがSupabaseの認証状態変更を検知して自動的に状態を同期するため、
      // ここでは結果を返すのみ
      
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
  return useMutation({
    mutationFn: async () => {
      await authService.signOut();
      // authStateManagerがSupabaseの認証状態変更を検知して自動的に状態をクリアするため、
      // ここではサインアウト処理のみ
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
  return useMutation({
    mutationFn: async ({ email, token, type }) => {
      const result = await authService.verifyOTP(email, token, type);
      
      // authStateManagerがSupabaseの認証状態変更を検知して自動的に状態を同期するため、
      // ここでは結果を返すのみ
      
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
  const authProcessState = useAuthProcessState();
  const setAuthProcessState = useSetAuthProcessState();
  const { isLoading } = useCurrentUserQuery();
  const reset = useReset();
  const queryClient = useQueryClient();

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
    // 認証プロセスの状態チェック
    if (authProcessState !== 'IDLE') {
      console.warn(`Signout attempt blocked: current state is ${authProcessState}`);
      return;
    }

    setAuthProcessState('SIGNING_OUT');

    try {
      await signOutMutation.mutateAsync();
      // authStateManagerが自動的に状態をクリアするため、追加の処理は不要
    } catch (error) {
      console.error('Sign out error:', error);
      // エラーが発生してもauthStateManagerがクリーンアップを行う
    } finally {
      setAuthProcessState('IDLE');
    }
  }, [authProcessState, setAuthProcessState, signOutMutation]);

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
  const authProcessState = useAuthProcessState();
  const setAuthProcessState = useSetAuthProcessState();
  const signInMutation = useSignInMutation();
  
  // レート制限の状態
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [waitTime, setWaitTime] = useState<number>(0);

  // 初回マウント時に最後のログインメールを設定
  const hasSetInitialEmail = useRef(false);
  useEffect(() => {
    if (settings.lastLoginEmail && !hasSetInitialEmail.current) {
      updateLoginForm({ email: settings.lastLoginEmail });
      hasSetInitialEmail.current = true;
    }
  }, [settings.lastLoginEmail, updateLoginForm]);

  // ロックアウトのカウントダウンタイマー
  useEffect(() => {
    if (!lockoutTime) return;
    
    const timer = setInterval(() => {
      const remaining = rateLimiter.getTimeUntilUnlock(form.email);
      if (remaining <= 0) {
        setLockoutTime(null);
        setWaitTime(0);
        clearInterval(timer);
      } else {
        setWaitTime(Math.ceil(remaining / 1000)); // 秒単位で更新
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lockoutTime, form.email]);

  const handleSubmit = useCallback(async () => {
    // 認証プロセスの状態チェック
    if (authProcessState !== 'IDLE') {
      console.warn(`Login attempt blocked: current state is ${authProcessState}`);
      setLoginError('general', '認証処理中です。しばらくお待ちください。');
      return { success: false };
    }

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

    // レート制限チェック
    const rateLimit = await rateLimiter.checkAndRecordAttempt(form.email);
    
    if (!rateLimit.allowed) {
      if (rateLimit.lockedUntil) {
        setLockoutTime(rateLimit.lockedUntil);
        setWaitTime(Math.ceil((rateLimit.waitTimeMs || 0) / 1000));
        setLoginError('general', `ログイン試行回数が上限に達しました。${Math.ceil((rateLimit.waitTimeMs || 0) / 60000)}分後に再度お試しください。`);
      } else if (rateLimit.waitTimeMs) {
        setLoginError('general', `${Math.ceil(rateLimit.waitTimeMs / 1000)}秒後に再度お試しください。`);
      }
      return { success: false };
    }
    
    setRemainingAttempts(rateLimit.remainingAttempts || null);
    setLoginSubmitting(true);
    setAuthProcessState('SIGNING_IN');
    
    try {
      const result = await signInMutation.mutateAsync({ 
        email: form.email, 
        password: form.password 
      });
      
      if (!result.success) {
        setLoginError('general', result.error || 'ログインに失敗しました');
        
        // 失敗時に残り試行回数を更新
        const updatedLimit = await rateLimiter.checkAndRecordAttempt(form.email);
        if (updatedLimit.remainingAttempts !== undefined) {
          setRemainingAttempts(updatedLimit.remainingAttempts);
        }
        
        return { success: false };
      }
      
      // 成功時はレート制限をクリア
      rateLimiter.clearAttempts(form.email);
      clearLoginForm();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログイン中にエラーが発生しました';
      setLoginError('general', errorMessage);
      return { success: false };
    } finally {
      setLoginSubmitting(false);
      setAuthProcessState('IDLE');
    }
  }, [form.email, form.password, authProcessState, signInMutation, setLoginError, setLoginSubmitting, setAuthProcessState, clearLoginForm]);

  return {
    form,
    updateEmail: (email: string) => {
      updateLoginForm({ email });
      // メールアドレスが変更されたらレート制限情報をリセット
      setRemainingAttempts(null);
      setLockoutTime(null);
      setWaitTime(0);
    },
    updatePassword: (password: string) => updateLoginForm({ password }),
    handleSubmit,
    clearForm: clearLoginForm,
    isSubmitting: form.isSubmitting || signInMutation.isPending || authProcessState !== 'IDLE',
    remainingAttempts,
    isLocked: !!lockoutTime,
    lockoutTimeRemaining: waitTime,
  };
};

// サインアップフォームHook
export const useSignUpFormHook = () => {
  const form = useSignUpForm();
  const updateSignUpForm = useUpdateSignUpForm();
  const setSignUpError = useSetSignUpError();
  const clearSignUpForm = useClearSignUpForm();
  const setSignUpSubmitting = useSetSignUpSubmitting();
  const authProcessState = useAuthProcessState();
  const setAuthProcessState = useSetAuthProcessState();
  const showEmailVerificationModal = useShowEmailVerificationModal();
  const startResendCooldown = useStartResendCooldown();
  const signUpMutation = useSignUpMutation();

  const handleSubmit = useCallback(async () => {
    // 認証プロセスの状態チェック
    if (authProcessState !== 'IDLE') {
      console.warn(`Signup attempt blocked: current state is ${authProcessState}`);
      setSignUpError('general', '認証処理中です。しばらくお待ちください。');
      return { success: false };
    }

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
    setAuthProcessState('SIGNING_UP');
    
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
      setAuthProcessState('IDLE');
    }
  }, [form.email, form.password, form.confirmPassword, authProcessState, signUpMutation, setSignUpError, setSignUpSubmitting, setAuthProcessState, clearSignUpForm, showEmailVerificationModal, startResendCooldown]);

  return {
    form,
    updateEmail: (email: string) => updateSignUpForm({ email }),
    updatePassword: (password: string) => updateSignUpForm({ password }),
    updateConfirmPassword: (confirmPassword: string) => updateSignUpForm({ confirmPassword }),
    handleSubmit,
    clearForm: clearSignUpForm,
    isSubmitting: form.isSubmitting || signUpMutation.isPending || authProcessState !== 'IDLE',
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
  const setEmailVerificationEmail = useSetEmailVerificationEmail();
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

  // メールアドレス設定とクールダウン開始
  const setEmailAndStartCooldown = useCallback((email: string) => {
    setEmailVerificationEmail(email);
    startResendCooldown();
  }, [setEmailVerificationEmail, startResendCooldown]);

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
    setEmailAndStartCooldown,
  };
};