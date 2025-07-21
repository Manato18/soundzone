import { useCallback, useEffect } from 'react';
import { MMKVStorage, StorageKeys } from '../../../../shared/infra/storage/mmkvStorage';
import {
  useAuthStatus,
  usePasswordResetMutation,
  useResendVerificationEmailMutation,
  useSignInMutation,
  useSignOutMutation,
  useSignUpMutation,
  useVerifyOTPMutation,
} from '../queries/authQueries';
import {
  useAuthActions,
  useAuthModals,
  useAuthSettings,
  useEmailVerificationActions,
  useEmailVerificationState,
  useLoginForm,
  useLoginFormActions,
  useSignUpForm,
  useSignUpFormActions,
} from '../stores/authStore';

// メインの認証フック
export const useAuth = () => {
  const { isAuthenticated, user, isLoading, error, authStatusDetails } = useAuthStatus();
  
  const signInMutation = useSignInMutation({
    onSuccess: (data) => {
      if (data.success) {
        // ログイン成功時の処理
        MMKVStorage.setString(StorageKeys.LAST_LOGIN_EMAIL, data.user?.email || '');
      }
    },
  });
  
  const signUpMutation = useSignUpMutation({
    onSuccess: (data) => {
      if (data.success && data.needsEmailVerification) {
        // メール認証が必要な場合の処理
        // UIストアでモーダル表示などを制御
      }
    },
  });
  
  const signOutMutation = useSignOutMutation({
    onSuccess: () => {
      // ログアウト成功時にMMKVから認証情報をクリア
      MMKVStorage.delete(StorageKeys.AUTH_SESSION);
      MMKVStorage.delete(StorageKeys.AUTH_USER);
      MMKVStorage.delete(StorageKeys.AUTH_TOKENS);
    },
  });

  return {
    // 認証状態
    isAuthenticated,
    user,
    isLoading: isLoading || signInMutation.isPending || signUpMutation.isPending,
    error,
    authStatusDetails, // 詳細認証状態を追加

    // 認証メソッド
    signIn: async (email: string, password: string) => {
      const result = await signInMutation.mutateAsync({ email, password });
      return { error: result.success ? undefined : new Error(result.error) };
    },
    
    signUp: async (email: string, password: string) => {
      const result = await signUpMutation.mutateAsync({ email, password });
      return { error: result.success ? undefined : new Error(result.error) };
    },
    
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },

    // ミューテーション状態
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
};

// ログインフォーム専用フック
export const useLoginFormHook = () => {
  const form = useLoginForm();
  const actions = useLoginFormActions();
  
  const signInMutation = useSignInMutation();
  const signIn = signInMutation.mutateAsync;
  const isSigningIn = signInMutation.isPending;

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      actions.setLoginError('email', 'メールアドレスを入力してください');
      return;
    }
    if (!form.password.trim()) {
      actions.setLoginError('password', 'パスワードを入力してください');
      return;
    }

    actions.setLoginSubmitting(true);
    
    try {
      const result = await signIn({ email: form.email, password: form.password });
      
      if (!result.success) {
        actions.setLoginError('general', result.error || 'ログインに失敗しました');
      } else {
        // 成功時はフォームをクリア
        actions.clearLoginForm();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログイン中にエラーが発生しました';
      actions.setLoginError('general', errorMessage);
    } finally {
      actions.setLoginSubmitting(false);
    }
  }, [form.email, form.password, signIn, actions]);

  return {
    form,
    actions: {
      updateEmail: (email: string) => actions.updateLoginForm({ email }),
      updatePassword: (password: string) => actions.updateLoginForm({ password }),
      handleSubmit,
      clearForm: actions.clearLoginForm,
    },
    isSubmitting: isSigningIn || form.isSubmitting,
  };
};

// サインアップフォーム専用フック
export const useSignUpFormHook = () => {
  const form = useSignUpForm();
  const actions = useSignUpFormActions();
  
  const signUpMutation = useSignUpMutation();
  const signUp = signUpMutation.mutateAsync;
  const isSigningUp = signUpMutation.isPending;

  const handleSubmit = useCallback(async () => {
    // バリデーション
    if (!form.email.trim()) {
      actions.setSignUpError('email', 'メールアドレスを入力してください');
      return;
    }
    if (!form.password.trim()) {
      actions.setSignUpError('password', 'パスワードを入力してください');
      return;
    }
    if (form.password !== form.confirmPassword) {
      actions.setSignUpError('confirmPassword', 'パスワードが一致しません');
      return;
    }
    if (form.password.length < 8) {
      actions.setSignUpError('password', 'パスワードは8文字以上で入力してください');
      return;
    }

    actions.setSignUpSubmitting(true);
    
    try {
      const result = await signUp({ email: form.email, password: form.password });
      
      if (!result.success) {
        actions.setSignUpError('general', result.error || 'サインアップに失敗しました');
      } else {
        // 成功時はフォームをクリア
        actions.clearSignUpForm();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'サインアップ中にエラーが発生しました';
      actions.setSignUpError('general', errorMessage);
    } finally {
      actions.setSignUpSubmitting(false);
    }
  }, [form.email, form.password, form.confirmPassword, signUp, actions]);

  return {
    form,
    actions: {
      updateEmail: (email: string) => actions.updateSignUpForm({ email }),
      updatePassword: (password: string) => actions.updateSignUpForm({ password }),
      updateConfirmPassword: (confirmPassword: string) => 
        actions.updateSignUpForm({ confirmPassword }),
      handleSubmit,
      clearForm: actions.clearSignUpForm,
    },
    isSubmitting: isSigningUp || form.isSubmitting,
  };
};

// 設定関連のフック
export const useAuthSettingsHook = () => {
  const settings = useAuthSettings();
  const actions = useAuthActions();

  // MMKV から設定を復元
  useEffect(() => {
    const biometricEnabled = MMKVStorage.getBoolean(StorageKeys.BIOMETRIC_ENABLED) ?? false;
    const autoLoginEnabled = MMKVStorage.getBoolean(StorageKeys.AUTO_LOGIN_ENABLED) ?? false;
    
    actions.setBiometricEnabled(biometricEnabled);
    actions.setAutoLoginEnabled(autoLoginEnabled);
  }, [actions]);

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    MMKVStorage.setBoolean(StorageKeys.BIOMETRIC_ENABLED, enabled);
    actions.setBiometricEnabled(enabled);
  }, [actions]);

  const setAutoLoginEnabled = useCallback((enabled: boolean) => {
    MMKVStorage.setBoolean(StorageKeys.AUTO_LOGIN_ENABLED, enabled);
    actions.setAutoLoginEnabled(enabled);
  }, [actions]);

  return {
    ...settings,
    setBiometricEnabled,
    setAutoLoginEnabled,
  };
};

// モーダル制御のフック
export const useAuthModalsHook = () => {
  const modals = useAuthModals();
  const actions = useAuthActions();
  const passwordResetMutation = usePasswordResetMutation();

  const showPasswordResetModal = useCallback(() => {
    actions.setPasswordResetModal(true);
  }, [actions]);

  const hidePasswordResetModal = useCallback(() => {
    actions.setPasswordResetModal(false);
  }, [actions]);

  const showEmailVerificationModal = useCallback(() => {
    actions.setEmailVerificationModal(true);
  }, [actions]);

  const hideEmailVerificationModal = useCallback(() => {
    actions.setEmailVerificationModal(false);
  }, [actions]);

  return {
    ...modals,
    showPasswordResetModal,
    hidePasswordResetModal,
    showEmailVerificationModal,
    hideEmailVerificationModal,
    sendPasswordReset: passwordResetMutation.mutate,
    isSendingPasswordReset: passwordResetMutation.isPending,
  };
};

// 最後にログインしたメールアドレスを取得
export const useLastLoginEmail = () => {
  return MMKVStorage.getString(StorageKeys.LAST_LOGIN_EMAIL) || '';
};

// メール認証フロー統合フック
export const useEmailVerificationHook = () => {
  const emailVerificationState = useEmailVerificationState();
  const emailVerificationActions = useEmailVerificationActions();
  
  const verifyOTPMutation = useVerifyOTPMutation();
  const resendVerificationEmailMutation = useResendVerificationEmailMutation();
  
  // クールダウンタイマー管理
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (emailVerificationState.resendCooldown > 0) {
      timer = setTimeout(() => {
        emailVerificationActions.setEmailVerificationResendCooldown(
          emailVerificationState.resendCooldown - 1
        );
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [emailVerificationState.resendCooldown, emailVerificationActions]);

  // OTP検証処理
  const verifyOTPCode = useCallback(async (email: string, code: string) => {
    emailVerificationActions.setEmailVerificationIsVerifying(true);
    emailVerificationActions.setEmailVerificationErrors({});
    
    try {
      const result = await verifyOTPMutation.mutateAsync({
        email,
        token: code,
        type: 'signup',
      });
      
      if (!result.success) {
        emailVerificationActions.setEmailVerificationErrors({
          code: result.error || 'OTP検証に失敗しました',
        });
        return { success: false, error: result.error };
      }
      
      // 検証成功時はエラーをクリア
      emailVerificationActions.setEmailVerificationErrors({});
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'OTP検証中にエラーが発生しました';
      
      emailVerificationActions.setEmailVerificationErrors({
        general: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      emailVerificationActions.setEmailVerificationIsVerifying(false);
    }
  }, [verifyOTPMutation, emailVerificationActions]);

  // メール再送信処理
  const resendVerificationEmail = useCallback(async (email: string) => {
    if (emailVerificationState.resendCooldown > 0) {
      return { success: false, error: 'まだクールダウン中です' };
    }
    
    emailVerificationActions.setEmailVerificationIsResending(true);
    emailVerificationActions.setEmailVerificationErrors({});
    
    try {
      const result = await resendVerificationEmailMutation.mutateAsync({ email });
      
      if (!result.success) {
        emailVerificationActions.setEmailVerificationErrors({
          general: result.error || 'メール再送信に失敗しました',
        });
        return { success: false, error: result.error };
      }
      
      // 再送信成功時
      emailVerificationActions.setEmailVerificationLastSentEmail(email);
      emailVerificationActions.setEmailVerificationResendCooldown(60); // 60秒クールダウン
      emailVerificationActions.setEmailVerificationErrors({});
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'メール再送信中にエラーが発生しました';
      
      emailVerificationActions.setEmailVerificationErrors({
        general: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      emailVerificationActions.setEmailVerificationIsResending(false);
    }
  }, [
    emailVerificationState.resendCooldown,
    resendVerificationEmailMutation,
    emailVerificationActions,
  ]);

  // コード更新
  const updateVerificationCode = useCallback((code: string) => {
    emailVerificationActions.setEmailVerificationCode(code);
    // コード更新時はエラーをクリア
    if (emailVerificationState.errors.code) {
      emailVerificationActions.setEmailVerificationErrors({ code: undefined });
    }
  }, [emailVerificationActions, emailVerificationState.errors.code]);

  // エラークリア
  const clearErrors = useCallback(() => {
    emailVerificationActions.setEmailVerificationErrors({});
  }, [emailVerificationActions]);

  // コードリセット
  const resetVerificationCode = useCallback(() => {
    emailVerificationActions.setEmailVerificationCode('');
    emailVerificationActions.setEmailVerificationErrors({});
  }, [emailVerificationActions]);

  return {
    // 状態
    ...emailVerificationState,
    
    // ミューテーション状態
    isVerifyingOTP: verifyOTPMutation.isPending,
    isResendingEmail: resendVerificationEmailMutation.isPending,
    
    // アクション
    verifyOTPCode,
    resendVerificationEmail,
    updateVerificationCode,
    clearErrors,
    resetVerificationCode,
  };
};