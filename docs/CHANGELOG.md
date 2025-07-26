# SoundZone - 変更履歴

## [2025-07-26] 認証機能の改善 - ネットワークエラーハンドリングとメモリリーク対策

### 概要
認証機能において、ネットワークエラーハンドリングの強化とメモリリーク対策を実装しました。

### 実装内容

#### 1. ネットワークエラーハンドリングの強化

**問題:**
- 機内モードなどオフライン時のエラーメッセージが技術的で分かりにくい
- タイムアウト処理がない
- エラー時の対処法が不明確

**解決策:**
1. **NetworkServiceの作成** (`/src/shared/services/networkService.ts`)
   - React Native NetInfoを使用したネットワーク状態監視
   - オフライン/オンライン状態のリアルタイム検出
   - ネットワークエラーの判定機能

2. **ErrorSanitizerの拡張**
   - より多くのネットワークエラーパターンの検出
   - 日本語でのユーザーフレンドリーなエラーメッセージ
   - 「インターネット接続エラー」「機内モードがオフになっていることを確認」など具体的な解決方法の提示

3. **AuthServiceの改善**
   - APIコール前のオフラインチェック
   - 30秒のタイムアウト設定（Promise.race使用）
   - ネットワークエラー時の特別な処理とメッセージ

4. **UI/UXの改善**
   - ネットワークエラー時に設定アプリを開くオプション
   - プラットフォーム別の設定画面への誘導（iOS: `app-settings:`、Android: `Linking.openSettings()`）

#### 2. メモリリーク対策の実装

**問題:**
- AuthProviderのクリーンアップ処理が初期化中の場合を考慮していない
- 全ての非同期処理でisMountedフラグが確認されていない

**解決策:**
1. **AuthProviderの初期化状態管理**
   - `initializationStateRef`で初期化状態を追跡（'idle' | 'initializing' | 'initialized'）
   - クリーンアップ時に初期化状態を確認し、完了時のみ`authStateManager.cleanup()`を実行
   - 初期化中の各非同期処理でisMountedフラグを確認

2. **エラーハンドリングの強化**
   - authStateManagerとauthTokenManagerのクリーンアップでtry-catchを追加
   - 詳細なログ出力でデバッグを容易に

3. **タイマーのクリーンアップ確認**
   - emailVerificationのクールダウンタイマー：✅ 既に適切に実装
   - rateLimiterのロックアウトタイマー：✅ 既に適切に実装
   - authTokenManagerのリフレッシュタイマー：✅ 既に適切に実装

#### 3. メール認証のクールダウンタイマー修正

**問題:**
- 新規登録後にEmailVerificationScreenに遷移した際、60秒のクールダウンが開始されない

**解決策:**
1. `useEmailVerificationHook`に`setEmailAndStartCooldown`関数を追加
2. EmailVerificationScreen初回マウント時にメールアドレスとクールダウンを自動設定
3. 「再送信可能まで X秒」の表示が正しく動作

### 技術的な改善点
- **ネットワーク状態の監視**: NetInfoによるリアルタイム監視
- **エラーメッセージの国際化**: 日本語での分かりやすいメッセージ
- **メモリ管理**: 初期化状態の適切な管理によるメモリリーク防止
- **ユーザビリティ**: エラー時の具体的な解決策の提示

### 結果
- オフライン時のエラーハンドリングが大幅に改善
- メモリリークの可能性を排除
- メール認証フローの安定性向上
- 実機での動作確認完了

## [2025-07-26] Auth認証機能の競合状態（Race Condition）問題の解決

### 概要
認証機能において発生していた以下の競合状態の問題を解決しました：
1. セッション復元とauthStateManager初期化の競合
2. 認証プロセス中の重複実行

### 解決した問題

#### 1. セッション復元とauthStateManager初期化の競合
**問題内容:**
- AuthProviderで`sessionRestoration.restoreSession()`と`authStateManager.initialize()`が並行実行される可能性があった
- sessionRestorationが成功してもauthStateManagerが未初期化の場合、状態が正しく同期されない
- authStateManagerの`initialize`内でも`getSession()`が呼ばれるため、セッション復元が完了する前に状態が設定される可能性があった

**解決策:**
- `sessionRestoration.restoreSession()`がSessionオブジェクトを返すように変更
- `authStateManager.initialize(queryClient, restoredSession?)`でセッションを受け取れるように変更
- AuthProviderで順次実行し、復元されたセッションを確実にauthStateManagerに渡す

#### 2. 認証プロセス中の重複実行防止
**問題内容:**
- `authProcessState`は存在していたが、実際のログイン/サインアップ処理での使用が不完全
- ボタンの無効化がフォームレベル(`isSubmitting`)でしか管理されていない
- 複数の認証画面から同時に認証処理が実行される可能性があった

**解決策:**
- `useLoginFormHook`と`useSignUpFormHook`の`isSubmitting`に`authProcessState !== 'IDLE'`の条件を追加
- これにより、認証処理中は全ての認証関連ボタンが無効化される
- API呼び出し前の`authProcessState`チェックで重複実行を防止

### 実装内容

#### 修正ファイル:
1. `/src/features/auth/infra/services/authStateManager.ts`
   - `initialize`メソッドにオプショナルな`restoredSession`パラメータを追加
   - セッションが渡された場合はそれを使用、なければ`getSession()`を呼び出す

2. `/src/features/auth/infra/services/sessionRestoration.ts`
   - `restoreSession()`の戻り値を`Promise<boolean>`から`Promise<Session | null>`に変更
   - 復元されたセッションを返すように修正

3. `/src/features/auth/presentation/providers/AuthProvider.tsx`
   - セッション復元の結果を`authStateManager.initialize()`に渡すように修正
   - 順次実行により競合状態を解消

4. `/src/features/auth/presentation/hooks/use-auth.ts`
   - `useLoginFormHook`の`isSubmitting`に`authProcessState !== 'IDLE'`を追加
   - `useSignUpFormHook`の`isSubmitting`に`authProcessState !== 'IDLE'`を追加

### 技術的な改善点
- **順次実行**: セッション復元→authStateManager初期化の順序を保証
- **状態の一貫性**: 復元されたセッションが確実に反映される
- **グローバルな重複防止**: `authProcessState`による全画面での認証処理制御
- **コードの簡潔性**: 不要な重複チェックを削除し、単一の責任原則を維持

### 結果
- セッション復元の信頼性向上
- 認証処理の重複実行を完全に防止
- より堅牢な認証フローの実現
- 実機での動作確認完了

## [2025-07-25] Auth（認証）機能の一元管理実装

### 概要
認証機能において、CENTRALIZED_STATE_MANAGEMENT.mdのガイドラインに基づき、AuthProviderによる一元管理を実装しました。LayersProviderと同様のパターンで実装し、認証状態の管理を最適化しました。

### 実施内容

#### 1. AuthProviderの作成
**新規作成ファイル:**
- `/src/features/auth/presentation/providers/AuthProvider.tsx`
  - アプリケーションレベルで認証状態を一元管理
  - authStateManagerによる認証状態の監視
  - セッション復元とトークン自動更新の統合
  - メモリリーク対策の実装

- `/src/features/auth/presentation/providers/useAuthProvider.ts`
  - AuthProvider専用のカスタムフック
  - 全認証データのクリア機能
  - 認証状態の再同期機能

#### 2. Provider階層の構築
**修正ファイル:**
- `/App.tsx`
  - QueryClientProvider → AuthProvider → LayersProvider → App の階層を構築
  - 依存関係を明示的に表現

#### 3. 既存コードのリファクタリング
**修正ファイル:**
- `/src/shared/infra/initialization/appInitializer.ts`
  - 認証関連の初期化処理を削除（AuthProviderで一元管理）
  
- `/src/features/auth/presentation/hooks/use-auth.ts`
  - ミューテーションの簡素化
  - authStateManagerによる自動同期を活用
  - useResetとuseQueryClientのインポート追加

- `/src/navigation/RootNavigator.tsx`
  - 重複するauthStateManagerの初期化処理を削除

#### 4. テスト実装
**新規作成ファイル:**
- `/src/features/auth/presentation/providers/__tests__/AuthProvider.test.tsx`
  - AuthProviderの単体テスト
  - 初期化とクリーンアップの動作確認

### 技術的な改善点
- **一元管理**: 認証状態の管理をAuthProviderに集約
- **自動同期**: Supabaseの認証状態変更を自動検知・同期
- **メモリリーク対策**: isMountedフラグによる非同期処理の安全な管理
- **保守性**: LayersProviderと同じパターンで一貫性を確保

### 実装アプローチ
StateManagement.mdとCENTRALIZED_STATE_MANAGEMENT.mdの設計原則に従い：
- Single Source of Truth: AuthProviderで認証状態を一元管理
- レイヤー責務の明確化: 既存のauthStateManagerを最大限活用
- 段階的な移行: 既存のフックインターフェースを維持しつつ内部実装を改善

### 結果
- TypeScriptコンパイルエラー: 0
- 認証フローの安定性向上
- セッション復元の確実な動作
- トークン自動更新の信頼性向上

### 実機検証チェックリスト対応状況

#### ✅ 実装済み機能一覧

**1. 認証状態の単一ソース化**
- 初回起動時の認証状態確認（`[AuthProvider] Initializing auth...`ログ出力）
- ログイン後の状態同期（セッション自動復元）
- トークン自動更新（5分前に自動更新スケジューリング）

**2. 競合状態の解決**
- ログイン中の重複操作防止（`Login attempt blocked`ログ出力）
- サインアップ中の重複操作防止（`Signup attempt blocked`ログ出力）
- ログアウト中の操作防止（`Signout attempt blocked`ログ出力）
- エラーメッセージ: '認証処理中です。しばらくお待ちください。'

**3. メモリリーク対策**
- 画面遷移時のタイマークリーンアップ
- アプリ終了時の完全クリーンアップ（`[AuthStateManager] Cleaned up`ログ出力）
- isMountedフラグによる非同期処理の安全管理

**4. エラーハンドリング**
- ネットワークエラー時のユーザーフレンドリーメッセージ
- レート制限機能（5回失敗で15分ロックアウト）
- カウントダウン表示（秒単位で更新）
- errorSanitizerによる技術的詳細の隠蔽

**5. セッション永続化**
- アプリ再起動後の自動セッション復元
- 長時間放置後のトークン自動更新によるセッション維持

**6. デバッグログ**
```
[AuthProvider] Initializing auth...
[AuthStateManager] Initialized
[AuthStateManager] Auth state changed: SIGNED_IN
[AuthTokenManager] Scheduling token refresh in XXXs
[AuthStateManager] Auth state changed: SIGNED_OUT
[AuthProvider] Cleaning up...
```

**7. 画面遷移制御**
- 認証状態による適切な画面表示（AuthNavigator/AppNavigator）
- メール認証状態の確認
