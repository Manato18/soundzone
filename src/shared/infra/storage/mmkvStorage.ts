import { MMKV } from 'react-native-mmkv';
import { encryptionKeyManager } from '../security/encryptionKeyManager';

// MMKVインスタンスの動的初期化
let storage: MMKV | null = null;

export async function initializeStorage(): Promise<MMKV> {
  if (storage) {
    return storage;
  }

  try {
    const encryptionKey = await encryptionKeyManager.getOrCreateEncryptionKey();
    storage = new MMKV({
      id: 'soundzone-storage',
      encryptionKey,
    });
    return storage;
  } catch (error) {
    console.error('Failed to initialize secure storage:', error);
    // フォールバック: 暗号化なしでストレージを初期化
    storage = new MMKV({
      id: 'soundzone-storage',
    });
    return storage;
  }
}

// 既存のコードとの互換性のため、同期的なgetter
export function getStorage(): MMKV {
  if (!storage) {
    // 初期化されていない場合は、暗号化なしでストレージを作成（フォールバック）
    console.warn('[MMKVStorage] Storage accessed before initialization. Creating unencrypted storage.');
    storage = new MMKV({
      id: 'soundzone-storage',
    });
  }
  return storage;
}

// タイプセーフなストレージヘルパー
export class MMKVStorage {
  static setString(key: string, value: string): void {
    getStorage().set(key, value);
  }

  static getString(key: string): string | undefined {
    return getStorage().getString(key);
  }

  static setObject<T>(key: string, value: T): void {
    getStorage().set(key, JSON.stringify(value));
  }

  static getObject<T>(key: string): T | undefined {
    const value = getStorage().getString(key);
    if (!value) return undefined;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`MMKVStorage: Failed to parse object for key ${key}:`, error);
      return undefined;
    }
  }

  static setBoolean(key: string, value: boolean): void {
    getStorage().set(key, value);
  }

  static getBoolean(key: string): boolean | undefined {
    return getStorage().getBoolean(key);
  }

  static setNumber(key: string, value: number): void {
    getStorage().set(key, value);
  }

  static getNumber(key: string): number | undefined {
    return getStorage().getNumber(key);
  }

  static delete(key: string): void {
    getStorage().delete(key);
  }

  static contains(key: string): boolean {
    return getStorage().contains(key);
  }

  static clearAll(): void {
    getStorage().clearAll();
  }

  static getAllKeys(): string[] {
    return getStorage().getAllKeys();
  }
}

// 認証関連のキー定数
export const StorageKeys = {
  AUTH_SESSION: 'auth_session',
  AUTH_USER: 'auth_user',
  AUTH_TOKENS: 'auth_tokens',
  LAST_LOGIN_EMAIL: 'last_login_email',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  AUTO_LOGIN_ENABLED: 'auto_login_enabled',
} as const;

// Zustand persist middleware用のアダプター
export const mmkvStorage = {
  getItem: (name: string) => {
    try {
      const value = getStorage().getString(name);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('mmkvStorage.getItem error:', error);
      return null;
    }
  },
  setItem: (name: string, value: unknown) => {
    try {
      getStorage().set(name, JSON.stringify(value));
    } catch (error) {
      console.error('mmkvStorage.setItem error:', error);
    }
  },
  removeItem: (name: string) => {
    try {
      getStorage().delete(name);
    } catch (error) {
      console.error('mmkvStorage.removeItem error:', error);
    }
  },
};