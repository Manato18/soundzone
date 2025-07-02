import { User } from '../../domain/entities/User';
import { UserNotFoundError } from '../../domain/errors/AuthErrors';
import {
    AuthRepository,
    AuthSession,
    SignInResult,
    SignUpResult
} from '../../domain/repositories/AuthRepository';
import { Email } from '../../domain/valueObjects/Email';
import { Password } from '../../domain/valueObjects/Password';
import {
    SupabaseAuthDataSource,
    SupabaseSession,
    SupabaseUser
} from '../dataSources/SupabaseAuthDataSource';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly dataSource: SupabaseAuthDataSource) {}

  async signUp(email: Email, password: Password): Promise<SignUpResult> {
    const response = await this.dataSource.signUp(email.value, password.value);
    
    if (!response.user) {
      throw new Error('ユーザー作成に失敗しました');
    }

    const user = this.mapSupabaseUserToUser(response.user);
    const session = response.session ? this.mapSupabaseSessionToAuthSession(response.session, user) : undefined;

    return {
      user,
      session,
      needsEmailVerification: !user.emailVerified,
    };
  }

  async signIn(email: Email, password: Password): Promise<SignInResult> {
    const response = await this.dataSource.signIn(email.value, password.value);
    
    if (!response.user || !response.session) {
      throw new Error('ログインに失敗しました');
    }

    const user = this.mapSupabaseUserToUser(response.user);
    const session = this.mapSupabaseSessionToAuthSession(response.session, user);

    return {
      user,
      session,
    };
  }

  async signOut(): Promise<void> {
    await this.dataSource.signOut();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const session = await this.dataSource.getCurrentSession();
    
    if (!session) {
      return null;
    }

    const user = this.mapSupabaseUserToUser(session.user);
    return this.mapSupabaseSessionToAuthSession(session, user);
  }

  async getCurrentUser(): Promise<User | null> {
    const supabaseUser = await this.dataSource.getCurrentUser();
    
    if (!supabaseUser) {
      return null;
    }

    return this.mapSupabaseUserToUser(supabaseUser);
  }

  async refreshSession(): Promise<AuthSession> {
    const session = await this.dataSource.refreshSession();
    const user = this.mapSupabaseUserToUser(session.user);
    return this.mapSupabaseSessionToAuthSession(session, user);
  }

  async verifyEmail(token: string): Promise<User> {
    // TODO: Supabaseのメール認証実装
    throw new Error('メール認証機能は未実装です');
  }

  async sendPasswordResetEmail(email: Email): Promise<void> {
    // TODO: パスワードリセット実装
    throw new Error('パスワードリセット機能は未実装です');
  }

  async resetPassword(token: string, newPassword: Password): Promise<void> {
    // TODO: パスワードリセット実装
    throw new Error('パスワードリセット機能は未実装です');
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    return this.dataSource.onAuthStateChange((supabaseSession) => {
      if (!supabaseSession) {
        callback(null);
        return;
      }

      const user = this.mapSupabaseUserToUser(supabaseSession.user);
      const session = this.mapSupabaseSessionToAuthSession(supabaseSession, user);
      callback(session);
    });
  }

  // Supabaseのユーザーデータをドメインのユーザーエンティティにマッピング
  private mapSupabaseUserToUser(supabaseUser: SupabaseUser): User {
    if (!supabaseUser.email) {
      throw new UserNotFoundError();
    }

    const email = Email.create(supabaseUser.email);
    
    return User.reconstruct({
      id: supabaseUser.id,
      email,
      emailVerified: !!supabaseUser.email_confirmed_at,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(supabaseUser.updated_at),
      profile: {
        name: supabaseUser.user_metadata?.name,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
      },
    });
  }

  // SupabaseのセッションをドメインのAuthSessionにマッピング
  private mapSupabaseSessionToAuthSession(
    supabaseSession: SupabaseSession, 
    user: User
  ): AuthSession {
    return {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresIn: supabaseSession.expires_in,
      user,
    };
  }
} 