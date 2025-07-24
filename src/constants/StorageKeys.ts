/**
 * MMKV ストレージキーを集約管理
 * StateManagement.md の規約に基づき、すべてのキーをここに定義
 */
export const StorageKeys = {
  // 認証関連
  AUTH: {
    SETTINGS: 'auth-settings',
    LAST_LOGIN_EMAIL: 'auth-last-login-email',
  },
  
  // 位置情報関連
  LOCATION: {
    SETTINGS: 'location-settings',
    UPDATE_INTERVAL: 'location-update-interval',
    HIGH_ACCURACY_MODE: 'location-high-accuracy-mode',
  },
  
  // レイヤー関連
  LAYERS: {
    SETTINGS: 'layers-settings',
    SELECTED_IDS: 'layers-selected-ids',
    FAVORITE_IDS: 'layers-favorite-ids',
    DEFAULT_IDS: 'layers-default-ids',
  },
  
  // 地図関連
  MAP: {
    SETTINGS: 'map-settings',
    MAP_TYPE: 'map-type',
    SHOW_USER_LOCATION: 'map-show-user-location',
  },
  
  // アプリ全般
  APP: {
    FIRST_LAUNCH: 'app-first-launch',
    LOCALE: 'app-locale',
    THEME: 'app-theme',
  },
} as const;

// 型安全性のためのユーティリティ型
type StorageKeysType = typeof StorageKeys;
type StorageKeyCategory = keyof StorageKeysType;
type StorageKeyValue<T extends StorageKeyCategory> = StorageKeysType[T][keyof StorageKeysType[T]];

export type StorageKey = 
  | StorageKeyValue<'AUTH'>
  | StorageKeyValue<'LOCATION'>
  | StorageKeyValue<'LAYERS'>
  | StorageKeyValue<'MAP'>
  | StorageKeyValue<'APP'>;