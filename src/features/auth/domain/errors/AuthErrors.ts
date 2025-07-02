// 認証関連のエラー定義
export abstract class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// メールアドレス関連エラー
export class InvalidEmailError extends AuthError {
  constructor(email: string) {
    super(`無効なメールアドレス形式です: ${email}`);
  }
}

// パスワード関連エラー
export class InvalidPasswordError extends AuthError {
  constructor(reason: string) {
    super(`無効なパスワードです: ${reason}`);
  }
}

export class WeakPasswordError extends AuthError {
  constructor() {
    super('パスワードは8文字以上で、英数字を含む必要があります');
  }
}

// 認証エラー
export class SignInFailedError extends AuthError {
  constructor() {
    super('メールアドレスまたはパスワードが間違っています');
  }
}

export class SignUpFailedError extends AuthError {
  constructor(message: string) {
    super(`アカウント作成に失敗しました: ${message}`);
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super('メールアドレスの認証が完了していません');
  }
}

export class UserNotFoundError extends AuthError {
  constructor() {
    super('ユーザーが見つかりません');
  }
}

// ネットワーク関連エラー
export class NetworkError extends AuthError {
  constructor() {
    super('ネットワークエラーが発生しました。接続を確認してください');
  }
} 