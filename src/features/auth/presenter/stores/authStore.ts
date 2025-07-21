import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// UI状態のインターフェース
export interface AuthUIState {
  // フォーム状態
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

  // 全般UI状態
  isFirstLaunch: boolean;
  biometricEnabled: boolean;
  autoLoginEnabled: boolean;
  
  // モーダル・画面状態
  showPasswordResetModal: boolean;
  showEmailVerificationModal: boolean;
}

// アクション（状態更新メソッド）のインターフェース
export interface AuthUIActions {
  // ログインフォームアクション
  updateLoginForm: (updates: Partial<AuthUIState['loginForm']>) => void;
  setLoginError: (field: keyof AuthUIState['loginForm']['errors'], error?: string) => void;
  clearLoginForm: () => void;
  setLoginSubmitting: (isSubmitting: boolean) => void;

  // サインアップフォームアクション
  updateSignUpForm: (updates: Partial<AuthUIState['signUpForm']>) => void;
  setSignUpError: (field: keyof AuthUIState['signUpForm']['errors'], error?: string) => void;
  clearSignUpForm: () => void;
  setSignUpSubmitting: (isSubmitting: boolean) => void;

  // 設定アクション
  setBiometricEnabled: (enabled: boolean) => void;
  setAutoLoginEnabled: (enabled: boolean) => void;
  setFirstLaunch: (isFirst: boolean) => void;

  // モーダルアクション
  setPasswordResetModal: (show: boolean) => void;
  setEmailVerificationModal: (show: boolean) => void;

  // リセット
  resetAuthState: () => void;
}

// 初期状態
const initialState: AuthUIState = {
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
  isFirstLaunch: true,
  biometricEnabled: false,
  autoLoginEnabled: false,
  showPasswordResetModal: false,
  showEmailVerificationModal: false,
};

// Zustandストア
export const useAuthStore = create<AuthUIState & AuthUIActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ログインフォームアクション
    updateLoginForm: (updates) =>
      set((state) => ({
        loginForm: {
          ...state.loginForm,
          ...updates,
          // フォーム更新時はエラーをクリア
          errors: updates.email || updates.password 
            ? {} 
            : state.loginForm.errors,
        },
      })),

    setLoginError: (field, error) =>
      set((state) => ({
        loginForm: {
          ...state.loginForm,
          errors: {
            ...state.loginForm.errors,
            [field]: error,
          },
        },
      })),

    clearLoginForm: () =>
      set((state) => ({
        loginForm: {
          ...initialState.loginForm,
        },
      })),

    setLoginSubmitting: (isSubmitting) =>
      set((state) => ({
        loginForm: {
          ...state.loginForm,
          isSubmitting,
        },
      })),

    // サインアップフォームアクション
    updateSignUpForm: (updates) =>
      set((state) => ({
        signUpForm: {
          ...state.signUpForm,
          ...updates,
          // フォーム更新時はエラーをクリア
          errors: updates.email || updates.password || updates.confirmPassword
            ? {}
            : state.signUpForm.errors,
        },
      })),

    setSignUpError: (field, error) =>
      set((state) => ({
        signUpForm: {
          ...state.signUpForm,
          errors: {
            ...state.signUpForm.errors,
            [field]: error,
          },
        },
      })),

    clearSignUpForm: () =>
      set((state) => ({
        signUpForm: {
          ...initialState.signUpForm,
        },
      })),

    setSignUpSubmitting: (isSubmitting) =>
      set((state) => ({
        signUpForm: {
          ...state.signUpForm,
          isSubmitting,
        },
      })),

    // 設定アクション
    setBiometricEnabled: (enabled) =>
      set({ biometricEnabled: enabled }),

    setAutoLoginEnabled: (enabled) =>
      set({ autoLoginEnabled: enabled }),

    setFirstLaunch: (isFirst) =>
      set({ isFirstLaunch: isFirst }),

    // モーダルアクション
    setPasswordResetModal: (show) =>
      set({ showPasswordResetModal: show }),

    setEmailVerificationModal: (show) =>
      set({ showEmailVerificationModal: show }),

    // リセット
    resetAuthState: () =>
      set(initialState),
  }))
);

// セレクター（再描画最適化）
export const useLoginForm = () => useAuthStore((state) => state.loginForm);
export const useSignUpForm = () => useAuthStore((state) => state.signUpForm);
export const useAuthSettings = () => useAuthStore((state) => ({
  biometricEnabled: state.biometricEnabled,
  autoLoginEnabled: state.autoLoginEnabled,
  isFirstLaunch: state.isFirstLaunch,
}));
export const useAuthModals = () => useAuthStore((state) => ({
  showPasswordResetModal: state.showPasswordResetModal,
  showEmailVerificationModal: state.showEmailVerificationModal,
}));

// ログインフォーム個別アクションセレクター（再描画最適化）
export const useLoginFormActions = () => ({
  updateLoginForm: useAuthStore((state) => state.updateLoginForm),
  setLoginError: useAuthStore((state) => state.setLoginError),
  clearLoginForm: useAuthStore((state) => state.clearLoginForm),
  setLoginSubmitting: useAuthStore((state) => state.setLoginSubmitting),
});

// サインアップフォーム個別アクションセレクター（再描画最適化）
export const useSignUpFormActions = () => ({
  updateSignUpForm: useAuthStore((state) => state.updateSignUpForm),
  setSignUpError: useAuthStore((state) => state.setSignUpError),
  clearSignUpForm: useAuthStore((state) => state.clearSignUpForm),
  setSignUpSubmitting: useAuthStore((state) => state.setSignUpSubmitting),
});

// アクションセレクター（後方互換性のため維持）
export const useAuthActions = () => useAuthStore((state) => ({
  updateLoginForm: state.updateLoginForm,
  setLoginError: state.setLoginError,
  clearLoginForm: state.clearLoginForm,
  setLoginSubmitting: state.setLoginSubmitting,
  updateSignUpForm: state.updateSignUpForm,
  setSignUpError: state.setSignUpError,
  clearSignUpForm: state.clearSignUpForm,
  setSignUpSubmitting: state.setSignUpSubmitting,
  setBiometricEnabled: state.setBiometricEnabled,
  setAutoLoginEnabled: state.setAutoLoginEnabled,
  setFirstLaunch: state.setFirstLaunch,
  setPasswordResetModal: state.setPasswordResetModal,
  setEmailVerificationModal: state.setEmailVerificationModal,
  resetAuthState: state.resetAuthState,
}));