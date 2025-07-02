import { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface CurrentUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    avatarUrl?: string;
  };
  isAuthenticated: boolean;
  error?: string;
}

export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<CurrentUserResponse> {
    try {
      const user = await this.authRepository.getCurrentUser();
      
      if (!user) {
        return {
          success: true,
          isAuthenticated: false,
        };
      }

      return {
        success: true,
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email.value,
          emailVerified: user.emailVerified,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      };

    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): CurrentUserResponse {
    console.error('GetCurrentUserUseCase error:', error);
    
    return {
      success: false,
      isAuthenticated: false,
      error: 'ユーザー情報の取得中にエラーが発生しました。',
    };
  }
} 