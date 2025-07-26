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

### Phase 1: Account機能の基盤構築（一元管理）✅ 完了

1. **account-store.ts作成** ✅
   - Zustandストア定義
   - middleware設定（devtools → persist → immer → subscribeWithSelector）
   - 永続化設定（settings.hasCompletedProfileのみ）
   - 無限ループ防止対策実装

2. **Profile.tsエンティティ作成** ✅
   - ドメインモデル定義
   - バリデーションルール実装
   - バリデーションヘルパーメソッド追加

3. **AccountProvider.tsx作成** ✅
   - Auth機能との連携
   - 初期化ロジック（useRefによる重複実行防止）
   - エラーハンドリング
   - 無限ループ防止策（lastUserId, isInitializedフラグ）

### Phase 2: API層実装 ✅ 完了

1. **accountService.ts作成** ✅
   - createProfile: プロフィール作成
   - fetchProfile: プロフィール取得
   - updateProfile: プロフィール更新
   - checkProfileExists: プロフィール存在確認
   - uploadAvatar: アバター画像アップロード
   - deleteAvatar: アバター画像削除
   - Supabaseエラーハンドリング実装

2. **accountStateManager.ts作成** ✅
   - シングルトンパターン実装
   - Auth連携によるプロフィール自動取得
   - エラーコールバック処理
   - Zustandストアとの自動同期
   - 無限ループ防止（isInitializing, lastCheckedUserId）
   - クリーンアップ処理

### Phase 3: TanStack Query統合 ✅ 完了

1. **use-account-query.ts作成** ✅
   - useProfileQuery: プロフィール取得（Zustand自動同期）
   - useCheckProfileExistsQuery: 存在確認クエリ
   - useCreateProfileMutation: プロフィール作成
   - useUpdateProfileMutation: 楽観的更新実装
   - useUploadAvatarMutation: 画像アップロード（進捗管理）
   - useDeleteAvatarMutation: 画像削除

2. **use-account.ts作成** ✅
   - useAccount: 統合インターフェース
   - useProfileCreationFormHook: フォーム管理フック
   - useProfileEditHook: 編集フック（将来用）
   - バリデーション統合
   - エラーハンドリング統合

3. **キャッシュ設定** ✅
   ```typescript
   queryKey: ['account', 'profile', userId]
   staleTime: 30 * 60 * 1000  // 30分
   gcTime: 60 * 60 * 1000     // 1時間
   ```

4. **StateManagement.mdとの整合性** ✅
   - サーバー状態: TanStack Query
   - UI状態: Zustand
   - 自動同期メカニズム実装

### Phase 4: UI実装 ✅ 完了

1. **react-native-image-picker設定** ✅
   - ライブラリインストール（v5.7.0）
   - iOS権限設定:
     - NSCameraUsageDescription
     - NSPhotoLibraryUsageDescription
   - Android権限設定:
     - android.permission.CAMERA
     - 既存のREAD/WRITE_EXTERNAL_STORAGE

2. **Toastコンポーネント作成** ✅
   - シングルトンパターン実装
   - 3種類のタイプ（success/error/info）
   - アニメーション付き表示/非表示
   - 自動非表示タイマー（デフォルト3秒）
   - ToastProviderによるグローバル管理

3. **画像圧縮ユーティリティ** ✅
   - imageCompressor.ts作成
   - 最大サイズ: 1024x1024
   - 品質: 80%
   - uriToBlob変換機能
   - MIMEタイプ判定

4. **ProfileCreationScreen.tsx作成** ✅
   - 1画面にすべての入力項目表示（ユーザー要望に基づく）
   - 実装機能:
     - アバター画像選択（カメラ/ギャラリー）
     - アップロード進捗表示（パーセンテージ）
     - リアルタイムバリデーション
     - 文字数カウント表示
     - キーボード回避処理
   - UX改善:
     - ローディング中のボタン無効化
     - エラー時の入力欄ハイライト
     - 成功時の自動画面遷移
     - トーストによるフィードバック

### Phase 5: 遷移フロー実装（詳細計画）

#### 1. **App.tsxの修正**
   - ToastProviderの追加
   - AccountProviderの追加
   - Providerの正しい順序設定

#### 2. **RootNavigator.tsxの修正**
   - 現在の遷移ロジック:
     ```
     認証済み && メール確認済み → AppNavigator
     それ以外 → AuthNavigator
     ```
   - 新しい遷移ロジック:
     ```
     認証済み && メール確認済み && プロフィール作成済み → AppNavigator
     認証済み && メール確認済み && プロフィール未作成 → ProfileCreationScreen
     それ以外 → AuthNavigator
     ```
   - 必要な実装:
     - useAccountフックのインポート
     - hasCompletedProfile状態の取得
     - isCheckingProfile中のローディング表示
     - ProfileCreationScreenの条件分岐追加

#### 3. **ProfileCreationNavigator作成**
   - Stack.Navigatorの作成
   - ProfileCreationScreenの登録
   - ヘッダー非表示設定

#### 4. **Auth → Account連携の確認**
   - メール認証完了後の動作フロー:
     1. EmailVerificationScreen → 認証成功
     2. AuthStateManager → 認証状態更新
     3. RootNavigator → 再評価
     4. AccountProvider → プロフィール存在確認
     5. プロフィール未作成 → ProfileCreationScreen表示

#### 5. **成功後の遷移処理**
   - ProfileCreationScreen → プロフィール作成成功
   - accountStateManager → hasCompletedProfile更新
   - RootNavigator → 自動的にAppNavigatorへ遷移

#### 6. **エッジケースの対応**
   - ネットワークエラー時の処理
   - プロフィール確認中のローディング表示
   - タイムアウト処理
   - リトライ機能

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

- [x] Phase 1: 基盤構築完了
  - [x] Zustandストア実装
  - [x] エンティティ実装
  - [x] Provider実装
  - [x] 無限ループ防止対策
- [x] Phase 2: API層実装
  - [x] accountService実装（CRUD + アバター管理）
  - [x] accountStateManager実装（状態同期）
  - [x] エラーハンドリング統合
- [x] Phase 3: TanStack Query統合
  - [x] use-account-query.ts（6つのクエリ/ミューテーション）
  - [x] use-account.ts（3つの統合フック）
  - [x] queryClient更新（accountキー追加）
  - [x] 無限ループ防止（enabled条件、適切な依存配列）
- [x] Phase 4: UI実装
  - [x] react-native-image-picker設定（iOS/Android権限）
  - [x] Toastコンポーネント（シングルトンパターン）
  - [x] 画像圧縮ユーティリティ
  - [x] ProfileCreationScreen（1画面フォーム）
  - [x] リアルタイムバリデーション
  - [x] アップロード進捗表示
- [ ] Phase 5: 遷移フロー実装
- [ ] すべての必須項目が入力できる
- [ ] バリデーションが正しく動作する
- [ ] 画像がアップロードできる
- [ ] プロフィールがDBに保存される
- [ ] 保存後ホーム画面に遷移する
- [ ] エラー時の適切なフィードバック
- [ ] 一元管理による状態同期

## 実装上の注意点（無限ループ防止）

### 1. useEffectの依存配列
- 必要最小限の依存のみを含める
- オブジェクトの参照比較に注意（shallowを使用）
- useRefで前回値を記録して重複実行を防ぐ

### 2. イベントリスナー
- 適切なクリーンアップを実装
- 同じイベントを重複登録しない
- unsubscribe関数を確実に呼び出す

### 3. 状態更新
- 同期的な更新を避ける
- バッチ更新を活用
- 条件分岐で不要な更新を防ぐ

### 4. Provider間の連携
- Auth → Accountの単方向データフロー
- 循環参照を避ける
- イベントベースの疎結合な設計

## 次のフェーズ（Phase 3）の詳細

### TanStack Query統合の実装方針

1. **クエリキー設計**
   - 階層的なキー構造: `['account', 'profile', userId]`
   - 無効化戦略の明確化

2. **ミューテーション設計**
   - 楽観的更新による即座のフィードバック
   - エラー時の自動ロールバック
   - 成功時のキャッシュ更新

3. **React Nativeとの統合**
   - AppStateによるバックグラウンド対応
   - オフライン対応の考慮
   - リフレッシュ戦略

4. **StateManagement.mdとの整合性**
   - サーバー状態はTanStack Query
   - UI状態はZustand
   - 明確な責務分離の維持

## 実装済みコンポーネントの相関図

```
┌─────────────────┐
│ AuthProvider    │
│ (認証状態管理)   │
└────────┬────────┘
         │ 認証完了通知
         ▼
┌─────────────────┐
│ AccountProvider │
│ (Account状態)   │
└────────┬────────┘
         │ 初期化
         ▼
┌─────────────────────┐     ┌────────────────┐
│ accountStateManager │────▶│ accountService │
│ (状態同期)          │     │ (API通信)      │
└──────────┬──────────┘     └────────────────┘
           │ 更新                    ▲
           ▼                        │
┌─────────────────┐                │
│ account-store   │                │
│ (Zustand)       │                │
└────────┬────────┘                │
         │                         │
         ▼                         │
┌──────────────────────┐          │
│ use-account-query.ts │──────────┘
│ (TanStack Query)     │
└─────────┬────────────┘
          │
          ▼
┌─────────────────┐
│ use-account.ts  │
│ (統合フック)     │
└─────────────────┘
```

## Phase 4で実装したUI詳細

### 1. ProfileCreationScreenの実装詳細
- **レイアウト**: ScrollView内に全項目を配置（1画面完結型）
- **アバター選択**: 
  - 未選択時: カメラ/ギャラリーボタン表示
  - 選択済み: タップで再選択可能
  - アップロード中: 進捗パーセンテージ表示
- **フォーム制御**:
  - 必須項目が揃うまで作成ボタン無効化
  - 処理中は全入力を無効化
  - エラー時は該当フィールドを赤枠表示

### 2. 画像処理フロー
```
1. 画像選択（カメラ/ギャラリー）
   ↓
2. サイズチェック（5MB以下）
   ↓
3. 自動圧縮（1024x1024, 80%品質）
   ↓
4. Blob変換
   ↓
5. Supabase Storageアップロード
   ↓
6. URL取得・表示
```

### 3. トースト通知パターン
- **成功**: 緑色、チェックマークアイコン
- **エラー**: 赤色、アラートアイコン
- **情報**: 青色、インフォアイコン
- 表示位置: 画面上部（iOS: top:50, Android: top:30）

## Phase 5の実装順序

### Step 1: Provider設定
1. App.tsxにToastProvider追加
2. App.tsxにAccountProvider追加
3. Provider階層の確認

### Step 2: Navigator実装
1. ProfileCreationNavigator作成
2. RootNavigatorの条件分岐追加
3. ローディング処理の実装

### Step 3: 動作確認項目
- [ ] 新規登録 → メール認証 → プロフィール作成画面
- [ ] プロフィール作成 → ホーム画面遷移
- [ ] アプリ再起動時の画面振り分け
- [ ] エラー時のリトライ機能

## 技術的な注意点

### 無限ループ防止策（Phase 5）
1. **RootNavigatorでの対策**
   - useEffectの依存配列を最小限に
   - 状態変更の条件を厳密に

2. **Provider間の連携**
   - Auth → Account の単方向フロー維持
   - 循環参照の回避

3. **非同期処理の管理**
   - プロフィール確認中の状態管理
   - タイムアウト処理の実装