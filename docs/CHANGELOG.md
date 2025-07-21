# SoundZone - 変更履歴

## [3.1.1] - 2025-01-22 - 🛠️ iOS ビルドエラー修正 & 認証アーキテクチャ最終調整

### 🏗️ 認証システムアーキテクチャ最終統合
#### 📁 フォルダ構造の大幅再編成（Clean Architecture完全準拠）
- **新しいディレクトリ構成**
  ```
  src/features/auth/
  ├── application/          # アプリケーション層（ビジネスロジック）
  │   └── auth-store.ts    # Zustand統合状態管理
  ├── domain/              # ドメイン層（既存維持）
  │   └── entities/
  │       └── User.ts      # ユーザーエンティティ
  ├── infrastructure/      # インフラ層（外部連携）
  │   └── auth-service.ts  # Supabase認証サービス
  └── presentation/        # プレゼンテーション層（UI）
      ├── LoginScreen.tsx
      ├── SignUpScreen.tsx
      ├── EmailVerificationScreen.tsx
      └── hooks/
          └── use-auth.ts  # 統合プレゼンテーションフック
  ```

#### 🔄 レイヤー間責務の明確化
- **Application層新規実装**
  - `auth-store.ts`: Zustand + TanStack Query統合状態管理
  - UI状態（フォーム・モーダル・エラー）とサーバー状態の完全分離
  - 永続化設定（MMKV連携）・認証状態管理の統一化
- **Infrastructure層新規実装**
  - `auth-service.ts`: Supabase認証API抽象化
  - インターフェース定義（`AuthService`）とSupabase実装（`SupabaseAuthService`）
  - エラーハンドリング・型安全な結果返却（`AuthResult<T>`, `SignUpResult`）
- **Presentation層統合**
  - `use-auth.ts`: TanStack Query Mutations + Zustand Selectorsの統合
  - フォーム専用フック（`useLoginFormHook`, `useSignUpFormHook`, `useEmailVerificationHook`）
  - プレゼンテーション層でのビジネスロジック完全抽象化

#### 📝 削除・統合されたファイル
- **削除**: `src/features/auth/presenter/` ディレクトリ完全削除
  - `presenter/hooks/useAuth.ts` → `presentation/hooks/use-auth.ts` に統合
  - `presenter/queries/authQueries.ts` → `presentation/hooks/use-auth.ts` に統合  
  - `presenter/stores/authStore.ts` → `application/auth-store.ts` に統合
- **Clean Architecture準拠**: presenterレイヤー廃止、標準的な4層アーキテクチャに統一

#### 🎯 コード品質・機能向上
- **auth-store.ts（Application層）**
  - Zustand subscribeWithSelector ミドルウェア活用
  - UI状態の完全型安全管理（loginForm, signUpForm, emailVerification）
  - 永続化設定統合（MMKV連携）
  - セレクター最適化による再描画最小化
- **auth-service.ts（Infrastructure層）**
  - `AuthService` インターフェース定義による抽象化
  - Supabaseエラーメッセージの日本語翻訳
  - OTP認証完全対応（signup/email/recovery対応）
  - 型安全な結果型（`AuthResult<T>`, `SignUpResult`）
- **use-auth.ts（Presentation層）**
  - TanStack Query mutations完全統合
  - フォーム専用hooks分離（バリデーション・エラーハンドリング）
  - クールダウンタイマー自動管理
  - Clean Architecture原則準拠の依存関係制御

### 🛠️ iOS ビルド最適化
#### ⚡ Expo iOS ビルド警告解決
- **Hermes スクリプト依存関係警告対応**
  - `[CP-User] [Hermes] Replace Hermes for the right configuration` 警告の改善
  - Pod install による依存関係の再構築実行
  - ビルド成功率向上・警告ログ削減
- **重複ライブラリ警告修正**
  - `-lc++` 重複リンクエラーの解決
  - リンカー最適化によるビルド安定化

### 🐛 認証画面プロパティエラー修正
#### 🔧 カスタムフック プロパティ不整合解決
- **LoginScreen.tsx 修正**
  - `const { form, actions, isSubmitting }` → `const { form, updateEmail, updatePassword, handleSubmit, isSubmitting }`
  - `actions.updateEmail` → `updateEmail` の直接呼び出し
  - `actions.updatePassword` → `updatePassword` の直接呼び出し  
  - `actions.handleSubmit` → `handleSubmit` の直接呼び出し
- **SignUpScreen.tsx 修正**
  - `const { form, actions, isSubmitting }` → `const { form, updateEmail, updatePassword, updateConfirmPassword, handleSubmit, isSubmitting }`
  - `actions.updateEmail` → `updateEmail` の直接呼び出し
  - `actions.updatePassword` → `updatePassword` の直接呼び出し
  - `actions.updateConfirmPassword` → `updateConfirmPassword` の直接呼び出し
  - `actions.handleSubmit` → `handleSubmit` の直接呼び出し
- **EmailVerificationScreen.tsx 修正**
  - `useEmailVerificationHook` 返り値プロパティの正しいマッピング
  - `verificationCode, errors` → `verification.errors` 構造変更対応
  - `verifyOTPCode, resendVerificationEmail` → `verifyOTP, resendEmail` メソッド名修正
  - `updateVerificationCode` → `updateCode` プロパティ名修正
  - `resendCooldown` → `verification.resendCooldown` 構造変更対応

#### 🎯 型安全性向上
- **TypeScriptエラー完全解決**
  - `Cannot read property 'updateEmail' of undefined` エラー修正
  - `Cannot read property 'code' of undefined` エラー修正
  - カスタムフック返り値構造とコンポーネント使用の整合性確保
- **Clean Architecture 準拠維持**
  - Presentation層での正しいhook使用パターン実装
  - プロパティ構造変更に対応した適切なリファクタリング

### 🚀 アプリケーション動作改善
- **認証フロー安定化**
  - ログイン画面での入力フィールドエラー解消
  - サインアップ画面での入力フィールドエラー解消
  - メール認証画面でのOTP入力・送信エラー解消
- **iOS デバイスビルド成功**
  - `npx expo run:ios --device iPhonama` 正常実行
  - 警告最小化による開発体験向上

### 🧪 品質保証
- **ランタイムエラー解消**: 認証画面でのプロパティアクセスエラー完全修正
- **ビルドプロセス最適化**: iOS ビルド警告の大幅削減
- **型安全性確保**: TypeScript エラー完全解決

---

## [3.1.0] - 2025-01-21 - 📧 メール認証フロー完全実装 & Clean Architecture更なる改善

### 📧 メール認証システム完全実装

#### 🎯 理想的なユーザー認証フロー実現
- **新規登録→メール認証待ち→認証完了→Home画面**の自動遷移フロー実装
- **EmailVerificationScreen新規作成**
  - メール認証待ち専用画面
  - OTPコード入力UI（6桁数字、リアルタイムバリデーション）
  - メール再送信機能（60秒クールダウン付き）
  - ユーザーフレンドリーなUI/UX
  - 迷惑メールフォルダ確認案内
  - キーボード最適化（number-pad、autoComplete）
- **AuthNavigator拡張**
  - EmailVerificationScreen追加
  - 型安全なナビゲーション実装（AuthStackParamList）
- **認証状態3分類制御**
  - 未認証：AuthNavigator（ログイン・新規登録）
  - メール認証待ち：EmailVerificationScreen
  - 認証完了：AppNavigator（メインアプリ）

#### 🏗️ Clean Architecture + TanStack Query + Zustand 更なる改善

##### 📋 TanStack Query拡張
- **`useVerifyOTPMutation`実装**
  - OTPコード検証のミューテーション管理
  - エラーハンドリング・リトライ制御
  - 成功時のキャッシュ更新・セッション管理
- **`useResendVerificationEmailMutation`実装**
  - メール再送信のミューテーション管理
  - エラーハンドリング・リトライ制御
  - 成功時のキャッシュ更新
- **`useSendOTPMutation`実装**
  - OTP送信ミューテーション（signup/email_change/recovery対応）
  - shouldCreateUserオプション管理
- **`useAuthStatus`詳細化**
  - `AuthStatusDetails`型追加
  - `isSignedIn`, `isEmailVerified`, `needsEmailVerification`の詳細分析
  - 認証状態の細分化判定

##### 🎛️ Zustand UI状態管理拡張
- **emailVerification状態追加**
  ```typescript
  emailVerification: {
    isResending: boolean;
    resendCooldown: number;
    lastSentEmail?: string;
    verificationCode: string;
    isVerifying: boolean;
    errors: {
      code?: string;
      general?: string;
    };
  }
  ```
- **専用セレクター・アクション実装**
  - `useEmailVerificationState()` - 再描画最適化
  - `useEmailVerificationActions()` - アクション分離
  - クールダウンタイマー・UI状態の完全管理

##### 🎪 統合カスタムフック実装
- **`useEmailVerificationHook`新規作成**
  - TanStack Query（サーバー状態）+ Zustand（UI状態）統合
  - クールダウンタイマー自動管理（setInterval制御）
  - OTP検証処理の完全抽象化
  - メール再送信処理の完全抽象化
  - Clean Architectureの原則準拠

#### 🔄 認証状態監視・同期改善
- **RootNavigator認証分岐詳細化**
  - `useAuthStatus`のAuthStatusDetailsを活用
  - デバッグログによる状態遷移可視化
  - Supabase認証状態変更の確実な検知
  - 3つの認証状態に基づく適切な画面表示
- **EmailVerificationScreen最適化**
  - Presentation層でのSupabase直接使用を排除
  - アーキテクチャ準拠の完全実装
  - ローカル状態管理の削除（Zustand統合）

#### 🔐 OTP認証実装（マジックリンクではなく）
- **Supabase OTP認証完全対応**
  - `signInWithOtp()` - OTPコード送信
  - `verifyOtp()` - OTPコード検証
  - `resend()` - メール認証再送信
- **メールテンプレート最適化**
  - `{{ .Token }}`変数使用でOTPコード表示
  - Magic Linkテンプレートからの完全移行

### 🎯 ユーザビリティ向上
- **新規登録後の混乱解消**
  - パスワードエラー問題の根本解決
  - メール認証状態の明確な案内
  - 自動画面遷移による迷いのないフロー
- **エラーハンドリング改善**
  - OTP検証失敗時の適切なフィードバック
  - メール再送信失敗時の適切なフィードバック
  - ネットワークエラー・認証エラーの分離処理
- **パフォーマンス最適化**
  - 不要な再描画防止（セレクター最適化）
  - メモリ効率的な状態管理
  - Clean Architectureによる保守性向上

### 🧪 アーキテクチャ品質評価
- **Clean Architecture**: 🌟🌟🌟🌟🌟 完璧実装
- **TanStack Query**: 🌟🌟🌟🌟🌟 サーバー状態管理
- **Zustand**: 🌟🌟🌟🌟🌟 UI状態管理・再描画最適化
- **型安全性**: 🌟🌟🌟🌟🌟 完全TypeScript対応
- **保守性**: 🌟🌟🌟🌟🌟 責務分離・テスタビリティ

---

## [3.0.1] - 2025-01-21 - 🐛 認証エラー修正 & パフォーマンス最適化

### 🐛 認証システムバグ修正

#### ⚡ React無限更新ループエラー解決
- **LoginScreen/SignUpScreen**: Alert表示の重複を防止（useRefによる制御）
- **Zustandセレクター最適化**: `useAuthActions`の毎回新オブジェクト作成問題を解決
- **個別アクション分離**: `useLoginFormActions`, `useSignUpFormActions`を追加
- **useCallback依存配列最適化**: 不要な再実行を防止
- **循環参照解決**: useAuth内での循環呼び出しを直接mutation使用に変更

#### 🔐 Supabase認証セッションエラー解決
- **AuthSessionMissingError対応**: セッション未存在時を正常状態として処理
- **SupabaseAuthDataSource改善**:
  - セッション存在チェックを事前実行
  - `getCurrentUser()`でセッションなし時は即座にnull返却
  - 不要なネットワークアクセス回避
- **GetCurrentUserUseCase強化**:
  - セッション関連エラーを認証なし状態として適切に処理
  - NetworkErrorと認証なし状態の明確な区別
- **SupabaseAuthRepository改善**:
  - MMKV取得時のセッション有効性チェック追加
  - 無効セッション自動クリア機能
  - セッション関連エラーの安全な処理
- **TanStack Query最適化**:
  - セッション関連エラーを適切にキャッチしnull返却
  - 不要なエラーログ抑制

#### 🔧 型安全性・実装品質向上
- **SignUp/SignInの呼び出し修正**: mutateAsyncの正しい使用方法に変更
- **TypeScriptエラー解決**: 全コンパイルエラー修正完了
- **AuthContainer重複メソッド解決**: getter名重複問題を修正
- **MMKV設定最適化**: 存在しないプロパティ参照を削除

### ⚡ パフォーマンス改善
- **再描画最小化**: Context全体更新から個別セレクター更新へ
- **メモリ効率化**: 不要なオブジェクト作成防止
- **ネットワークアクセス最適化**: セッションチェック優先による通信削減

### 🎯 開発体験向上
- **エラーハンドリング統一**: 認証エラーの一貫した処理方法確立
- **デバッグ改善**: 適切なログレベル設定
- **型安全性強化**: 全TypeScriptエラー解決

### 🧪 アプリケーション動作改善
- **初回起動時**: セッションなし状態でのエラーなし認証画面表示
- **セッション有効時**: MMKV高速読み込みによるメイン画面表示
- **セッション無効時**: 自動ログアウト処理による認証画面表示
- **状態遷移安定化**: 無限ループなしのスムーズな画面切替

---

## [3.0.0] - 2025-01-21 - 🏗️ Clean Architecture + TanStack Query + Zustand 完全移行

### 🚀 認証システム大規模リファクタリング

#### 🏗️ アーキテクチャ完全刷新
- **従来のReact Context → 状態管理分離**
  - **サーバー状態**: TanStack Query（キャッシュ・楽観的更新・エラーハンドリング）
  - **UI状態**: Zustand（フォーム状態・再描画最小化）
  - **永続化**: MMKV（AsyncStorageから移行、5-10倍高速化）

#### 📁 新しいディレクトリ構成
```
src/features/auth/
├── domain/             # ビジネスルール（既存維持）
├── infra/              # データソース・永続化層
│   └── storage/
│       └── authStorage.ts      # MMKV永続化クラス
├── presenter/          # 状態管理統合層
│   ├── stores/
│   │   └── authStore.ts       # Zustandストア（UI状態）
│   ├── queries/
│   │   └── authQueries.ts     # TanStack Query（サーバー状態）
│   └── hooks/
│       └── useAuth.ts         # 統合カスタムフック
└── ui/                 # コンポーネント層
    ├── LoginScreen.tsx
    └── SignUpScreen.tsx
```

#### 🔧 新規実装ファイル
- **`shared/infra/storage/mmkvStorage.ts`**
  - MMKVラッパークラス（型安全・暗号化対応）
  - ストレージキー定数管理
  - オブジェクト・プリミティブ型サポート
- **`shared/presenter/queries/queryClient.ts`**
  - TanStack Query設定（キャッシュ戦略・リトライロジック）
  - クエリキーファクトリー関数
  - エラーハンドリングユーティリティ
- **`features/auth/presenter/stores/authStore.ts`**
  - Zustandストア（フォーム状態・UI状態・設定）
  - セレクター最適化（再描画最小化）
  - 型安全なアクション定義
- **`features/auth/presenter/queries/authQueries.ts`**
  - 認証関連Query/Mutationフック
  - キャッシュ無効化・楽観的更新
  - エラー時の自動リトライ制御
- **`features/auth/presenter/hooks/useAuth.ts`**
  - 統合認証フック（サーバー状態+UI状態）
  - フォーム専用フック（バリデーション・エラー表示）
  - 設定管理フック（生体認証・自動ログイン）
- **`features/auth/infra/storage/authStorage.ts`**
  - MMKV永続化クラス（セッション・ユーザー・トークン）
  - 有効期限管理・自動ログイン判定
  - Domainエンティティ変換ヘルパー

#### 🔄 既存ファイル更新
- **`SupabaseAuthRepository.ts`**
  - MMKV永続化統合（全認証メソッドで自動保存）
  - キャッシュファーストアプローチ実装
  - セッション有効期限管理
- **`LoginScreen.tsx` / `SignUpScreen.tsx`**
  - 新しいカスタムフック使用
  - フォーム状態・エラー表示自動化
  - リアルタイムバリデーション
- **`AccountScreen.tsx`**
  - ユーザー情報表示の型安全化
- **`RootNavigator.tsx`**
  - 新しい認証状態判定ロジック
- **`App.tsx`**
  - React Context → TanStack Query Provider移行

#### 🗑️ 削除ファイル
- **`AuthContext.tsx`** - 完全削除（TanStack Query + Zustand で代替）

#### 📦 新規依存関係
```json
{
  "@tanstack/react-query": "^5.83.0",
  "zustand": "^5.0.6", 
  "react-native-mmkv": "^3.3.0"
}
```

#### ⚡ パフォーマンス改善
- **再描画最小化**: Context全体更新 → セレクタ単位更新
- **永続化高速化**: AsyncStorage → MMKV（暗号化・同期アクセス）
- **メモリ使用量削減**: 不要なContext Provider削除
- **キャッシュ最適化**: TanStack Queryによる自動キャッシュ管理

#### 🔐 セキュリティ強化
- **MMKV暗号化**: セッション情報の暗号化保存
- **トークン管理**: アクセストークン・リフレッシュトークン分離管理
- **有効期限チェック**: 自動的なセッション有効性検証

#### 🎯 開発体験向上
- **型安全性**: 厳密なTypeScript型定義
- **エラーハンドリング**: 統一されたエラー表示・リトライロジック
- **フォーム管理**: バリデーション・状態管理の自動化
- **デバッグ機能**: ストレージ内容確認・状態表示ユーティリティ

#### 🧪 互換性
- **既存UI**: ユーザー体験は維持（内部実装のみ変更）
- **Clean Architecture**: Domain層は完全維持
- **型安全性**: 既存の型定義と完全互換

---

## [2.1.0] - 2025-01-04 - 🎨 レイヤーシステム実装 & モーダルUI大幅改善

### 🎨 レイヤーシステム実装
- **5つの固定レイヤー**を実装
  - 🏛️ 観光地（tourism）- 赤色
  - 🍽️ グルメ（gourmet）- 緑色  
  - 📚 文化（culture）- 青色
  - 🌿 自然（nature）- 緑色
  - 🎪 イベント（event）- 黄色
- **レイヤー選択UI**（右上角）
  - 複数選択可能
  - 視覚的フィードバック付き
  - リアルタイムピンフィルタリング
- **新しいコンポーネント・フック**
  - `LayerSelector.tsx` - レイヤー選択UI
  - `useLayerSelection.ts` - レイヤー選択状態管理
  - `useAudioPinFiltering.ts` - レイヤーベースピンフィルタリング
  - `LayersScreen.tsx` - 詳細レイヤー管理画面
- **AudioPinエンティティ拡張**
  - `layerIds: string[]` フィールド追加
  - 複数レイヤー所属対応

### 🎵 AudioPlayerModal大幅改善
- **3段階ボトムシート**実装
  - COLLAPSED（半画面表示）
  - EXPANDED（ほぼ全画面表示）
  - CLOSED（完全非表示）
- **高度なジェスチャー制御**
  - PanResponderによる上下スワイプ検出
  - 速度・距離に基づく状態遷移
  - スムーズなSpringアニメーション
- **レイアウト最適化**
  - プレイヤー情報部分を固定
  - 説明テキスト部分のみスクロール可能
  - 灰色背景でテキストエリアを視覚的に分離
- **新機能追加**
  - 投稿時間表示（相対時間：「2時間前」など）
  - レイヤー情報チップ表示（カラー付きアイコン）
  - タッチエリア最適化（ハンドルバー + プレイヤー情報エリア）

### 🕐 時間表示機能
- **相対時間ユーティリティ**実装
  - `getRelativeTime()` - 相対時間表示
  - `formatDuration()` - 再生時間フォーマット
- **AudioPinエンティティ拡張**
  - `createdAt?: Date` フィールド追加（オプショナル）
- **サンプルデータ更新**
  - 投稿時間情報を追加（4分前、2時間前、1日前）

### 🐛 バグ修正・パフォーマンス改善
- **React 18 ストリクトモード完全対応**
  - useInsertionEffect エラー完全修正
  - マウント状態追跡（`isMountedRef`）実装
  - 安全な状態更新関数（`safeSetState`）実装
  - `requestAnimationFrame`による状態更新遅延
  - アニメーション完了後の安全なコールバック処理
  - panResponder内での状態遷移安全化
  - メモリリーク防止・クリーンアップ処理強化
- **useLayoutEffect活用**
  - レンダリング前の同期実行保証
  - currentStateRef同期の最適化
- **TypeScript エラー解決**
  - 型定義の整合性確保
  - インポート問題の修正
- **panResponder最適化**
  - ScrollViewとの競合回避
  - ジェスチャー認識精度向上
  - イベントループ制御による安定化 