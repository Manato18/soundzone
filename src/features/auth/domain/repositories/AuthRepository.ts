import { User } from '../entities/User';
import { Email } from '../valueObjects/Email';
import { Password } from '../valueObjects/Password';

// 認証セッション情報
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// サインアップ結果
export interface SignUpResult {
  user: User;
  session?: AuthSession; // メール認証が必要な場合はセッションがない
  needsEmailVerification: boolean;
}

// サインイン結果
export interface SignInResult {
  user: User;
  session: AuthSession;
}

// 認証リポジトリインターフェース
export interface AuthRepository {
  // ユーザー登録
  signUp(email: Email, password: Password): Promise<SignUpResult>;

  // ログイン
  signIn(email: Email, password: Password): Promise<SignInResult>;

  // ログアウト
  signOut(): Promise<void>;

  // 現在のセッション取得
  getCurrentSession(): Promise<AuthSession | null>;

  // 現在のユーザー取得
  getCurrentUser(): Promise<User | null>;

  // セッション更新
  refreshSession(): Promise<AuthSession>;

  // メール認証確認
  verifyEmail(token: string): Promise<User>;

  // パスワードリセットメール送信
  sendPasswordResetEmail(email: Email): Promise<void>;

  // パスワードリセット実行
  resetPassword(token: string, newPassword: Password): Promise<void>;

  // 認証状態の変更を監視
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
} 