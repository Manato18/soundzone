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
import { AuthStorage, StoredSession } from '../../infra/storage/authStorage';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly dataSource: SupabaseAuthDataSource) {}

  async signUp(email: Email, password: Password): Promise<SignUpResult> {
    const response = await this.dataSource.signUp(email.value, password.value);
    
    if (!response.user) {
      throw new Error('ユーザー作成に失敗しました');
    }

    const user = this.mapSupabaseUserToUser(response.user);
    const session = response.session ? this.mapSupabaseSessionToAuthSession(response.session, user) : undefined;

    // セッションをMMKVに保存
    if (session) {
      const storedSession: StoredSession = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
        expiresAt: Date.now() + (session.expiresIn * 1000),
        user: AuthStorage.userToStoredUser(user),
      };
      AuthStorage.saveSession(storedSession);
    }

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

    // セッションをMMKVに保存
    const storedSession: StoredSession = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      expiresAt: Date.now() + (session.expiresIn * 1000),
      user: AuthStorage.userToStoredUser(user),
    };
    AuthStorage.saveSession(storedSession);

    return {
      user,
      session,
    };
  }

  async signOut(): Promise<void> {
    await this.dataSource.signOut();
    // MMKVからセッション情報をクリア
    AuthStorage.clearSession();
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    // まずMMKVから取得を試行
    const storedSession = AuthStorage.getSession();
    
    if (storedSession) {
      const user = AuthStorage.storedUserToUser(storedSession.user);
      return {
        accessToken: storedSession.accessToken,
        refreshToken: storedSession.refreshToken,
        expiresIn: storedSession.expiresIn,
        user,
      };
    }

    // MMKVにない場合は Supabase から取得
    const session = await this.dataSource.getCurrentSession();
    
    if (!session) {
      return null;
    }

    const user = this.mapSupabaseUserToUser(session.user);
    const authSession = this.mapSupabaseSessionToAuthSession(session, user);
    
    // 取得したセッションをMMKVに保存
    const storedSessionForSave: StoredSession = {
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      expiresIn: authSession.expiresIn,
      expiresAt: Date.now() + (authSession.expiresIn * 1000),
      user: AuthStorage.userToStoredUser(user),
    };
    AuthStorage.saveSession(storedSessionForSave);
    
    return authSession;
  }

  async getCurrentUser(): Promise<User | null> {
    // まずMMKVから取得を試行
    const storedUser = AuthStorage.getUser();
    
    if (storedUser) {
      // ストレージにユーザー情報があってもセッションが有効かチェック
      if (AuthStorage.isSessionValid()) {
        return AuthStorage.storedUserToUser(storedUser);
      } else {
        // セッションが無効な場合はストレージをクリア
        AuthStorage.clearSession();
      }
    }

    try {
      // MMKVにない場合またはセッション無効の場合は Supabase から取得
      const supabaseUser = await this.dataSource.getCurrentUser();
      
      if (!supabaseUser) {
        return null;
      }

      const user = this.mapSupabaseUserToUser(supabaseUser);
      
      // ユーザー情報をMMKVに保存
      AuthStorage.updateUser(AuthStorage.userToStoredUser(user));
      
      return user;
    } catch (error) {
      // セッション関連エラーの場合は認証されていない状態として扱う
      if (error instanceof Error && error.message.includes('session')) {
        AuthStorage.clearSession();
        return null;
      }
      throw error;
    }
  }

  async refreshSession(): Promise<AuthSession> {
    const session = await this.dataSource.refreshSession();
    const user = this.mapSupabaseUserToUser(session.user);
    const authSession = this.mapSupabaseSessionToAuthSession(session, user);
    
    // リフレッシュされたセッションをMMKVに保存
    const storedSession: StoredSession = {
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      expiresIn: authSession.expiresIn,
      expiresAt: Date.now() + (authSession.expiresIn * 1000),
      user: AuthStorage.userToStoredUser(user),
    };
    AuthStorage.saveSession(storedSession);
    
    return authSession;
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