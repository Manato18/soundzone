# アカウント新規作成画面実装計画

## 概要

新規ユーザー登録時のメール認証後に、プロフィール情報（表示名・アバター画像・自己紹介）を入力する画面を実装します。StateManagement.mdとCentralizedStateManagement.mdの設計原則に従い、Account機能として一元管理を行います。

## 実装要件

### 機能要件
1. メール認証完了後にアカウント作成画面へ遷移
2. 必須入力項目:
   - 表示名（display_name）: 32文字以内
   - アバター画像（avatar_url）: 必須
   - 自己紹介（bio）: 300文字以内
3. すべての項目入力後、profilesテーブルに保存してホーム画面へ遷移

### データベース構造（実装済み）
```sql
profiles (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  display_name VARCHAR(32) NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

## アーキテクチャ設計

### 1. ディレクトリ構造
```
src/features/account/
├── application/
│   └── account-store.ts              # Zustand一元管理ストア
├── domain/
│   └── entities/
│       └── Profile.ts                # プロフィールエンティティ
├── infrastructure/
│   └── services/
│       ├── accountService.ts         # Supabase API通信
│       └── accountStateManager.ts    # 状態管理サービス
└── presentation/
    ├── providers/
    │   └── AccountProvider.tsx       # コンテキストプロバイダー
    ├── hooks/
    │   ├── use-account.ts           # 統合フック
    │   └── use-account-query.ts     # TanStack Query統合
    └── screens/
        └── ProfileCreationScreen.tsx # プロフィール作成画面
```

### 2. 状態管理設計（Zustand）

```typescript
interface AccountState {
  // サーバー状態（TanStack Queryと同期）
  profile: {
    userId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string;
    bio: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  
  // プロフィール作成フォームUI状態
  ui: {
    profileCreationForm: {
      displayName: string;
      bio: string;
      avatarPreviewUrl?: string;  // アップロード前のプレビュー
      isSubmitting: boolean;
      errors: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        general?: string;
      };
    };
    
    avatarUpload: {
      isUploading: boolean;
      uploadProgress: number;
      uploadedUrl?: string;      // Supabase Storage URL
      error?: string;
    };
  };
  
  // 設定（永続化対象）
  settings: {
    hasCompletedProfile: boolean;  // プロフィール作成完了フラグ
  };
}
```

### 3. 遷移フロー修正

#### 現在のフロー
```
メール認証完了 → RootNavigator → AppNavigator（ホーム画面）
```

#### 新しいフロー
```
メール認証完了 → RootNavigator → プロフィール未作成判定 → ProfileCreationScreen → AppNavigator
```

### 4. RootNavigatorの修正案

```typescript
// RootNavigator.tsx の修正
const shouldShowApp = isAuthenticated && user?.emailVerified && hasCompletedProfile;

if (isAuthenticated && user?.emailVerified && !hasCompletedProfile) {
  // プロフィール未作成の場合
  return (
    <NavigationContainer>
      <ProfileCreationNavigator />
    </NavigationContainer>
  );
}
```

## 実装手順

### Phase 1: Account機能の基盤構築（一元管理）

1. **account-store.ts作成**
   - Zustandストア定義
   - middleware設定（devtools → persist → immer → subscribeWithSelector）
   - 永続化設定（settings.hasCompletedProfileのみ）

2. **Profile.tsエンティティ作成**
   - ドメインモデル定義
   - バリデーションルール実装

3. **AccountProvider.tsx作成**
   - Auth機能との連携
   - 初期化ロジック
   - エラーハンドリング

### Phase 2: API層実装

1. **accountService.ts作成**
   - createProfile: プロフィール作成
   - fetchProfile: プロフィール取得
   - uploadAvatar: アバター画像アップロード
   - checkProfileExists: プロフィール存在確認

2. **accountStateManager.ts作成**
   - シングルトンパターン
   - Auth連携によるプロフィール自動取得
   - エラーコールバック処理

### Phase 3: TanStack Query統合

1. **use-account-query.ts作成**
   - useCreateProfileMutation: 楽観的更新実装
   - useProfileQuery: プロフィール取得
   - useUploadAvatarMutation: 画像アップロード

2. **キャッシュ設定**
   ```typescript
   queryKey: ['account', 'profile', userId]
   staleTime: 30 * 60 * 1000  // 30分
   gcTime: 60 * 60 * 1000     // 1時間
   ```

### Phase 4: UI実装

1. **ProfileCreationScreen.tsx作成**
   - 3ステップフォーム（表示名 → アバター → 自己紹介）
   - リアルタイムバリデーション
   - 画像選択・プレビュー機能
   - ローディング・エラー表示

2. **画像処理**
   - react-native-image-pickerによる画像選択
   - 画像圧縮処理（最大1MB）
   - Supabase Storageへのアップロード

### Phase 5: 遷移フロー実装

1. **RootNavigator修正**
   - hasCompletedProfile判定追加
   - ProfileCreationNavigator追加

2. **Auth連携**
   - メール認証完了時のイベント通知
   - AccountProviderでの受信処理

## バリデーションルール

### クライアント側
- **displayName**: 1-32文字、空白不可
- **bio**: 0-300文字
- **avatar**: 必須、最大5MB、jpeg/png/webp

### サーバー側（RLS）
- 自分のプロフィールのみ作成可能
- user_idはauth.uid()と一致必須

## エラーハンドリング

1. **ネットワークエラー**
   - 自動リトライ（3回まで）
   - オフライン時のメッセージ表示

2. **バリデーションエラー**
   - フィールド単位のエラー表示
   - 日本語エラーメッセージ

3. **アップロードエラー**
   - プログレスバー表示
   - 失敗時の再試行オプション

## テスト計画

1. **ユニットテスト**
   - ストアのアクション
   - バリデーションロジック
   - エンティティメソッド

2. **統合テスト**
   - API通信
   - 画像アップロード
   - 状態同期

3. **E2Eテスト**
   - 完全な登録フロー
   - エラーケース
   - 画像選択フロー

## セキュリティ考慮事項

1. **画像アップロード**
   - ファイルタイプ検証
   - サイズ制限
   - ウイルススキャン（Supabase側）

2. **データ保護**
   - プロフィール情報の暗号化なし（公開情報のため）
   - user_idによるアクセス制御

3. **レート制限**
   - プロフィール作成: 1回/ユーザー
   - 画像アップロード: 10回/時間

## パフォーマンス最適化

1. **画像最適化**
   - クライアント側圧縮
   - WebP形式への変換検討
   - CDN配信（Supabase提供）

2. **状態管理**
   - 必要最小限のデータ保持
   - セレクターによる再描画制御
   - shallow比較の活用

## 実装優先順位

1. **必須機能**（Phase 1-4）
   - 基本的なプロフィール作成
   - 画像アップロード
   - バリデーション

2. **追加機能**（将来）
   - 画像編集（トリミング）
   - プロフィールプレビュー
   - スキップオプション

## 完了条件

- [ ] すべての必須項目が入力できる
- [ ] バリデーションが正しく動作する
- [ ] 画像がアップロードできる
- [ ] プロフィールがDBに保存される
- [ ] 保存後ホーム画面に遷移する
- [ ] エラー時の適切なフィードバック
- [ ] 一元管理による状態同期