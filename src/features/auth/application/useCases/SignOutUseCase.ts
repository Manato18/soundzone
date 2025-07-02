import { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface SignOutResponse {
  success: boolean;
  error?: string;
}

export class SignOutUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<SignOutResponse> {
    try {
      await this.authRepository.signOut();
      
      return {
        success: true,
      };

    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): SignOutResponse {
    console.error('SignOutUseCase error:', error);
    
    // ログアウトは基本的に失敗しないが、念のためエラーハンドリング
    return {
      success: false,
      error: 'ログアウト中にエラーが発生しました。',
    };
  }
} 