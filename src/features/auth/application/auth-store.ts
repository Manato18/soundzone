import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { mmkvStorage } from '../../../shared/infra/storage/mmkvStorage';
import { QueryUser } from '../domain/entities/User';

// Application Layer: ビジネスロジックと状態管理
export interface AuthState {
  // サーバー状態（TanStack Queryと同期）
  user: QueryUser | null;
  isAuthenticated: boolean;
  
  // UI状態（フォーム・モーダルなど）
  ui: {
    loginForm: {
      email: string;
      password: string;
      isSubmitting: boolean;
      errors: {
        email?: string;
        password?: string;
        general?: string;
      };
    };
    
    signUpForm: {
      email: string;
      password: string;
      confirmPassword: string;
      isSubmitting: boolean;
      errors: {
        email?: string;
        password?: string;
        confirmPassword?: string;
        general?: string;
      };
    };

    emailVerification: {
      email?: string;
      verificationCode: string;
      isVerifying: boolean;
      isResending: boolean;
      resendCooldown: number;
      lastSentAt?: Date;
      errors: {
        code?: string;
        general?: string;
      };
    };

    modals: {
      showPasswordReset: boolean;
      showEmailVerification: boolean;
    };
  };

  // 永続化する設定（persist対象）
  settings: {
    biometricEnabled: boolean;
    autoLoginEnabled: boolean;
    isFirstLaunch: boolean;
    lastLoginEmail?: string;
  };
}

export interface AuthActions {
  // サーバー状態更新
  setUser: (user: QueryUser | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  
  // ログインフォーム
  updateLoginForm: (updates: Partial<AuthState['ui']['loginForm']>) => void;
  setLoginError: (field: keyof AuthState['ui']['loginForm']['errors'], error?: string) => void;
  clearLoginForm: () => void;
  setLoginSubmitting: (isSubmitting: boolean) => void;
  
  // サインアップフォーム
  updateSignUpForm: (updates: Partial<AuthState['ui']['signUpForm']>) => void;
  setSignUpError: (field: keyof AuthState['ui']['signUpForm']['errors'], error?: string) => void;
  clearSignUpForm: () => void;
  setSignUpSubmitting: (isSubmitting: boolean) => void;

  // メール認証
  setEmailVerificationEmail: (email: string) => void;
  setVerificationCode: (code: string) => void;
  setVerificationError: (field: keyof AuthState['ui']['emailVerification']['errors'], error?: string) => void;
  setVerificationSubmitting: (isVerifying: boolean) => void;
  setResending: (isResending: boolean) => void;
  startResendCooldown: () => void;
  decrementResendCooldown: () => void;
  clearEmailVerificationForm: () => void;

  // モーダル
  showPasswordResetModal: () => void;
  hidePasswordResetModal: () => void;
  showEmailVerificationModal: (email?: string) => void;
  hideEmailVerificationModal: () => void;

  // 設定
  setBiometricEnabled: (enabled: boolean) => void;
  setAutoLoginEnabled: (enabled: boolean) => void;
  setFirstLaunch: (isFirst: boolean) => void;
  setLastLoginEmail: (email?: string) => void;

  // ユーティリティ
  reset: () => void;
}

// 初期状態
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  ui: {
    loginForm: {
      email: '',
      password: '',
      isSubmitting: false,
      errors: {},
    },
    signUpForm: {
      email: '',
      password: '',
      confirmPassword: '',
      isSubmitting: false,
      errors: {},
    },
    emailVerification: {
      verificationCode: '',
      isVerifying: false,
      isResending: false,
      resendCooldown: 0,
      errors: {},
    },
    modals: {
      showPasswordReset: false,
      showEmailVerification: false,
    },
  },
  settings: {
    biometricEnabled: false,
    autoLoginEnabled: false,
    isFirstLaunch: true,
  },
};

// mmkvStorageはインポート済みなので、ここでの定義は不要

// メインストア（middleware順序: devtools → persist → immer → subscribeWithSelector）
export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set) => ({
          ...initialState,

          // サーバー状態更新
          setUser: (user) => {
            set((state) => {
              state.user = user;
              state.isAuthenticated = !!user;
              
              // 最後のログインメールを設定に保存
              if (user?.email) {
                state.settings.lastLoginEmail = user.email;
              }
            });
          },

          setAuthenticated: (isAuthenticated) =>
            set((state) => {
              state.isAuthenticated = isAuthenticated;
            }),

          // ログインフォーム（immerによる簡潔な更新）
          updateLoginForm: (updates) =>
            set((state) => {
              Object.assign(state.ui.loginForm, updates);
              
              // 入力時にエラーをクリア
              if (updates.email !== undefined || updates.password !== undefined) {
                state.ui.loginForm.errors = {};
              }
            }),

          setLoginError: (field, error) =>
            set((state) => {
              if (error === undefined) {
                delete state.ui.loginForm.errors[field];
              } else {
                state.ui.loginForm.errors[field] = error;
              }
            }),

          clearLoginForm: () =>
            set((state) => {
              state.ui.loginForm = {
                ...initialState.ui.loginForm,
                email: state.settings.lastLoginEmail || '',
              };
            }),

          setLoginSubmitting: (isSubmitting) =>
            set((state) => {
              state.ui.loginForm.isSubmitting = isSubmitting;
            }),

          // サインアップフォーム
          updateSignUpForm: (updates) =>
            set((state) => {
              Object.assign(state.ui.signUpForm, updates);
              
              if (updates.email !== undefined || updates.password !== undefined || updates.confirmPassword !== undefined) {
                state.ui.signUpForm.errors = {};
              }
            }),

          setSignUpError: (field, error) =>
            set((state) => {
              if (error === undefined) {
                delete state.ui.signUpForm.errors[field];
              } else {
                state.ui.signUpForm.errors[field] = error;
              }
            }),

          clearSignUpForm: () =>
            set((state) => {
              state.ui.signUpForm = initialState.ui.signUpForm;
            }),

          setSignUpSubmitting: (isSubmitting) =>
            set((state) => {
              state.ui.signUpForm.isSubmitting = isSubmitting;
            }),

          // メール認証
          setEmailVerificationEmail: (email) =>
            set((state) => {
              state.ui.emailVerification.email = email;
            }),

          setVerificationCode: (code) =>
            set((state) => {
              state.ui.emailVerification.verificationCode = code;
              // コード入力時にコードエラーをクリア
              delete state.ui.emailVerification.errors.code;
            }),

          setVerificationError: (field, error) =>
            set((state) => {
              if (error === undefined) {
                delete state.ui.emailVerification.errors[field];
              } else {
                state.ui.emailVerification.errors[field] = error;
              }
            }),

          setVerificationSubmitting: (isVerifying) =>
            set((state) => {
              state.ui.emailVerification.isVerifying = isVerifying;
            }),

          setResending: (isResending) =>
            set((state) => {
              state.ui.emailVerification.isResending = isResending;
            }),

          startResendCooldown: () =>
            set((state) => {
              state.ui.emailVerification.resendCooldown = 60;
              state.ui.emailVerification.lastSentAt = new Date();
            }),

          decrementResendCooldown: () =>
            set((state) => {
              state.ui.emailVerification.resendCooldown = Math.max(0, state.ui.emailVerification.resendCooldown - 1);
            }),

          clearEmailVerificationForm: () =>
            set((state) => {
              const email = state.ui.emailVerification.email;
              state.ui.emailVerification = {
                ...initialState.ui.emailVerification,
                email, // メールアドレスは保持
              };
            }),

          // モーダル
          showPasswordResetModal: () =>
            set((state) => {
              state.ui.modals.showPasswordReset = true;
            }),

          hidePasswordResetModal: () =>
            set((state) => {
              state.ui.modals.showPasswordReset = false;
            }),

          showEmailVerificationModal: (email) =>
            set((state) => {
              state.ui.modals.showEmailVerification = true;
              if (email) {
                state.ui.emailVerification.email = email;
              }
            }),

          hideEmailVerificationModal: () =>
            set((state) => {
              state.ui.modals.showEmailVerification = false;
            }),

          // 設定
          setBiometricEnabled: (enabled) =>
            set((state) => {
              state.settings.biometricEnabled = enabled;
            }),

          setAutoLoginEnabled: (enabled) =>
            set((state) => {
              state.settings.autoLoginEnabled = enabled;
            }),

          setFirstLaunch: (isFirst) =>
            set((state) => {
              state.settings.isFirstLaunch = isFirst;
            }),

          setLastLoginEmail: (email) =>
            set((state) => {
              state.settings.lastLoginEmail = email;
            }),

          // ユーティリティ
          reset: () =>
            set((state) => {
              // 設定以外をリセット
              state.user = null;
              state.isAuthenticated = false;
              state.ui = initialState.ui;
              // 設定は保持（lastLoginEmailも含む）
            }),
        }))
      ),
      {
        name: 'auth-storage',
        storage: mmkvStorage,
        // 永続化する部分のみを指定
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// セレクター（再描画最適化 - shallow比較を使用）
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

// 複数の値を返すセレクターはshallow比較を使用
export const useLoginForm = () => useAuthStore((state) => state.ui.loginForm);

export const useSignUpForm = () => useAuthStore((state) => state.ui.signUpForm);

export const useEmailVerification = () => useAuthStore((state) => state.ui.emailVerification);

export const useAuthModals = () => useAuthStore((state) => state.ui.modals);

export const useAuthSettings = () => useAuthStore((state) => state.settings);

// アクションセレクター（個別）
export const useAuthActions = () => {
  const store = useAuthStore();
  return {
    setUser: store.setUser,
    setAuthenticated: store.setAuthenticated,
    updateLoginForm: store.updateLoginForm,
    setLoginError: store.setLoginError,
    clearLoginForm: store.clearLoginForm,
    setLoginSubmitting: store.setLoginSubmitting,
    updateSignUpForm: store.updateSignUpForm,
    setSignUpError: store.setSignUpError,
    clearSignUpForm: store.clearSignUpForm,
    setSignUpSubmitting: store.setSignUpSubmitting,
    setEmailVerificationEmail: store.setEmailVerificationEmail,
    setVerificationCode: store.setVerificationCode,
    setVerificationError: store.setVerificationError,
    setVerificationSubmitting: store.setVerificationSubmitting,
    setResending: store.setResending,
    startResendCooldown: store.startResendCooldown,
    decrementResendCooldown: store.decrementResendCooldown,
    clearEmailVerificationForm: store.clearEmailVerificationForm,
    showPasswordResetModal: store.showPasswordResetModal,
    hidePasswordResetModal: store.hidePasswordResetModal,
    showEmailVerificationModal: store.showEmailVerificationModal,
    hideEmailVerificationModal: store.hideEmailVerificationModal,
    setBiometricEnabled: store.setBiometricEnabled,
    setAutoLoginEnabled: store.setAutoLoginEnabled,
    setFirstLaunch: store.setFirstLaunch,
    setLastLoginEmail: store.setLastLoginEmail,
    reset: store.reset,
  };
};

// 個別のアクションセレクター（後方互換性のため維持）
export const useSetUser = () => useAuthStore((state) => state.setUser);
export const useSetAuthenticated = () => useAuthStore((state) => state.setAuthenticated);
export const useUpdateLoginForm = () => useAuthStore((state) => state.updateLoginForm);
export const useSetLoginError = () => useAuthStore((state) => state.setLoginError);
export const useClearLoginForm = () => useAuthStore((state) => state.clearLoginForm);
export const useSetLoginSubmitting = () => useAuthStore((state) => state.setLoginSubmitting);
export const useUpdateSignUpForm = () => useAuthStore((state) => state.updateSignUpForm);
export const useSetSignUpError = () => useAuthStore((state) => state.setSignUpError);
export const useClearSignUpForm = () => useAuthStore((state) => state.clearSignUpForm);
export const useSetSignUpSubmitting = () => useAuthStore((state) => state.setSignUpSubmitting);
export const useSetEmailVerificationEmail = () => useAuthStore((state) => state.setEmailVerificationEmail);
export const useSetVerificationCode = () => useAuthStore((state) => state.setVerificationCode);
export const useSetVerificationError = () => useAuthStore((state) => state.setVerificationError);
export const useSetVerificationSubmitting = () => useAuthStore((state) => state.setVerificationSubmitting);
export const useSetResending = () => useAuthStore((state) => state.setResending);
export const useStartResendCooldown = () => useAuthStore((state) => state.startResendCooldown);
export const useDecrementResendCooldown = () => useAuthStore((state) => state.decrementResendCooldown);
export const useClearEmailVerificationForm = () => useAuthStore((state) => state.clearEmailVerificationForm);
export const useShowPasswordResetModal = () => useAuthStore((state) => state.showPasswordResetModal);
export const useHidePasswordResetModal = () => useAuthStore((state) => state.hidePasswordResetModal);
export const useShowEmailVerificationModal = () => useAuthStore((state) => state.showEmailVerificationModal);
export const useHideEmailVerificationModal = () => useAuthStore((state) => state.hideEmailVerificationModal);
export const useSetBiometricEnabled = () => useAuthStore((state) => state.setBiometricEnabled);
export const useSetAutoLoginEnabled = () => useAuthStore((state) => state.setAutoLoginEnabled);
export const useSetFirstLaunch = () => useAuthStore((state) => state.setFirstLaunch);
export const useSetLastLoginEmail = () => useAuthStore((state) => state.setLastLoginEmail);
export const useReset = () => useAuthStore((state) => state.reset);