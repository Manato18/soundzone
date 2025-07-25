# 認証システム問題解決ガイド

## 実装状況
- ✅ Phase 1: 緊急対応（完了）
- ✅ Phase 2: セキュリティ強化（完了）
- ⏳ Phase 3: 状態管理の改善（未実装）

## 目次
1. [重大なセキュリティ問題の解決](#1-重大なセキュリティ問題の解決)
2. [状態管理の問題の解決](#2-状態管理の問題の解決)
3. [機能面の不足の解決](#3-機能面の不足の解決)
4. [実装優先順位とロードマップ](#4-実装優先順位とロードマップ)

---

## 1. 重大なセキュリティ問題の解決

### 1.1 ハードコードされた暗号化キーの解決 ✅

**問題**: `mmkvStorage.ts`に暗号化キーが直接記載されている

**実装済みの解決策**:
1. **キー生成の自動化（実装済み）**
   - `encryptionKeyManager.ts`を作成
   - `expo-secure-store`を使用してキーチェーンに保存
   - `expo-crypto`を使用して32バイトのランダムキーを生成

2. **実装したアプローチ**
   ```typescript
   // /src/shared/infra/security/encryptionKeyManager.ts
   async getOrCreateEncryptionKey(): Promise<string> {
     const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
     if (existingKey) return existingKey;
     const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
     const newKey = btoa(String.fromCharCode(...new Uint8Array(randomBytes)));
     await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey);
     return newKey;
   }
   ```

3. **実装した考慮事項**
   - expo-secure-storeがiOS/Android両対応
   - キーチェーンアクセス失敗時のフォールバック実装済み
   - 開発環境での動作確認済み

### 1.2 トークン管理の改善 ✅

**問題**: トークンの自動更新がなく、期限切れ処理が不適切

**実装済みの解決策**:

1. **トークンリフレッシュメカニズム（実装済み）**
   - `authTokenManager.ts`を作成
   - Supabaseの`auth.onAuthStateChange`を使用
   - トークン有効期限の5分前に自動更新
   - バックグラウンドでの定期的なトークン更新

2. **実装したアプローチ**
   ```typescript
   // /src/features/auth/infra/services/authTokenManager.ts
   private scheduleTokenRefresh(session: Session): void {
     const timeUntilExpiry = (session.expires_at! * 1000) - Date.now();
     const refreshTime = timeUntilExpiry - this.TOKEN_REFRESH_MARGIN;
     this.refreshTimer = setTimeout(() => this.refreshToken(), refreshTime);
   }
   ```

3. **実装したトークン状態管理**
   - セッション情報は自動的にSupabaseが管理
   - リフレッシュトークンは内部的に保持
   - 自動更新により手動での期限管理が不要

### 1.3 認証状態の永続化 ✅

**問題**: アプリ再起動後に認証状態が失われる

**実装済みの解決策**:

1. **セッション永続化戦略（実装済み）**
   - `sessionPersistence.ts`を作成
   - 混合アプローチ：重要データはexpo-secure-store、メタデータはMMKV
   ```typescript
   // /src/features/auth/infra/services/sessionPersistence.ts
   保存する情報:
   - refreshToken（expo-secure-storeに暗号化保存）
   - userId, email, expiresAt（MMKVに保存）
   ```

2. **実装したアプリ起動時の処理**
   ```typescript
   async restoreSession(): Promise<StoredSession | null> {
     const refreshToken = await SecureStore.getItemAsync('soundzone_refresh_token');
     const metadata = await getStorage().getString('soundzone_session_metadata');
     // セッション復元ロジック
   }
   ```

3. **実装したセキュリティ考慮事項**
   - refreshTokenはexpo-secure-storeで暗号化保存
   - メタデータはMMKVの暗号化機能で保護
   - セッション有効期限のチェック機能

## 2. 状態管理の問題の解決

### 2.1 認証状態の単一ソース化

**問題**: Zustand、TanStack Query、Supabaseで別々に管理

**解決策**:

1. **統合アーキテクチャ**
   ```
   状態管理の階層:
   1. Supabase: 真のソース（サーバー側）
   2. Zustand: クライアント側の単一ソース
   3. TanStack Query: キャッシュレイヤー（Zustandから派生）
   ```

2. **同期メカニズム**
   ```
   イベントフロー:
   1. Supabaseのauth状態変更をリスナーで検知
   2. Zustandストアを更新
   3. TanStack Queryのキャッシュを無効化
   4. 関連コンポーネントが自動的に再レンダリング
   ```

3. **実装パターン**
   - カスタムフック`useAuthState`で統一されたインターフェース提供
   - 認証操作は全てZustandアクションを経由
   - Supabase直接操作の禁止

### 2.2 競合状態の解決

**問題**: サインアップ時のsignOut処理で競合状態が発生

**解決策**:

1. **状態遷移の明確化**
   ```
   状態遷移図:
   - IDLE → SIGNING_OUT → SIGNED_OUT → SIGNING_UP → SIGNED_UP
   - 各状態で許可される操作を制限
   ```

2. **非同期処理の改善**
   - Promise chainではなくasync/awaitで明確な順序制御
   - 遷移中の操作をキューイング
   - AbortControllerでキャンセル可能な処理

3. **デバウンス/スロットリング**
   - 認証操作に最小間隔を設定（例：2秒）
   - 連続したリクエストを防止

### 2.3 メモリリークの防止

**問題**: useEffectのクリーンアップ不足、参照の保持

**解決策**:

1. **適切なクリーンアップ**
   ```
   チェックリスト:
   - [ ] 全てのイベントリスナーの解除
   - [ ] タイマーのクリア
   - [ ] Observableのunsubscribe
   - [ ] AbortControllerのabort
   ```

2. **WeakMapの活用**
   - エラー参照などの一時的なデータにWeakMapを使用
   - 自動的なガベージコレクション

3. **React DevToolsでの検証**
   - Profilerでメモリ使用量を監視
   - なぜレンダリングされたかを追跡

## 3. 機能面の不足の解決

### 3.1 レート制限の実装 ✅

**問題**: ブルートフォース攻撃に対する防御がない

**実装済みの解決策**:

1. **クライアント側レート制限（実装済み）**
   - `rateLimiter.ts`を作成
   - ログイン試行をメモリ内でカウント
   - 5回失敗で15分間ロック
   - exponential backoff実装済み
   ```typescript
   // /src/features/auth/infra/services/rateLimiter.ts
   async checkAndRecordAttempt(identifier: string): Promise<{
     allowed: boolean;
     remainingAttempts?: number;
     waitTimeMs?: number;
     lockedUntil?: Date;
   }>
   ```

2. **サーバー側との連携（推奨）**
   - サーバー側でもレート制限を実装することを推奨
   - IPアドレスベースの制限
   - アカウントベースの制限

3. **実装したユーザー体験の考慮**
   - 残り試行回数の表示機能
   - ロック解除までの時間表示機能
   - エラーメッセージでの適切なフィードバック

### 3.2 エラー処理の改善 ✅

**問題**: 生のエラーメッセージがユーザーに表示される

**実装済みの解決策**:

1. **エラーマッピング（実装済み）**
   - `errorSanitizer.ts`を作成
   - カテゴリベースのエラー処理実装
   ```typescript
   // /src/features/auth/infra/services/errorSanitizer.ts
   エラー分類:
   - 認証エラー: ユーザーフレンドリーなメッセージ
   - ネットワークエラー: 接続状態の確認を促す
   - バリデーションエラー: 入力内容の確認を促す
   - サーバーエラー: 一般的なエラーメッセージ
   - 不明なエラー: サポートへの連絡を促す
   ```

2. **実装したエラーログ機能**
   - 開発環境ではconsole.errorで詳細表示
   - 本番環境では詳細情報を隠蔽
   - Supabaseのエラー構造に対応

3. **実装したサニタイズ機能**
   - 技術的な詳細を除去
   - ユーザーに適切なメッセージを表示
   - 元のエラー情報は開発時のみ利用可能

## 4. 実装優先順位とロードマップ

### Phase 1: 緊急対応（✅ 完了）
1. ✅ ハードコードされた暗号化キーの修正
   - `encryptionKeyManager.ts`実装済み
2. ✅ トークン自動更新の実装
   - `authTokenManager.ts`実装済み
3. ✅ 認証状態の永続化
   - `sessionPersistence.ts`実装済み

### Phase 2: セキュリティ強化（✅ 完了）
1. ✅ レート制限の実装
   - `rateLimiter.ts`実装済み
2. ✅ エラーメッセージのサニタイズ
   - `errorSanitizer.ts`実装済み

### Phase 3: 状態管理の改善（⏳ 未実装）
1. 認証状態の単一ソース化
2. 競合状態の解決
3. メモリリークの修正


## テスト戦略

### ユニットテスト
- 各認証関数の個別テスト
- エラーケースの網羅的テスト
- モックを使用した依存関係の分離

### 統合テスト
- 認証フロー全体のE2Eテスト
- 状態遷移のテスト
- エラーリカバリーのテスト

### セキュリティテスト
- ペネトレーションテスト
- 静的解析ツールの使用
- セキュリティ監査

## まとめ

この文書で提案した解決策を実装することで、SoundZoneアプリの認証システムは以下の改善が期待できます：

1. **セキュリティの大幅な向上**: 暗号化キーの適切な管理、トークンの自動更新、セッション管理の強化
2. **ユーザー体験の向上**: 再ログイン不要、エラー時の適切な対応、生体認証による利便性
3. **保守性の向上**: 単一の状態管理、明確なエラー処理、適切なログ記録

各フェーズを順次実装することで、リスクを最小限に抑えながら着実に改善を進めることができます。