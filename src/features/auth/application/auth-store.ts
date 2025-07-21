import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MMKVStorage, StorageKeys } from '../../../shared/infra/storage/mmkvStorage';
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

    settings: {
      biometricEnabled: boolean;
      autoLoginEnabled: boolean;
      isFirstLaunch: boolean;
    };
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

  // ユーティリティ
  reset: () => void;
  loadPersistentSettings: () => void;
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
    settings: {
      biometricEnabled: false,
      autoLoginEnabled: false,
      isFirstLaunch: true,
    },
  },
};

// メインストア
export const useAuthStore = create<AuthState & AuthActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // サーバー状態更新
    setUser: (user) => {
      set((state) => ({ 
        ...state,
        user,
        isAuthenticated: !!user,
      }));
      
      // 最後のログインメールを保存
      if (user?.email) {
        MMKVStorage.setString(StorageKeys.LAST_LOGIN_EMAIL, user.email);
      }
    },

    setAuthenticated: (isAuthenticated) =>
      set((state) => ({ ...state, isAuthenticated })),

    // ログインフォーム
    updateLoginForm: (updates) =>
      set((state) => ({
        ui: {
          ...state.ui,
          loginForm: {
            ...state.ui.loginForm,
            ...updates,
            // 入力時にエラーをクリア
            errors: (updates.email !== undefined || updates.password !== undefined) 
              ? {} 
              : state.ui.loginForm.errors,
          },
        },
      })),

    setLoginError: (field, error) =>
      set((state) => ({
        ui: {
          ...state.ui,
          loginForm: {
            ...state.ui.loginForm,
            errors: {
              ...state.ui.loginForm.errors,
              [field]: error,
            },
          },
        },
      })),

    clearLoginForm: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          loginForm: initialState.ui.loginForm,
        },
      })),

    setLoginSubmitting: (isSubmitting) =>
      set((state) => ({
        ui: {
          ...state.ui,
          loginForm: {
            ...state.ui.loginForm,
            isSubmitting,
          },
        },
      })),

    // サインアップフォーム
    updateSignUpForm: (updates) =>
      set((state) => ({
        ui: {
          ...state.ui,
          signUpForm: {
            ...state.ui.signUpForm,
            ...updates,
            errors: (updates.email !== undefined || updates.password !== undefined || updates.confirmPassword !== undefined)
              ? {}
              : state.ui.signUpForm.errors,
          },
        },
      })),

    setSignUpError: (field, error) =>
      set((state) => ({
        ui: {
          ...state.ui,
          signUpForm: {
            ...state.ui.signUpForm,
            errors: {
              ...state.ui.signUpForm.errors,
              [field]: error,
            },
          },
        },
      })),

    clearSignUpForm: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          signUpForm: initialState.ui.signUpForm,
        },
      })),

    setSignUpSubmitting: (isSubmitting) =>
      set((state) => ({
        ui: {
          ...state.ui,
          signUpForm: {
            ...state.ui.signUpForm,
            isSubmitting,
          },
        },
      })),

    // メール認証
    setEmailVerificationEmail: (email) =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            email,
          },
        },
      })),

    setVerificationCode: (code) =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            verificationCode: code,
            // コード入力時にコードエラーをクリア
            errors: {
              ...state.ui.emailVerification.errors,
              code: undefined,
            },
          },
        },
      })),

    setVerificationError: (field, error) =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            errors: {
              ...state.ui.emailVerification.errors,
              [field]: error,
            },
          },
        },
      })),

    setVerificationSubmitting: (isVerifying) =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            isVerifying,
          },
        },
      })),

    setResending: (isResending) =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            isResending,
          },
        },
      })),

    startResendCooldown: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            resendCooldown: 60,
            lastSentAt: new Date(),
          },
        },
      })),

    decrementResendCooldown: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...state.ui.emailVerification,
            resendCooldown: Math.max(0, state.ui.emailVerification.resendCooldown - 1),
          },
        },
      })),

    clearEmailVerificationForm: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          emailVerification: {
            ...initialState.ui.emailVerification,
            email: state.ui.emailVerification.email, // メールアドレスは保持
          },
        },
      })),

    // モーダル
    showPasswordResetModal: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            showPasswordReset: true,
          },
        },
      })),

    hidePasswordResetModal: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            showPasswordReset: false,
          },
        },
      })),

    showEmailVerificationModal: (email) =>
      set((state) => ({
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            showEmailVerification: true,
          },
          emailVerification: {
            ...state.ui.emailVerification,
            email: email || state.ui.emailVerification.email,
          },
        },
      })),

    hideEmailVerificationModal: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            showEmailVerification: false,
          },
        },
      })),

    // 設定
    setBiometricEnabled: (enabled) => {
      MMKVStorage.setBoolean(StorageKeys.BIOMETRIC_ENABLED, enabled);
      set((state) => ({
        ui: {
          ...state.ui,
          settings: {
            ...state.ui.settings,
            biometricEnabled: enabled,
          },
        },
      }));
    },

    setAutoLoginEnabled: (enabled) => {
      MMKVStorage.setBoolean(StorageKeys.AUTO_LOGIN_ENABLED, enabled);
      set((state) => ({
        ui: {
          ...state.ui,
          settings: {
            ...state.ui.settings,
            autoLoginEnabled: enabled,
          },
        },
      }));
    },

    setFirstLaunch: (isFirst) =>
      set((state) => ({
        ui: {
          ...state.ui,
          settings: {
            ...state.ui.settings,
            isFirstLaunch: isFirst,
          },
        },
      })),

    // ユーティリティ
    reset: () => {
      // 認証情報とUIをリセット（設定は保持）
      set((state) => ({
        ...initialState,
        ui: {
          ...initialState.ui,
          settings: state.ui.settings, // 設定は保持
        },
      }));
      
      // MMKVから認証関連データを削除
      MMKVStorage.delete(StorageKeys.AUTH_SESSION);
      MMKVStorage.delete(StorageKeys.AUTH_USER);
      MMKVStorage.delete(StorageKeys.AUTH_TOKENS);
    },

    loadPersistentSettings: () => {
      set((state) => ({
        ui: {
          ...state.ui,
          settings: {
            ...state.ui.settings,
            biometricEnabled: MMKVStorage.getBoolean(StorageKeys.BIOMETRIC_ENABLED) ?? false,
            autoLoginEnabled: MMKVStorage.getBoolean(StorageKeys.AUTO_LOGIN_ENABLED) ?? false,
          },
          loginForm: {
            ...state.ui.loginForm,
            email: MMKVStorage.getString(StorageKeys.LAST_LOGIN_EMAIL) || '',
          },
        },
      }));
    },
  }))
);

// セレクター（再描画最適化）
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useLoginForm = () => useAuthStore((state) => state.ui.loginForm);
export const useSignUpForm = () => useAuthStore((state) => state.ui.signUpForm);
export const useEmailVerification = () => useAuthStore((state) => state.ui.emailVerification);
export const useAuthModals = () => useAuthStore((state) => state.ui.modals);
export const useAuthSettings = () => useAuthStore((state) => state.ui.settings);

// 個別のアクションセレクター（再描画最適化）
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
export const useReset = () => useAuthStore((state) => state.reset);
export const useLoadPersistentSettings = () => useAuthStore((state) => state.loadPersistentSettings);

// 統合アクションセレクター（後方互換性のため維持）
export const useAuthActions = () => useAuthStore((state) => ({
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  updateLoginForm: state.updateLoginForm,
  setLoginError: state.setLoginError,
  clearLoginForm: state.clearLoginForm,
  setLoginSubmitting: state.setLoginSubmitting,
  updateSignUpForm: state.updateSignUpForm,
  setSignUpError: state.setSignUpError,
  clearSignUpForm: state.clearSignUpForm,
  setSignUpSubmitting: state.setSignUpSubmitting,
  setEmailVerificationEmail: state.setEmailVerificationEmail,
  setVerificationCode: state.setVerificationCode,
  setVerificationError: state.setVerificationError,
  setVerificationSubmitting: state.setVerificationSubmitting,
  setResending: state.setResending,
  startResendCooldown: state.startResendCooldown,
  decrementResendCooldown: state.decrementResendCooldown,
  clearEmailVerificationForm: state.clearEmailVerificationForm,
  showPasswordResetModal: state.showPasswordResetModal,
  hidePasswordResetModal: state.hidePasswordResetModal,
  showEmailVerificationModal: state.showEmailVerificationModal,
  hideEmailVerificationModal: state.hideEmailVerificationModal,
  setBiometricEnabled: state.setBiometricEnabled,
  setAutoLoginEnabled: state.setAutoLoginEnabled,
  setFirstLaunch: state.setFirstLaunch,
  reset: state.reset,
  loadPersistentSettings: state.loadPersistentSettings,
}));