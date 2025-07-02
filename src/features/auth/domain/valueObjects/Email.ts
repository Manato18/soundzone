import { InvalidEmailError } from '../errors/AuthErrors';

export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    if (!value || !value.trim()) {
      throw new InvalidEmailError('メールアドレスが入力されていません');
    }

    const normalizedEmail = value.trim().toLowerCase();
    
    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      throw new InvalidEmailError(value);
    }

    return new Email(normalizedEmail);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
} 