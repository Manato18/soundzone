import { supabase } from '../../../shared/services/supabase';
import { QueryUser } from '../domain/entities/User';

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
        return {
          success: false,
          error: this.translateError(error.message),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'ログインに失敗しました',
        };
      }

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
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
        return {
          success: false,
          error: this.translateError(error.message),
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

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
        needsEmailVerification: !data.session, // セッションがない場合はメール認証が必要
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        needsEmailVerification: false,
      };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(this.translateError(error.message));
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
        return {
          success: false,
          error: this.translateError(error.message),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'OTP検証に失敗しました',
        };
      }

      return {
        success: true,
        data: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP検証中にエラーが発生しました',
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw new Error(this.translateError(error.message));
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      throw new Error(this.translateError(error.message));
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

  private translateError(error: string): string {
    // エラーメッセージの日本語化
    const errorMap: Record<string, string> = {
      'Invalid email or password': 'メールアドレスまたはパスワードが正しくありません',
      'Email not confirmed': 'メールアドレスが認証されていません',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
      'Invalid OTP': '認証コードが正しくありません',
      'Token has expired': '認証コードの有効期限が切れています',
    };

    return errorMap[error] || error;
  }
}

// シングルトンインスタンス
export const authService = new SupabaseAuthService();