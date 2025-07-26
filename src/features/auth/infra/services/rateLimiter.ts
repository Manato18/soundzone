interface AttemptRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private attempts: Map<string, AttemptRecord> = new Map();
  
  // 設定値
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15分
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15分
  private readonly EXPONENTIAL_BASE = 2; // 2秒, 4秒, 8秒...
  
  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * ログイン試行を記録し、制限状態をチェック
   */
  async checkAndRecordAttempt(identifier: string): Promise<{
    allowed: boolean;
    remainingAttempts?: number;
    waitTimeMs?: number;
    lockedUntil?: Date;
  }> {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // 既存のレコードがない場合は新規作成
    if (!record) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttemptTime: now,
        lastAttemptTime: now,
      });
      
      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - 1,
      };
    }

    // ロックアウト中かチェック
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        allowed: false,
        lockedUntil: new Date(record.lockedUntil),
        waitTimeMs: record.lockedUntil - now,
      };
    }

    // ウィンドウ期間を過ぎている場合はリセット
    if (now - record.firstAttemptTime > this.WINDOW_MS) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttemptTime: now,
        lastAttemptTime: now,
      });
      
      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - 1,
      };
    }

    // Exponential backoffの計算
    const timeSinceLastAttempt = now - record.lastAttemptTime;
    const requiredWaitTime = this.calculateBackoffTime(record.count);
    
    if (timeSinceLastAttempt < requiredWaitTime) {
      return {
        allowed: false,
        waitTimeMs: requiredWaitTime - timeSinceLastAttempt,
        remainingAttempts: this.MAX_ATTEMPTS - record.count,
      };
    }

    // 試行回数を増やす
    record.count++;
    record.lastAttemptTime = now;

    // 最大試行回数に達した場合はロックアウト
    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      this.attempts.set(identifier, record);
      
      return {
        allowed: false,
        lockedUntil: new Date(record.lockedUntil),
        waitTimeMs: this.LOCKOUT_DURATION_MS,
      };
    }

    this.attempts.set(identifier, record);
    
    return {
      allowed: true,
      remainingAttempts: this.MAX_ATTEMPTS - record.count,
    };
  }

  /**
   * 成功時にレコードをクリア
   */
  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * 特定のIDがロックされているかチェック
   */
  isLocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record || !record.lockedUntil) {
      return false;
    }
    
    return Date.now() < record.lockedUntil;
  }

  /**
   * ロック解除までの残り時間を取得
   */
  getTimeUntilUnlock(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || !record.lockedUntil) {
      return 0;
    }
    
    const remaining = record.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Exponential backoffの時間を計算
   */
  private calculateBackoffTime(attemptCount: number): number {
    if (attemptCount <= 1) return 0;
    
    // 2^(n-1) * 1000ms (1秒, 2秒, 4秒, 8秒...)
    const seconds = Math.pow(this.EXPONENTIAL_BASE, attemptCount - 1);
    return Math.min(seconds * 1000, 30000); // 最大30秒
  }

  /**
   * 定期的なクリーンアップ（メモリリーク防止）
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.attempts.forEach((record, key) => {
      // 1時間以上古いレコードは削除
      if (now - record.lastAttemptTime > 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.attempts.delete(key));
  }
}

export const rateLimiter = RateLimiter.getInstance();