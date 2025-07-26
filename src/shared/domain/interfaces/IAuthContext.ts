// Auth機能とAccount機能の境界を定義するインターフェース
// AccountはAuthの実装詳細に依存せず、このインターフェースのみに依存する

export interface IAuthContext {
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
  isAuthenticated: boolean;
}

// ユーザー情報の最小限のインターフェース
export interface IAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}