import { MMKVStorage, StorageKeys } from '../../../../shared/infra/storage/mmkvStorage';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/valueObjects/Email';

// セッション情報の型定義
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number; // Unix timestamp
  user: StoredUser;
}

// ストレージ用のユーザー情報
export interface StoredUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  profile?: {
    name?: string;
    avatarUrl?: string;
  };
}

// 認証トークン情報
export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

// 認証ストレージクラス
export class AuthStorage {
  // セッション情報の保存
  static saveSession(session: StoredSession): void {
    try {
      MMKVStorage.setObject(StorageKeys.AUTH_SESSION, session);
      // ユーザー情報も別途保存（クエリ効率化のため）
      MMKVStorage.setObject(StorageKeys.AUTH_USER, session.user);
      // トークン情報も別途保存
      MMKVStorage.setObject(StorageKeys.AUTH_TOKENS, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error('AuthStorage: Failed to save session:', error);
      throw new Error('セッション保存に失敗しました');
    }
  }

  // セッション情報の取得
  static getSession(): StoredSession | null {
    try {
      const session = MMKVStorage.getObject<StoredSession>(StorageKeys.AUTH_SESSION);
      
      // セッションが存在しない、または期限切れの場合
      if (!session || this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('AuthStorage: Failed to get session:', error);
      this.clearSession(); // エラー時はクリア
      return null;
    }
  }

  // ユーザー情報の取得
  static getUser(): StoredUser | null {
    try {
      const user = MMKVStorage.getObject<StoredUser>(StorageKeys.AUTH_USER);
      
      // セッションが有効な場合のみユーザー情報を返す
      const session = this.getSession();
      if (!session) {
        return null;
      }
      
      return user || null;
    } catch (error) {
      console.error('AuthStorage: Failed to get user:', error);
      return null;
    }
  }

  // トークン情報の取得
  static getTokens(): StoredAuthTokens | null {
    try {
      const tokens = MMKVStorage.getObject<StoredAuthTokens>(StorageKeys.AUTH_TOKENS);
      
      if (!tokens || this.isTokenExpired(tokens)) {
        return null;
      }
      
      return tokens;
    } catch (error) {
      console.error('AuthStorage: Failed to get tokens:', error);
      return null;
    }
  }

  // セッション情報の削除
  static clearSession(): void {
    try {
      MMKVStorage.delete(StorageKeys.AUTH_SESSION);
      MMKVStorage.delete(StorageKeys.AUTH_USER);
      MMKVStorage.delete(StorageKeys.AUTH_TOKENS);
    } catch (error) {
      console.error('AuthStorage: Failed to clear session:', error);
    }
  }

  // ユーザー情報の更新
  static updateUser(user: StoredUser): void {
    try {
      const session = this.getSession();
      if (session) {
        const updatedSession: StoredSession = {
          ...session,
          user: user,
        };
        this.saveSession(updatedSession);
      } else {
        MMKVStorage.setObject(StorageKeys.AUTH_USER, user);
      }
    } catch (error) {
      console.error('AuthStorage: Failed to update user:', error);
      throw new Error('ユーザー情報更新に失敗しました');
    }
  }

  // トークンの更新（リフレッシュ時）
  static updateTokens(tokens: StoredAuthTokens): void {
    try {
      MMKVStorage.setObject(StorageKeys.AUTH_TOKENS, tokens);
      
      // セッション情報も更新
      const session = this.getSession();
      if (session) {
        const updatedSession: StoredSession = {
          ...session,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          expiresIn: Math.floor((tokens.expiresAt - Date.now()) / 1000),
        };
        this.saveSession(updatedSession);
      }
    } catch (error) {
      console.error('AuthStorage: Failed to update tokens:', error);
      throw new Error('トークン更新に失敗しました');
    }
  }

  // セッションの有効期限チェック
  static isSessionExpired(session: StoredSession): boolean {
    return session.expiresAt <= Date.now();
  }

  // トークンの有効期限チェック
  static isTokenExpired(tokens: StoredAuthTokens): boolean {
    // 5分前をバッファとして設定
    const bufferTime = 5 * 60 * 1000;
    return tokens.expiresAt - bufferTime <= Date.now();
  }

  // セッション有効性チェック
  static isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && !this.isSessionExpired(session);
  }

  // 自動ログイン可能かチェック
  static canAutoLogin(): boolean {
    const autoLoginEnabled = MMKVStorage.getBoolean(StorageKeys.AUTO_LOGIN_ENABLED) ?? false;
    return autoLoginEnabled && this.isSessionValid();
  }

  // Domainエンティティへの変換ヘルパー
  static storedUserToUser(storedUser: StoredUser): User {
    return User.reconstruct({
      id: storedUser.id,
      email: Email.create(storedUser.email),
      emailVerified: storedUser.emailVerified,
      createdAt: new Date(storedUser.createdAt),
      updatedAt: new Date(storedUser.updatedAt),
      profile: storedUser.profile,
    });
  }

  // Domainエンティティからの変換ヘルパー
  static userToStoredUser(user: User): StoredUser {
    return {
      id: user.id,
      email: user.email.value,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile: user.profile,
    };
  }

  // デバッグ用：ストレージ内容の確認
  static getStorageInfo(): {
    hasSession: boolean;
    hasUser: boolean;
    hasTokens: boolean;
    sessionValid: boolean;
    autoLoginEnabled: boolean;
  } {
    return {
      hasSession: MMKVStorage.contains(StorageKeys.AUTH_SESSION),
      hasUser: MMKVStorage.contains(StorageKeys.AUTH_USER),
      hasTokens: MMKVStorage.contains(StorageKeys.AUTH_TOKENS),
      sessionValid: this.isSessionValid(),
      autoLoginEnabled: MMKVStorage.getBoolean(StorageKeys.AUTO_LOGIN_ENABLED) ?? false,
    };
  }
}