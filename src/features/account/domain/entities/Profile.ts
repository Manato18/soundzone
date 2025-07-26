// Domain Layer: プロフィールエンティティ
export interface ProfileProps {
  userId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
}

// TanStack Query用のシンプルなプロフィール型
export interface QueryProfile {
  userId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export class Profile {
  private constructor(private readonly props: ProfileProps) {}

  static create(props: Omit<ProfileProps, 'createdAt' | 'updatedAt'>): Profile {
    // バリデーション
    if (!props.displayName || props.displayName.trim().length === 0) {
      throw new Error('表示名は必須です');
    }
    if (props.displayName.length > 32) {
      throw new Error('表示名は32文字以内で入力してください');
    }
    if (!props.avatarUrl || props.avatarUrl.trim().length === 0) {
      throw new Error('アバター画像は必須です');
    }
    if (props.bio.length > 300) {
      throw new Error('自己紹介は300文字以内で入力してください');
    }

    return new Profile({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstruct(props: ProfileProps): Profile {
    // データベースから復元する際に使用
    return new Profile(props);
  }

  // Getters
  get userId(): string {
    return this.props.userId;
  }

  get email(): string {
    return this.props.email;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get avatarUrl(): string {
    return this.props.avatarUrl;
  }

  get bio(): string {
    return this.props.bio;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ビジネスロジック
  update(updates: Partial<Pick<ProfileProps, 'displayName' | 'avatarUrl' | 'bio'>>): Profile {
    const newProps = {
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    };

    // 更新時もバリデーション
    if (newProps.displayName && newProps.displayName.length > 32) {
      throw new Error('表示名は32文字以内で入力してください');
    }
    if (newProps.bio && newProps.bio.length > 300) {
      throw new Error('自己紹介は300文字以内で入力してください');
    }

    return new Profile(newProps);
  }

  equals(other: Profile): boolean {
    return this.props.userId === other.props.userId;
  }

  toJSON(): QueryProfile {
    return {
      userId: this.props.userId,
      email: this.props.email,
      emailVerified: this.props.emailVerified,
      displayName: this.props.displayName,
      avatarUrl: this.props.avatarUrl,
      bio: this.props.bio,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }

  // バリデーションヘルパー
  static validateDisplayName(name: string): string | undefined {
    if (!name || name.trim().length === 0) {
      return '表示名を入力してください';
    }
    if (name.length > 32) {
      return '表示名は32文字以内で入力してください';
    }
    return undefined;
  }

  static validateBio(bio: string): string | undefined {
    if (bio.length > 300) {
      return '自己紹介は300文字以内で入力してください';
    }
    return undefined;
  }
}