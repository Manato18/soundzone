import {
    EmailNotVerifiedError,
    InvalidEmailError,
    InvalidPasswordError,
    SignInFailedError
} from '../../domain/errors/AuthErrors';
import { AuthRepository, SignInResult } from '../../domain/repositories/AuthRepository';
import { Email } from '../../domain/valueObjects/Email';
import { Password } from '../../domain/valueObjects/Password';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    avatarUrl?: string;
  };
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
}

export class SignInUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(request: SignInRequest): Promise<SignInResponse> {
    try {
      // 入力値検証
      this.validateRequest(request);

      // バリューオブジェクト作成
      const email = Email.create(request.email);
      const password = Password.create(request.password);

      // ログイン実行
      const result: SignInResult = await this.authRepository.signIn(email, password);

      // メール認証チェック
      if (!result.user.emailVerified) {
        throw new EmailNotVerifiedError();
      }

      return {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email.value,
          emailVerified: result.user.emailVerified,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
        },
        session: {
          accessToken: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          expiresIn: result.session.expiresIn,
        },
      };

    } catch (error) {
      return this.handleError(error);
    }
  }

  private validateRequest(request: SignInRequest): void {
    if (!request.email?.trim()) {
      throw new InvalidEmailError('メールアドレスが入力されていません');
    }

    if (!request.password?.trim()) {
      throw new InvalidPasswordError('パスワードが入力されていません');
    }
  }

  private handleError(error: unknown): SignInResponse {
    if (error instanceof InvalidEmailError || 
        error instanceof InvalidPasswordError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof SignInFailedError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof EmailNotVerifiedError) {
      return {
        success: false,
        error: 'メールアドレスの認証が完了していません。メールボックスを確認してください。',
      };
    }

    // メール未認証の特別処理
    if (error instanceof Error && error.message === 'EMAIL_NOT_CONFIRMED') {
      return {
        success: false,
        error: 'メールアドレスの認証が完了していません。受信トレイをご確認ください。',
      };
    }

    // 予期しないエラー
    console.error('SignInUseCase unexpected error:', error);
    return {
      success: false,
      error: 'ログイン中にエラーが発生しました。しばらく経ってから再試行してください。',
    };
  }
} 