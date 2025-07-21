// DIコンテナ - 依存性注入の管理
import { SupabaseAuthDataSource } from '../../data/dataSources/SupabaseAuthDataSource';
import { SupabaseAuthRepository } from '../../data/repositories/SupabaseAuthRepository';
import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { SignInUseCase } from '../useCases/SignInUseCase';
import { SignOutUseCase } from '../useCases/SignOutUseCase';
import { SignUpUseCase } from '../useCases/SignUpUseCase';

export class AuthContainer {
  private static instance: AuthContainer;
  
  // データソース
  private readonly authDataSource: SupabaseAuthDataSource;
  
  // リポジトリ
  private readonly authRepository: AuthRepository;
  
  // ユースケース
  public readonly signUpUseCase: SignUpUseCase;
  public readonly signInUseCase: SignInUseCase;
  public readonly signOutUseCase: SignOutUseCase;
  public readonly getCurrentUserUseCase: GetCurrentUserUseCase;

  private constructor() {
    // 依存関係の構築（下位から上位へ）
    this.authDataSource = new SupabaseAuthDataSource();
    this.authRepository = new SupabaseAuthRepository(this.authDataSource);
    
    // ユースケースの構築
    this.signUpUseCase = new SignUpUseCase(this.authRepository);
    this.signInUseCase = new SignInUseCase(this.authRepository);
    this.signOutUseCase = new SignOutUseCase(this.authRepository);
    this.getCurrentUserUseCase = new GetCurrentUserUseCase(this.authRepository);
  }

  // シングルトンパターン
  public static getInstance(): AuthContainer {
    if (!AuthContainer.instance) {
      AuthContainer.instance = new AuthContainer();
    }
    return AuthContainer.instance;
  }

  // AuthRepositoryを直接使いたい場合のアクセサ
  public getAuthRepository(): AuthRepository {
    return this.authRepository;
  }

  // UseCaseのゲッター
  public getSignUpUseCase(): SignUpUseCase {
    return this.signUpUseCase;
  }

  public getSignInUseCase(): SignInUseCase {
    return this.signInUseCase;
  }

  public getSignOutUseCase(): SignOutUseCase {
    return this.signOutUseCase;
  }

  public getGetCurrentUserUseCase(): GetCurrentUserUseCase {
    return this.getCurrentUserUseCase;
  }
} 