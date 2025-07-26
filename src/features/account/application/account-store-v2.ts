import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { mmkvStorage } from '../../../shared/infra/storage/mmkvStorage';

// Application Layer: プロフィール作成フォームのUI状態管理
// 注意: サーバー状態（profile）はTanStack Queryで管理
export interface AccountFormState {
  // フォームUI状態（非永続）
  profileCreationForm: {
    displayName: string;
    bio: string;
    avatarUri?: string;        // 表示用URI（Blobは別管理）
    isSubmitting: boolean;
    errors: {
      displayName?: string;
      bio?: string;
      avatar?: string;
      general?: string;
    };
  };
  
  // アップロード状態（非永続）
  avatarUpload: {
    isUploading: boolean;
    uploadProgress: number;
    uploadedUrl?: string;
    error?: string;
  };
  
  // 設定（永続化対象）
  settings: {
    hasCompletedProfile: boolean;
  };
}

export interface AccountFormActions {
  // フォーム更新（統合関数）
  updateForm: (updates: Partial<AccountFormState['profileCreationForm']>) => void;
  setFormError: (field: keyof AccountFormState['profileCreationForm']['errors'], error?: string) => void;
  clearFormErrors: () => void;
  resetForm: () => void;
  
  // アップロード管理
  setUploadState: (state: Partial<AccountFormState['avatarUpload']>) => void;
  
  // 設定
  setHasCompletedProfile: (completed: boolean) => void;
  
  // 全体リセット
  reset: () => void;
}

// 初期状態
const initialState: AccountFormState = {
  profileCreationForm: {
    displayName: '',
    bio: '',
    avatarUri: undefined,
    isSubmitting: false,
    errors: {},
  },
  avatarUpload: {
    isUploading: false,
    uploadProgress: 0,
    uploadedUrl: undefined,
    error: undefined,
  },
  settings: {
    hasCompletedProfile: false,
  },
};

// Zustandストア（StateManagement.mdの原則に従う）
export const useAccountFormStore = create<AccountFormState & AccountFormActions>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set) => ({
          ...initialState,

          // フォーム更新（統合関数でシンプルに）
          updateForm: (updates) =>
            set((state) => {
              Object.assign(state.profileCreationForm, updates);
              // エラーの自動クリア
              if ('displayName' in updates) {
                delete state.profileCreationForm.errors.displayName;
              }
              if ('bio' in updates) {
                delete state.profileCreationForm.errors.bio;
              }
              if ('avatarUri' in updates) {
                delete state.profileCreationForm.errors.avatar;
              }
            }),

          setFormError: (field, error) =>
            set((state) => {
              if (error === undefined) {
                delete state.profileCreationForm.errors[field];
              } else {
                state.profileCreationForm.errors[field] = error;
              }
            }),

          clearFormErrors: () =>
            set((state) => {
              state.profileCreationForm.errors = {};
            }),

          resetForm: () =>
            set((state) => {
              state.profileCreationForm = initialState.profileCreationForm;
              state.avatarUpload = initialState.avatarUpload;
            }),

          // アップロード状態管理
          setUploadState: (uploadState) =>
            set((state) => {
              Object.assign(state.avatarUpload, uploadState);
            }),

          // 設定
          setHasCompletedProfile: (completed) =>
            set((state) => {
              state.settings.hasCompletedProfile = completed;
            }),

          // 全体リセット（ログアウト時など）
          reset: () =>
            set(() => initialState),
        }))
      ),
      {
        name: 'account-form-storage',
        storage: mmkvStorage,
        partialize: (state) => ({
          settings: state.settings, // 設定のみ永続化
        }),
      }
    ),
    {
      name: 'account-form-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// セレクター（再レンダリング最適化）
export const useProfileCreationForm = () => 
  useAccountFormStore((state) => state.profileCreationForm, shallow);

export const useAvatarUploadState = () => 
  useAccountFormStore((state) => state.avatarUpload, shallow);

export const useHasCompletedProfile = () => 
  useAccountFormStore((state) => state.settings.hasCompletedProfile);

// アクションセレクター
export const useAccountFormActions = () => 
  useAccountFormStore((state) => ({
    updateForm: state.updateForm,
    setFormError: state.setFormError,
    clearFormErrors: state.clearFormErrors,
    resetForm: state.resetForm,
    setUploadState: state.setUploadState,
    setHasCompletedProfile: state.setHasCompletedProfile,
    reset: state.reset,
  }), shallow);