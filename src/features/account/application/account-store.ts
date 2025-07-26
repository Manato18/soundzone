import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { mmkvStorage } from '../../../shared/infra/storage/mmkvStorage';
import { QueryProfile } from '../domain/entities/Profile';

// Application Layer: プロフィール管理の状態
export interface AccountState {
  // サーバー状態（TanStack Queryと同期）
  profile: QueryProfile | null;
  
  // プロフィール作成フォームUI状態
  ui: {
    profileCreationForm: {
      displayName: string;
      bio: string;
      avatarPreviewUrl?: string;  // アップロード前のプレビュー
      avatarLocalUri?: string;    // ローカルに選択した画像のURI
      avatarLocalBlob?: Blob;     // アップロード用のBlobデータ
      isSubmitting: boolean;
      errors: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        general?: string;
      };
    };
    
    avatarUpload: {
      isUploading: boolean;
      uploadProgress: number;
      uploadedUrl?: string;      // Supabase Storage URL
      error?: string;
    };
  };
  
  // 設定（永続化対象）
  settings: {
    hasCompletedProfile: boolean;  // プロフィール作成完了フラグ
  };
}

export interface AccountActions {
  // プロフィール状態
  setProfile: (profile: QueryProfile | null) => void;
  
  // プロフィール作成フォーム
  updateProfileCreationForm: (updates: Partial<AccountState['ui']['profileCreationForm']>) => void;
  setDisplayName: (displayName: string) => void;
  setBio: (bio: string) => void;
  setAvatarLocalData: (uri: string, blob: Blob) => void;
  setProfileCreationError: (field: keyof AccountState['ui']['profileCreationForm']['errors'], error?: string) => void;
  clearProfileCreationErrors: () => void;
  setProfileCreationSubmitting: (isSubmitting: boolean) => void;
  resetProfileCreationForm: () => void;
  
  // アバターアップロード
  setAvatarPreviewUrl: (url?: string) => void;
  setAvatarUploading: (isUploading: boolean) => void;
  setAvatarUploadProgress: (progress: number) => void;
  setAvatarUploadedUrl: (url?: string) => void;
  setAvatarUploadError: (error?: string) => void;
  resetAvatarUpload: () => void;
  
  // 設定
  setHasCompletedProfile: (completed: boolean) => void;
  
  // ユーティリティ
  reset: () => void;
}

// 初期状態
const initialState: AccountState = {
  profile: null,
  ui: {
    profileCreationForm: {
      displayName: '',
      bio: '',
      avatarPreviewUrl: undefined,
      avatarLocalUri: undefined,
      avatarLocalBlob: undefined,
      isSubmitting: false,
      errors: {},
    },
    avatarUpload: {
      isUploading: false,
      uploadProgress: 0,
      uploadedUrl: undefined,
      error: undefined,
    },
  },
  settings: {
    hasCompletedProfile: false,
  },
};

// メインストア（middleware順序: devtools → persist → immer → subscribeWithSelector）
// StateManagement.mdに従った順序
export const useAccountStore = create<AccountState & AccountActions>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set) => ({
          ...initialState,

          // プロフィール状態
          setProfile: (profile) => {
            set((state) => {
              state.profile = profile;
              // プロフィールが設定されたら完了フラグを立てる
              if (profile) {
                state.settings.hasCompletedProfile = true;
              }
            });
          },

          // プロフィール作成フォーム
          updateProfileCreationForm: (updates) =>
            set((state) => {
              // 更新を適用
              Object.assign(state.ui.profileCreationForm, updates);
              // 個別のフィールドのエラーのみクリア
              if ('displayName' in updates && state.ui.profileCreationForm.errors.displayName) {
                delete state.ui.profileCreationForm.errors.displayName;
              }
              if ('bio' in updates && state.ui.profileCreationForm.errors.bio) {
                delete state.ui.profileCreationForm.errors.bio;
              }
              if (('avatarLocalUri' in updates || 'avatarLocalBlob' in updates) && state.ui.profileCreationForm.errors.avatar) {
                delete state.ui.profileCreationForm.errors.avatar;
              }
            }),

          // 個別フィールド更新（再レンダリング最適化）
          setDisplayName: (displayName) => {
            set((state) => {
              state.ui.profileCreationForm.displayName = displayName;
              if (state.ui.profileCreationForm.errors.displayName) {
                delete state.ui.profileCreationForm.errors.displayName;
              }
            });
          },

          setBio: (bio) =>
            set((state) => {
              state.ui.profileCreationForm.bio = bio;
              if (state.ui.profileCreationForm.errors.bio) {
                delete state.ui.profileCreationForm.errors.bio;
              }
            }),

          setAvatarLocalData: (uri, blob) => {
            set((state) => {
              state.ui.profileCreationForm.avatarLocalUri = uri;
              state.ui.profileCreationForm.avatarLocalBlob = blob;
              if (state.ui.profileCreationForm.errors.avatar) {
                delete state.ui.profileCreationForm.errors.avatar;
              }
            });
          },

          setProfileCreationError: (field, error) =>
            set((state) => {
              if (error === undefined) {
                delete state.ui.profileCreationForm.errors[field];
              } else {
                state.ui.profileCreationForm.errors[field] = error;
              }
            }),

          clearProfileCreationErrors: () =>
            set((state) => {
              state.ui.profileCreationForm.errors = {};
            }),

          setProfileCreationSubmitting: (isSubmitting) =>
            set((state) => {
              state.ui.profileCreationForm.isSubmitting = isSubmitting;
            }),

          resetProfileCreationForm: () =>
            set((state) => {
              state.ui.profileCreationForm = initialState.ui.profileCreationForm;
              state.ui.avatarUpload = initialState.ui.avatarUpload;
            }),

          // アバターアップロード
          setAvatarPreviewUrl: (url) =>
            set((state) => {
              state.ui.profileCreationForm.avatarPreviewUrl = url;
              // プレビューURLが設定されたらアバターエラーをクリア
              if (url) {
                delete state.ui.profileCreationForm.errors.avatar;
              }
            }),

          setAvatarUploading: (isUploading) =>
            set((state) => {
              state.ui.avatarUpload.isUploading = isUploading;
            }),

          setAvatarUploadProgress: (progress) =>
            set((state) => {
              state.ui.avatarUpload.uploadProgress = progress;
            }),

          setAvatarUploadedUrl: (url) =>
            set((state) => {
              state.ui.avatarUpload.uploadedUrl = url;
              // アップロード完了時
              if (url) {
                state.ui.avatarUpload.error = undefined;
                state.ui.avatarUpload.uploadProgress = 100;
              }
            }),

          setAvatarUploadError: (error) =>
            set((state) => {
              state.ui.avatarUpload.error = error;
              if (error) {
                state.ui.avatarUpload.isUploading = false;
                state.ui.avatarUpload.uploadProgress = 0;
              }
            }),

          resetAvatarUpload: () =>
            set((state) => {
              state.ui.avatarUpload = initialState.ui.avatarUpload;
            }),

          // 設定
          setHasCompletedProfile: (completed) =>
            set((state) => {
              state.settings.hasCompletedProfile = completed;
            }),

          // ユーティリティ
          reset: () =>
            set((state) => {
              // プロフィール情報とUIをリセット
              state.profile = null;
              state.ui = initialState.ui;
              // 設定もリセット（ログアウト時）
              state.settings = initialState.settings;
            }),
        }))
      ),
      {
        name: 'account-storage',
        storage: mmkvStorage,
        // 永続化する部分のみを指定（StateManagement.mdに従う）
        partialize: (state) => ({
          settings: state.settings,
        }),
        // 永続化されていない状態を初期値にマージしない
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...persistedState,
        }),
      }
    ),
    {
      name: 'account-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// セレクター（再描画最適化）
export const useAccountProfile = () => useAccountStore((state) => state.profile);
export const useHasCompletedProfile = () => useAccountStore((state) => state.settings.hasCompletedProfile);
export const useProfileCreationForm = () => useAccountStore((state) => state.ui.profileCreationForm, shallow);
export const useAvatarUpload = () => useAccountStore((state) => state.ui.avatarUpload, shallow);
export const useAccountSettings = () => useAccountStore((state) => state.settings, shallow);

// 個別フィールドセレクター（さらなる最適化）
export const useDisplayName = () => useAccountStore((state) => state.ui.profileCreationForm.displayName);
export const useBio = () => useAccountStore((state) => state.ui.profileCreationForm.bio);
export const useAvatarLocalUri = () => useAccountStore((state) => state.ui.profileCreationForm.avatarLocalUri);
export const useProfileCreationErrors = () => useAccountStore((state) => state.ui.profileCreationForm.errors, shallow);
export const useIsSubmitting = () => useAccountStore((state) => state.ui.profileCreationForm.isSubmitting);

// アクションセレクター
export const useAccountActions = () => {
  const store = useAccountStore();
  return {
    setProfile: store.setProfile,
    updateProfileCreationForm: store.updateProfileCreationForm,
    setDisplayName: store.setDisplayName,
    setBio: store.setBio,
    setAvatarLocalData: store.setAvatarLocalData,
    setProfileCreationError: store.setProfileCreationError,
    clearProfileCreationErrors: store.clearProfileCreationErrors,
    setProfileCreationSubmitting: store.setProfileCreationSubmitting,
    resetProfileCreationForm: store.resetProfileCreationForm,
    setAvatarPreviewUrl: store.setAvatarPreviewUrl,
    setAvatarUploading: store.setAvatarUploading,
    setAvatarUploadProgress: store.setAvatarUploadProgress,
    setAvatarUploadedUrl: store.setAvatarUploadedUrl,
    setAvatarUploadError: store.setAvatarUploadError,
    resetAvatarUpload: store.resetAvatarUpload,
    setHasCompletedProfile: store.setHasCompletedProfile,
    reset: store.reset,
  };
};