# SoundZone プロフィール機能実装計画書 v2.0

## 概要
StateManagement.mdのアーキテクチャに準拠したプロフィール機能の実装計画書です。
TanStack Query + Zustand + MMKVの組み合わせで、ユーザープロフィール管理を実装します。

## アーキテクチャ概要

### レイヤー構成
```
features/account/
├── domain/
│   └── entities/
│       └── Profile.ts          # Profileエンティティ
├── infrastructure/
│   └── services/
│       ├── profileService.ts   # Supabase API クライアント
│       └── avatarService.ts    # アバター画像管理
├── application/
│   └── profile-store.ts        # Zustand ストア (UI状態)
└── presentation/
    ├── hooks/
    │   ├── useProfileQuery.ts      # TanStack Query (サーバー状態)
    │   ├── useProfileMutation.ts   # プロフィール更新
    │   ├── useProfile.ts           # Zustand セレクター
    │   └── useProfileHook.ts       # 統合Hook
    ├── screens/
    │   ├── ProfileSetupScreen.tsx  # 初回設定画面
    │   └── ProfileEditScreen.tsx   # 編集画面
    └── components/
        └── AvatarPicker.tsx        # アバター選択

features/auth/
└── infrastructure/
    └── services/
        └── authService.ts          # 仮プロフィール作成を追加
```

## Phase別実装詳細

### Phase 1: Supabaseデータベース設定

#### Step 1.1: profilesテーブル作成
```sql
-- profilesテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  display_name VARCHAR(32) NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- インデックス
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
CREATE INDEX idx_profiles_email ON profiles(email);
```

#### Step 1.2: RLSポリシー設定
```sql
-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 自分のプロフィールのみ挿入可能
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);
```

#### Step 1.3: Storageバケット作成
```sql
-- Supabase管理画面で実行
-- Storage > New Bucket
-- Name: avatars
-- Public: true
```

### Phase 2: Domain層の実装

#### Step 2.1: Profileエンティティ
`@src/features/account/domain/entities/Profile.ts`
- 不変条件の定義
- バリデーションロジック
- ファクトリメソッド

### Phase 3: Infrastructure層の実装

#### Step 3.1: ProfileService
`@src/features/account/infrastructure/services/profileService.ts`
- Supabase APIクライアント
- CRUD操作
- エラーハンドリング

#### Step 3.2: 認証サービスの拡張
`@src/features/auth/infrastructure/services/authService.ts`
- 仮プロフィール作成メソッドの追加

### Phase 4: Application層の実装

#### Step 4.1: Zustand Store
`@src/features/account/application/profile-store.ts`
- UI状態管理（フォーム入力値、エラー状態）
- MMKVによる永続化（設定値のみ）

### Phase 5: Presentation層の実装

#### Step 5.1: TanStack Query Hooks
`@src/features/account/presentation/hooks/useProfileQuery.ts`
- プロフィール取得
- staleTime: 5分、gcTime: 15分

`@src/features/account/presentation/hooks/useProfileMutation.ts`
- プロフィール作成・更新
- 楽観的更新

#### Step 5.2: 統合Hook
`@src/features/account/presentation/hooks/useProfileHook.ts`
- Query/Mutation/Storeの統合
- UI向けインターフェース

#### Step 5.3: 画面実装
- ProfileSetupScreen（初回設定）
- ProfileEditScreen（編集）
- ナビゲーション統合

### Phase 6: アバター機能

#### Step 6.1: AvatarService
`@src/features/account/infrastructure/services/avatarService.ts`
- Supabase Storage連携
- 画像アップロード/削除

#### Step 6.2: AvatarPicker
`@src/features/account/presentation/components/AvatarPicker.tsx`
- 画像選択UI
- デフォルトアバター対応

## 実装順序

1. **Supabaseデータベース設定**（Phase 1）
2. **Domain/Infrastructure層**（Phase 2-3）
3. **Application層（Store）**（Phase 4）
4. **Presentation層（Hooks/Screens）**（Phase 5）
5. **アバター機能**（Phase 6）

## キー設計ポイント

### TanStack Query キー
```typescript
// プロフィール取得
['profile', userId]
// プロフィール一覧（将来用）
['profiles', { page, limit }]
```

### Zustand Store構造
```typescript
interface ProfileStore {
  // UI状態
  isEditing: boolean;
  formErrors: Record<string, string>;
  
  // アクション
  setEditing: (editing: boolean) => void;
  setFormError: (field: string, error: string) => void;
  clearFormErrors: () => void;
}
```

### MMKV永続化対象
- プロフィール表示設定（将来）
- デフォルトアバター選択（将来）

## エラーハンドリング

1. **ネットワークエラー**: TanStack Queryのretry機能
2. **バリデーションエラー**: Domain層でチェック
3. **認証エラー**: 401時は再ログイン促す
4. **画像アップロードエラー**: 個別にトースト表示

## テスト方針

1. **Domain層**: 単体テスト（バリデーション）
2. **Infrastructure層**: モックを使った統合テスト
3. **Hooks**: React Testing Library
4. **E2E**: Detoxでフロー全体