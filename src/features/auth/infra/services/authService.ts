import { supabase } from '../../../../shared/services/supabase';
import { QueryUser } from '../../domain/entities/User';
import { sessionPersistence } from './sessionPersistence';
import { errorSanitizer, ErrorCategory } from './errorSanitizer';
import { networkService } from '../../../../shared/services/networkService';

// Infrastructure Layer: 外部サービス（Supabase）との連携
export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult<QueryUser>>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<QueryUser | null>;
  verifyOTP(email: string, token: string, type: 'signup' | 'email' | 'recovery'): Promise<AuthResult<QueryUser>>;
  resendVerificationEmail(email: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SignUpResult extends AuthResult<QueryUser> {
  needsEmailVerification?: boolean;
}

// Supabase実装
export class SupabaseAuthService implements AuthService {
  async signIn(email: string, password: string): Promise<AuthResult<QueryUser>> {
    try {
      // オフラインチェック
      const isConnected = await networkService.isNetworkConnected();
      if (!isConnected) {
        return {
          success: false,
          error: 'インターネット接続がありません',
        };
      }

      // タイムアウト付きでAPIコール
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('接続がタイムアウトしました')), 30000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

      if (error) {
        // ネットワークエラーの特別な処理
        if (networkService.isNetworkError(error)) {
          return {
            success: false,
            error: 'インターネット接続エラーが発生しました。接続を確認してください。',
          };
        }

        const sanitized = errorSanitizer.sanitize(error);
        // エラーカテゴリに基づいた詳細メッセージ
        if (sanitized.category === ErrorCategory.NETWORK) {
          return {
            success: false,
            error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
          };
        }
        
        return {
          success: false,
          error: sanitized.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'ログインに失敗しました',
        };
      }

      // セッションを永続化
      if (data.session) {
        await sessionPersistence.persistSession(data.session);
      }

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      // ネットワークエラーの特別な処理
      if (networkService.isNetworkError(error)) {
        return {
          success: false,
          error: 'インターネット接続エラーが発生しました。接続を確認してください。',
        };
      }

      const sanitized = errorSanitizer.sanitize(error);
      // エラーカテゴリに基づいた詳細メッセージ
      if (sanitized.category === ErrorCategory.NETWORK) {
        return {
          success: false,
          error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
        };
      }

      return {
        success: false,
        error: sanitized.message,
      };
    }
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    try {
      // オフラインチェック
      const isConnected = await networkService.isNetworkConnected();
      if (!isConnected) {
        return {
          success: false,
          error: 'インターネット接続がありません',
          needsEmailVerification: false,
        };
      }

      // タイムアウト付きでAPIコール
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('接続がタイムアウトしました')), 30000);
      });

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
      });

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);

      if (error) {
        // ネットワークエラーの特別な処理
        if (networkService.isNetworkError(error)) {
          return {
            success: false,
            error: 'インターネット接続エラーが発生しました。接続を確認してください。',
            needsEmailVerification: false,
          };
        }

        const sanitized = errorSanitizer.sanitize(error);
        // エラーカテゴリに基づいた詳細メッセージ
        if (sanitized.category === ErrorCategory.NETWORK) {
          return {
            success: false,
            error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
            needsEmailVerification: false,
          };
        }

        return {
          success: false,
          error: sanitized.message,
          needsEmailVerification: false,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'サインアップに失敗しました',
          needsEmailVerification: false,
        };
      }

      // セッションがある場合は永続化
      if (data.session) {
        await sessionPersistence.persistSession(data.session);
      }

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
        needsEmailVerification: !data.session, // セッションがない場合はメール認証が必要
      };
    } catch (error) {
      // ネットワークエラーの特別な処理
      if (networkService.isNetworkError(error)) {
        return {
          success: false,
          error: 'インターネット接続エラーが発生しました。接続を確認してください。',
          needsEmailVerification: false,
        };
      }

      const sanitized = errorSanitizer.sanitize(error);
      // エラーカテゴリに基づいた詳細メッセージ
      if (sanitized.category === ErrorCategory.NETWORK) {
        return {
          success: false,
          error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
          needsEmailVerification: false,
        };
      }

      return {
        success: false,
        error: sanitized.message,
        needsEmailVerification: false,
      };
    }
  }

  async signOut(): Promise<void> {
    // セッション情報をクリア
    await sessionPersistence.clearPersistedSession();
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      const sanitized = errorSanitizer.sanitize(error);
      throw new Error(sanitized.message);
    }
  }

  async getCurrentUser(): Promise<QueryUser | null> {
    // このメソッドはReact Queryのキャッシュ用に使用される
    // 実際の認証状態の管理はauthStateManagerが行う
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return null;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return null;
      }

      return this.mapSupabaseUser(user);
    } catch (error) {
      console.error('getCurrentUser error:', error);
      return null;
    }
  }

  async verifyOTP(email: string, token: string, type: 'signup' | 'email' | 'recovery'): Promise<AuthResult<QueryUser>> {
    try {
      // オフラインチェック
      const isConnected = await networkService.isNetworkConnected();
      if (!isConnected) {
        return {
          success: false,
          error: 'インターネット接続がありません',
        };
      }

      // タイムアウト付きでAPIコール
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('接続がタイムアウトしました')), 30000);
      });

      const verifyPromise = supabase.auth.verifyOtp({
        email,
        token,
        type,
      });

      const { data, error } = await Promise.race([verifyPromise, timeoutPromise]);

      console.log('[AuthService] verifyOTP response:', {
        data: data ? {
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at
          } : null,
          session: !!data.session
        } : null,
        error
      });

      if (error) {
        // ネットワークエラーの特別な処理
        if (networkService.isNetworkError(error)) {
          return {
            success: false,
            error: 'インターネット接続エラーが発生しました。接続を確認してください。',
          };
        }

        const sanitized = errorSanitizer.sanitize(error);
        if (sanitized.category === ErrorCategory.NETWORK) {
          return {
            success: false,
            error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
          };
        }

        return {
          success: false,
          error: sanitized.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'OTP検証に失敗しました',
        };
      }

      // OTP検証後のセッションを永続化
      if (data.session) {
        await sessionPersistence.persistSession(data.session);
      }

      // OTP検証後は最新のユーザー情報を取得
      // email_confirmed_atが即座に反映されない可能性があるため
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      console.log('[AuthService] Refreshed user after OTP:', {
        id: refreshedUser?.id,
        email: refreshedUser?.email,
        email_confirmed_at: refreshedUser?.email_confirmed_at
      });

      return {
        success: true,
        data: this.mapSupabaseUser(refreshedUser || data.user),
      };
    } catch (error) {
      // ネットワークエラーの特別な処理
      if (networkService.isNetworkError(error)) {
        return {
          success: false,
          error: 'インターネット接続エラーが発生しました。接続を確認してください。',
        };
      }

      const sanitized = errorSanitizer.sanitize(error);
      if (sanitized.category === ErrorCategory.NETWORK) {
        return {
          success: false,
          error: sanitized.details ? `${sanitized.message}\n${sanitized.details}` : sanitized.message,
        };
      }

      return {
        success: false,
        error: sanitized.message,
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    // オフラインチェック
    const isConnected = await networkService.isNetworkConnected();
    if (!isConnected) {
      throw new Error('インターネット接続がありません');
    }

    try {
      // タイムアウト付きでAPIコール
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('接続がタイムアウトしました')), 30000);
      });

      const resendPromise = supabase.auth.resend({
        type: 'signup',
        email,
      });

      const { error } = await Promise.race([resendPromise, timeoutPromise]);

      if (error) {
        // ネットワークエラーの特別な処理
        if (networkService.isNetworkError(error)) {
          throw new Error('インターネット接続エラーが発生しました。接続を確認してください。');
        }

        const sanitized = errorSanitizer.sanitize(error);
        if (sanitized.category === ErrorCategory.NETWORK && sanitized.details) {
          throw new Error(`${sanitized.message}\n${sanitized.details}`);
        }
        throw new Error(sanitized.message);
      }
    } catch (error) {
      // ネットワークエラーの特別な処理
      if (networkService.isNetworkError(error)) {
        throw new Error('インターネット接続エラーが発生しました。接続を確認してください。');
      }

      if (error instanceof Error) {
        throw error;
      }

      const sanitized = errorSanitizer.sanitize(error);
      throw new Error(sanitized.message);
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      const sanitized = errorSanitizer.sanitize(error);
      throw new Error(sanitized.message);
    }
  }

  private mapSupabaseUser(user: any): QueryUser {
    return {
      id: user.id,
      email: user.email || '',
      emailVerified: user.email_confirmed_at !== null,
      name: user.user_metadata?.name,
      avatarUrl: user.user_metadata?.avatar_url,
    };
  }

  // translateErrorメソッドは削除（errorSanitizerが代替）
}

// シングルトンインスタンス
export const authService = new SupabaseAuthService();