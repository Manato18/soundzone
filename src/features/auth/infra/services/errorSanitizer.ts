export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

interface ErrorMapping {
  patterns: RegExp[];
  codes?: string[]; // Supabase error codes
  category: ErrorCategory;
  message: string;
  details?: string;
}

export class ErrorSanitizer {
  private static instance: ErrorSanitizer;
  
  // エラーパターンとカテゴリのマッピング
  private readonly errorMappings: ErrorMapping[] = [
    // 認証エラー
    {
      patterns: [
        /invalid.*password/i,
        /incorrect.*password/i,
        /wrong.*password/i,
        /Invalid email or password/i,
        /Invalid login credentials/i,
        /invalid_credentials/i,
      ],
      codes: ['invalid_grant', 'invalid_credentials'],
      category: ErrorCategory.AUTHENTICATION,
      message: 'メールアドレスまたはパスワードが正しくありません',
      details: '入力内容をご確認ください',
    },
    {
      patterns: [
        /email.*not.*confirmed/i,
        /email.*not.*verified/i,
        /Email not confirmed/i,
      ],
      codes: ['email_not_confirmed'],
      category: ErrorCategory.AUTHENTICATION,
      message: 'メールアドレスが認証されていません',
      details: '認証メールをご確認ください',
    },
    {
      patterns: [
        /user.*already.*registered/i,
        /email.*already.*in.*use/i,
        /User already registered/i,
      ],
      codes: ['user_already_exists'],
      category: ErrorCategory.AUTHENTICATION,
      message: 'このメールアドレスは既に登録されています',
      details: 'ログインするか、別のメールアドレスをお使いください',
    },
    {
      patterns: [
        /invalid.*token/i,
        /token.*expired/i,
        /Invalid OTP/i,
        /Token has expired/i,
        /bad.*jwt/i,
      ],
      codes: ['bad_jwt', 'invalid_token'],
      category: ErrorCategory.AUTHENTICATION,
      message: '認証コードが無効または期限切れです',
      details: '新しい認証コードを再送信してください',
    },
    {
      patterns: [
        /user.*not.*found/i,
        /account.*not.*found/i,
        /User not found/i,
      ],
      category: ErrorCategory.AUTHENTICATION,
      message: 'メールアドレスまたはパスワードが正しくありません',
      details: '入力内容をご確認ください',
    },
    
    // バリデーションエラー
    {
      patterns: [
        /password.*at.*least.*\d+.*characters/i,
        /Password should be at least/i,
      ],
      category: ErrorCategory.VALIDATION,
      message: 'パスワードは6文字以上で入力してください',
    },
    {
      patterns: [
        /invalid.*email/i,
        /email.*format/i,
      ],
      category: ErrorCategory.VALIDATION,
      message: '有効なメールアドレスを入力してください',
    },
    {
      patterns: [
        /required.*field/i,
        /cannot.*be.*empty/i,
      ],
      category: ErrorCategory.VALIDATION,
      message: '必須項目を入力してください',
    },
    
    // ネットワークエラー
    {
      patterns: [
        /network.*error/i,
        /connection.*failed/i,
        /fetch.*failed/i,
        /NetworkError/i,
      ],
      category: ErrorCategory.NETWORK,
      message: 'ネットワークエラーが発生しました',
      details: 'インターネット接続を確認してください',
    },
    {
      patterns: [
        /timeout/i,
        /timed.*out/i,
      ],
      category: ErrorCategory.NETWORK,
      message: '接続がタイムアウトしました',
      details: 'しばらく待ってから再度お試しください',
    },
    
    // サーバーエラー
    {
      patterns: [
        /server.*error/i,
        /internal.*server.*error/i,
        /500.*error/i,
      ],
      category: ErrorCategory.SERVER,
      message: 'サーバーエラーが発生しました',
      details: 'しばらく待ってから再度お試しください',
    },
    
    // レート制限
    {
      patterns: [
        /rate.*limit/i,
        /too.*many.*requests/i,
        /429.*error/i,
      ],
      codes: ['over_request_rate_limit', 'over_sms_send_rate_limit'],
      category: ErrorCategory.RATE_LIMIT,
      message: 'リクエストが多すぎます',
      details: 'しばらく待ってから再度お試しください',
    },
    
    // 機能無効エラー
    {
      patterns: [
        /provider.*disabled/i,
        /feature.*not.*enabled/i,
      ],
      codes: ['provider_disabled', 'anonymous_provider_disabled'],
      category: ErrorCategory.SERVER,
      message: 'この機能は現在利用できません',
      details: 'サポートにお問い合わせください',
    },
  ];

  private constructor() {}

  static getInstance(): ErrorSanitizer {
    if (!ErrorSanitizer.instance) {
      ErrorSanitizer.instance = new ErrorSanitizer();
    }
    return ErrorSanitizer.instance;
  }

  /**
   * エラーメッセージをサニタイズ
   */
  sanitize(error: unknown): {
    message: string;
    details?: string;
    category: ErrorCategory;
    originalError?: string;
  } {
    // エラーメッセージとコードの抽出
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.extractErrorCode(error);
    
    // パターンマッチング
    for (const mapping of this.errorMappings) {
      // エラーコードのチェック
      if (errorCode && mapping.codes?.includes(errorCode)) {
        return {
          message: mapping.message,
          details: mapping.details,
          category: mapping.category,
          originalError: process.env.NODE_ENV === 'development' ? `${errorCode}: ${errorMessage}` : undefined,
        };
      }
      
      // パターンマッチング
      for (const pattern of mapping.patterns) {
        if (pattern.test(errorMessage)) {
          return {
            message: mapping.message,
            details: mapping.details,
            category: mapping.category,
            originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          };
        }
      }
    }
    
    // マッチしない場合はカテゴリ別のデフォルトメッセージ
    return this.getDefaultMessage(errorMessage);
  }

  /**
   * エラーオブジェクトからメッセージを抽出
   */
  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    if (error && typeof error === 'object') {
      // Supabaseエラーオブジェクトの処理
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      
      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }
      
      if ('error_description' in error && typeof error.error_description === 'string') {
        return error.error_description;
      }
      
      // Supabaseの新しいエラー形式に対応
      if ('code' in error && typeof error.code === 'string') {
        // codeが実際のエラーメッセージの場合
        if (error.code.includes(' ') || error.code.length > 50) {
          return error.code;
        }
      }
      
      // AuthErrorの場合
      if ('name' in error && error.name === 'AuthError' && 'message' in error) {
        return String(error.message);
      }
      
      // ネストされたエラーオブジェクト
      if ('error' in error && typeof error.error === 'object' && error.error !== null) {
        return this.extractErrorMessage(error.error);
      }
    }
    
    return 'Unknown error';
  }

  /**
   * エラーオブジェクトからコードを抽出
   */
  private extractErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }
    
    // Supabase AuthApiErrorのコードプロパティ
    if ('code' in error && typeof error.code === 'string') {
      // コードがエラーコードの形式（スネークケースまたは短い文字列）
      if (!error.code.includes(' ') && error.code.length <= 50) {
        return error.code;
      }
    }
    
    return null;
  }

  /**
   * カテゴリ別のデフォルトメッセージ
   */
  private getDefaultMessage(errorMessage: string): {
    message: string;
    details?: string;
    category: ErrorCategory;
    originalError?: string;
  } {
    // ステータスコードベースの判定
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        message: '認証エラーが発生しました',
        details: 'ログイン情報をご確認ください',
        category: ErrorCategory.AUTHENTICATION,
        originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      };
    }
    
    if (errorMessage.includes('404')) {
      return {
        message: 'リソースが見つかりません',
        category: ErrorCategory.SERVER,
        originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      };
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return {
        message: 'サーバーエラーが発生しました',
        details: 'しばらく待ってから再度お試しください',
        category: ErrorCategory.SERVER,
        originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      };
    }
    
    // デフォルト
    return {
      message: 'エラーが発生しました',
      details: '問題が続く場合はサポートにお問い合わせください',
      category: ErrorCategory.UNKNOWN,
      originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    };
  }

  /**
   * カテゴリに基づいたアクションの提案
   */
  getSuggestedAction(category: ErrorCategory): string | undefined {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 'ログイン情報を確認してください';
      case ErrorCategory.NETWORK:
        return 'インターネット接続を確認してください';
      case ErrorCategory.VALIDATION:
        return '入力内容を確認してください';
      case ErrorCategory.SERVER:
        return 'しばらく待ってから再度お試しください';
      case ErrorCategory.RATE_LIMIT:
        return '時間をおいてから再度お試しください';
      default:
        return undefined;
    }
  }
}

export const errorSanitizer = ErrorSanitizer.getInstance();