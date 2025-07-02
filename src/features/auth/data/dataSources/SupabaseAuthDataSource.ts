import { supabase } from '../../../../shared/services/supabase';
import { NetworkError, SignInFailedError, SignUpFailedError } from '../../domain/errors/AuthErrors';

// Supabaseレスポンス型定義
export interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
}

export interface SupabaseAuthResponse {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
}

export class SupabaseAuthDataSource {
  async signUp(email: string, password: string): Promise<SupabaseAuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] signUp エラー:', error);
        throw new SignUpFailedError(this.translateSupabaseError(error.message));
      }

      return {
        user: data.user as SupabaseUser,
        session: data.session as SupabaseSession,
      };

    } catch (error) {
      console.error('❌ [SupabaseAuth] signUp キャッチエラー:', error);
      if (error instanceof SignUpFailedError) {
        throw error;
      }
      throw new NetworkError();
    }
  }

  async signIn(email: string, password: string): Promise<SupabaseAuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] signIn エラー:', error);
        
        // メール未認証の場合は専用エラーを投げる
        if (error.message.includes('Email not confirmed')) {
          throw new Error('EMAIL_NOT_CONFIRMED');
        }
        
        throw new SignInFailedError();
      }

      return {
        user: data.user as SupabaseUser,
        session: data.session as SupabaseSession,
      };

    } catch (error) {
      console.error('❌ [SupabaseAuth] signIn キャッチエラー:', error);
      
      if (error instanceof SignInFailedError) {
        throw error;
      }
      
      // メール未認証エラーの特別処理
      if (error instanceof Error && error.message === 'EMAIL_NOT_CONFIRMED') {
        throw error;
      }
      
      throw new NetworkError();
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('❌ [SupabaseAuth] signOut エラー:', error);
      throw new NetworkError();
    }
  }

  async getCurrentSession(): Promise<SupabaseSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ [SupabaseAuth] getCurrentSession エラー:', error);
        throw new Error(error.message);
      }

      return session as SupabaseSession;

    } catch (error) {
      console.error('❌ [SupabaseAuth] getCurrentSession キャッチエラー:', error);
      throw new NetworkError();
    }
  }

  async getCurrentUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('❌ [SupabaseAuth] getCurrentUser エラー:', error);
        throw new Error(error.message);
      }

      return user as SupabaseUser;

    } catch (error) {
      console.error('❌ [SupabaseAuth] getCurrentUser キャッチエラー:', error);
      throw new NetworkError();
    }
  }

  async refreshSession(): Promise<SupabaseSession> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        throw new Error(error?.message || 'セッションの更新に失敗しました');
      }

      return data.session as SupabaseSession;

    } catch (error) {
      console.error('❌ [SupabaseAuth] refreshSession エラー:', error);
      throw new NetworkError();
    }
  }

  onAuthStateChange(callback: (session: SupabaseSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(session as SupabaseSession | null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }

  private translateSupabaseError(errorMessage: string): string {
    // Supabaseのエラーメッセージを日本語に翻訳
    if (errorMessage.includes('User already registered')) {
      return '既に登録済みのメールアドレスです';
    }
    if (errorMessage.includes('Password should be at least 6 characters')) {
      return 'パスワードは6文字以上である必要があります';
    }
    if (errorMessage.includes('Invalid email')) {
      return '無効なメールアドレス形式です';
    }
    if (errorMessage.includes('signup is disabled')) {
      return '現在新規登録を停止しています';
    }
    
    return errorMessage;
  }
} 