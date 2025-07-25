# SoundZone - 変更履歴

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
