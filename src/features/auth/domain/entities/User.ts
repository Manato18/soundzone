export interface UserProps {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    name?: string;
    avatarUrl?: string;
  };
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User({
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    });
  }

  static reconstruct(props: UserProps): User {
    // データベースから復元する際に使用
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get profile(): { name?: string; avatarUrl?: string } | undefined {
    return this.props.profile;
  }

  get name(): string | undefined {
    return this.props.profile?.name;
  }

  get avatarUrl(): string | undefined {
    return this.props.profile?.avatarUrl;
  }

  // メール認証完了
  verifyEmail(): User {
    return new User({
      ...this.props,
      emailVerified: true,
      updatedAt: new Date(),
    });
  }

  // プロフィール更新
  updateProfile(profile: { name?: string; avatarUrl?: string }): User {
    return new User({
      ...this.props,
      profile: { ...this.props.profile, ...profile },
      updatedAt: new Date(),
    });
  }

  // 認証に必要な情報が揃っているかチェック
  isAuthComplete(): boolean {
    return this.props.emailVerified;
  }

  equals(other: User): boolean {
    return this.props.id === other.props.id;
  }

  toJSON() {
    return {
      id: this.props.id,
      email: this.props.email,
      emailVerified: this.props.emailVerified,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      profile: this.props.profile,
    };
  }
} 