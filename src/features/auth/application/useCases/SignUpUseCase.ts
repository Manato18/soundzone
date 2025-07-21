import { InvalidEmailError, SignUpFailedError, WeakPasswordError } from '../../domain/errors/AuthErrors';
import { AuthRepository, SignUpResult } from '../../domain/repositories/AuthRepository';
import { Email } from '../../domain/valueObjects/Email';
import { Password } from '../../domain/valueObjects/Password';

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface SignUpResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  needsEmailVerification: boolean;
  error?: string;
}

export class SignUpUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(request: SignUpRequest): Promise<SignUpResponse> {
    try {
      // 入力値検証
      this.validateRequest(request);

      // バリューオブジェクト作成
      const email = Email.create(request.email);
      const password = Password.create(request.password);

      // ユーザー登録実行
      const result: SignUpResult = await this.authRepository.signUp(email, password);

      return {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email.value,
          emailVerified: result.user.emailVerified,
        },
        needsEmailVerification: result.needsEmailVerification,
      };

    } catch (error) {
      return this.handleError(error);
    }
  }

  private validateRequest(request: SignUpRequest): void {
    // 必須項目チェック
    if (!request.email?.trim()) {
      throw new InvalidEmailError('メールアドレスが入力されていません');
    }

    if (!request.password?.trim()) {
      throw new WeakPasswordError();
    }
  }

  private handleError(error: unknown): SignUpResponse {
    if (error instanceof InvalidEmailError || 
        error instanceof WeakPasswordError) {
      return {
        success: false,
        needsEmailVerification: false,
        error: error.message,
      };
    }

    if (error instanceof SignUpFailedError) {
      return {
        success: false,
        needsEmailVerification: false,
        error: error.message,
      };
    }

    // 予期しないエラー
    console.error('SignUpUseCase unexpected error:', error);
    return {
      success: false,
      needsEmailVerification: false,
      error: 'アカウント作成中にエラーが発生しました。しばらく経ってから再試行してください。',
    };
  }
} 