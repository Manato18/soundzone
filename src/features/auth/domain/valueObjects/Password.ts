import { InvalidPasswordError, WeakPasswordError } from '../errors/AuthErrors';

export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly REQUIRED_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)/;

  private constructor(private readonly _value: string) {}

  static create(value: string): Password {
    if (!value || !value.trim()) {
      throw new InvalidPasswordError('パスワードが入力されていません');
    }

    if (value.length < this.MIN_LENGTH) {
      throw new WeakPasswordError();
    }

    if (!this.REQUIRED_PATTERN.test(value)) {
      throw new WeakPasswordError();
    }

    return new Password(value);
  }

  static createFromHash(hashedValue: string): Password {
    // すでにハッシュ化されたパスワード用（バリデーションスキップ）
    return new Password(hashedValue);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Password): boolean {
    return this._value === other._value;
  }

  // セキュリティのため、パスワードの生値はログに出力しない
  toString(): string {
    return '[PROTECTED]';
  }
} 