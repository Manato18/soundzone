# SoundZone - 変更履歴

## [2025-07-25] 認証システムの状態管理改善（Phase 3）

### 概要
AUTH_ISSUES_SOLUTIONS.mdのPhase 3を完了し、認証状態の一元管理、競合状態の解決、メモリリークの防止を実装しました。

### 主要な実装内容

#### 1. 認証状態の単一ソース化
**新規作成ファイル:**
- `src/features/auth/infra/services/authStateManager.ts`
  - Supabaseのauth.onAuthStateChangeを一元管理
  - ZustandストアとTanStack Queryの自動同期
  - 認証状態変更時の統一的な処理

**修正ファイル:**
- `src/features/auth/infra/services/authTokenManager.ts`
  - 重複するonAuthStateChangeリスナーを削除
  - authStateManagerからの呼び出しに変更
- `src/navigation/RootNavigator.tsx`
  - authStateManagerの初期化処理を追加
  - 重複するリスナーを削除
- `src/features/auth/presentation/hooks/use-auth.ts`
  - useCurrentUserQueryをZustandストアと連携

#### 2. 競合状態の解決
**修正ファイル:**
- `src/features/auth/application/auth-store.ts`
  - `authProcessState`フラグを追加（'IDLE' | 'SIGNING_IN' | 'SIGNING_UP' | 'SIGNING_OUT'）
  - 状態管理アクションを追加
- `src/features/auth/presentation/hooks/use-auth.ts`
  - 各認証操作（signIn、signUp、signOut）に状態チェックを追加
  - 認証処理中は他の操作をブロック
  - 適切なエラーメッセージを表示

#### 3. メモリリークの防止
- 全てのuseEffectにクリーンアップ処理を確認・実装
- authStateManager: リスナーのunsubscribe処理
- authTokenManager: タイマーのクリア処理
- ロックアウトタイマー: clearInterval処理
- クールダウンタイマー: clearTimeout処理

### バグ修正
- `sessionPersistence.clearSession()` → `clearPersistedSession()`に修正
- `sessionPersistence.saveSession()` → `persistSession()`に修正  
- `QueryUser`型のプロパティ不一致を修正（username、bio → name、avatarUrl）
- TypeScript型エラーを修正（undefined → null）

### 技術的な改善点
- 認証状態の一元管理によるデータ整合性の向上
- 競合状態の防止による安定性向上
- メモリリークの完全な防止
- TypeScript型安全性の確保

### 次のステップ
Phase 4（生体認証、セッションタイムアウト）は必要に応じて実装予定です。

## [2025-07-25] 認証システムのセキュリティ強化（Phase 1 & 2）

### 概要
AUTH_ISSUES_SOLUTIONS.mdに基づいて、認証システムの重大なセキュリティ問題を修正し、UX改善を実装しました。

### Phase 1: 緊急対応（完了）

#### 1. ハードコードされた暗号化キーの修正
**追加ファイル:**
- `src/shared/infra/security/encryptionKeyManager.ts`
  - expo-secure-storeを使用したキーチェーン保存
  - 初回起動時の自動キー生成
  - フォールバック機構

- `src/shared/infra/initialization/appInitializer.ts`
  - アプリ起動時の初期化処理

**変更ファイル:**
- `src/shared/infra/storage/mmkvStorage.ts`
  - 動的な暗号化キー取得
  - フォールバック対応
- `App.tsx`
  - 初期化処理の追加
- 各storeファイル
  - グローバルmmkvStorageの使用

#### 2. トークン自動更新の実装
**追加ファイル:**
- `src/features/auth/infra/services/authTokenManager.ts`
  - 期限5分前の自動更新
  - onAuthStateChangeイベント監視
  - スケジューリング機能

- `src/features/auth/infra/services/authInterceptor.ts`
  - API呼び出し前のトークン検証
  - 401エラー時の自動リトライ

- `src/features/auth/presentation/hooks/use-auth-api.ts`
  - 認証付きAPI呼び出しフック

#### 3. 認証状態の永続化
**追加ファイル:**
- `src/features/auth/infra/services/sessionPersistence.ts`
  - refreshToken: expo-secure-store保存
  - メタデータ: MMKV保存
  - 30日間のセッションタイムアウト

- `src/features/auth/infra/services/sessionRestoration.ts`
  - アプリ起動時の自動復元
  - セッション有効性チェック

**変更ファイル:**
- `src/features/auth/infrastructure/auth-service.ts`
  - ログイン/サインアップ時の永続化
  - ログアウト時のクリア
- `src/navigation/RootNavigator.tsx`
  - セッション変更の監視

### Phase 2: セキュリティ強化（完了）

#### 1. レート制限の実装
**追加ファイル:**
- `src/features/auth/infra/services/rateLimiter.ts`
  - 5回試行で15分ロックアウト
  - Exponential backoff（2秒→4秒→8秒...）
  - メモリ内カウント管理

**変更ファイル:**
- `src/features/auth/presentation/hooks/use-auth.ts`
  - useLoginFormHookにレート制限追加
  - ロックアウト状態の管理
- `src/features/auth/presentation/LoginScreen.tsx`
  - 残り試行回数の表示
  - ロックアウト時のカウントダウン
  - UIフィードバックの改善

#### 2. エラーメッセージのサニタイズ
**追加ファイル:**
- `src/features/auth/infra/services/errorSanitizer.ts`
  - カテゴリベースのエラー分類
  - 正規表現パターンマッチング
  - ユーザーフレンドリーな日本語メッセージ
  - 開発環境での詳細表示

**変更ファイル:**
- `src/features/auth/infrastructure/auth-service.ts`
  - translateErrorメソッドの削除
  - 全エラーでerrorSanitizer使用

### パッケージ追加
- `expo-secure-store`: セキュアなキー/トークン保存
- `expo-crypto`: 暗号化キー生成

### 技術的な改善点
- セキュアな暗号化キー管理
- トークンの自動更新によるシームレスな認証維持
- セッションの永続化による再ログイン不要化
- ブルートフォース攻撃への対策
- エラー情報の漏洩防止

### 削除項目
- ハードコードされた暗号化キー
- translateErrorメソッド（errorSanitizerに置き換え）

### ディレクトリ構造の整理
- `src/features/auth/infrastructure/` ディレクトリを削除
- `src/features/auth/infrastructure/auth-service.ts` を `src/features/auth/infra/services/authService.ts` に移動・統合
- ファイル名をcamelCase規約に統一（auth-service.ts → authService.ts）
- 全ての関連インポートパスを更新
