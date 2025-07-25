import { supabase } from '../../../../shared/services/supabase';
import { QueryUser } from '../../domain/entities/User';
import { sessionPersistence } from './sessionPersistence';
import { errorSanitizer } from './errorSanitizer';

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const sanitized = errorSanitizer.sanitize(error);
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
      const sanitized = errorSanitizer.sanitize(error);
      return {
        success: false,
        error: sanitized.message,
      };
    }
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        const sanitized = errorSanitizer.sanitize(error);
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
      const sanitized = errorSanitizer.sanitize(error);
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
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });

      if (error) {
        const sanitized = errorSanitizer.sanitize(error);
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

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      const sanitized = errorSanitizer.sanitize(error);
      return {
        success: false,
        error: sanitized.message,
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
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