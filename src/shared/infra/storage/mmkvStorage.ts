import { MMKV } from 'react-native-mmkv';

// MMKVインスタンスの設定
export const storage = new MMKV({
  id: 'soundzone-storage',
  encryptionKey: 'soundzone-app-encryption-key',
});

// タイプセーフなストレージヘルパー
export class MMKVStorage {
  static setString(key: string, value: string): void {
    storage.set(key, value);
  }

  static getString(key: string): string | undefined {
    return storage.getString(key);
  }

  static setObject<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value));
  }

  static getObject<T>(key: string): T | undefined {
    const value = storage.getString(key);
    if (!value) return undefined;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`MMKVStorage: Failed to parse object for key ${key}:`, error);
      return undefined;
    }
  }

  static setBoolean(key: string, value: boolean): void {
    storage.set(key, value);
  }

  static getBoolean(key: string): boolean | undefined {
    return storage.getBoolean(key);
  }

  static setNumber(key: string, value: number): void {
    storage.set(key, value);
  }

  static getNumber(key: string): number | undefined {
    return storage.getNumber(key);
  }

  static delete(key: string): void {
    storage.delete(key);
  }

  static contains(key: string): boolean {
    return storage.contains(key);
  }

  static clearAll(): void {
    storage.clearAll();
  }

  static getAllKeys(): string[] {
    return storage.getAllKeys();
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
    const value = storage.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};