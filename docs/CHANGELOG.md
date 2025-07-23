# SoundZone - 変更履歴

## [3.2.0] - 2025-01-22 - 🚀 状態管理アーキテクチャの大幅改善

### 🏗️ Zustand実装の最適化
#### ⚡ Middleware構成の改善
- **middleware順序の最適化**: `devtools → persist → immer → subscribeWithSelector`
  - devtoolsを最外層に配置して本番ビルドでの除外を容易に
  - persistによる自動永続化
  - immerによる簡潔な状態更新
  - subscribeWithSelectorで詳細な状態監視

#### 💾 Persist Middlewareによる自動永続化
- **手動MMKV操作の削除**
  - 設定（settings）のみを永続化対象に指定
  - MMKVカスタムストレージアダプター実装
  - 初回起動時の自動設定復元
- **永続化対象の最適化**
  ```typescript
  partialize: (state) => ({
    settings: state.settings,
  })
  ```

#### 📝 Immer Middlewareによるコード簡潔化
- **Before（手動の不変更新）**:
  ```typescript
  set((state) => ({
    ui: { ...state.ui, loginForm: { ...state.ui.loginForm, email } }
  }))
  ```
- **After（immerによる直接変更）**:
  ```typescript
  set((state) => {
    state.ui.loginForm.email = email;
  })
  ```

### 🎯 エラーハンドリングの強化
#### 📧 バリデーション改善
- **メールアドレス形式チェック**
  - 正規表現による厳密な検証
  - エラーメッセージの明確化
- **パスワード強度チェック**
  - 最小文字数（8文字）
  - 大文字・小文字・数字の必須化
  - リアルタイムフィードバック
- **OTPコード検証**
  - 6桁数字の厳密なチェック
  - 入力時の即時バリデーション

#### 🔄 TanStack Query統合改善
- **onError/onSuccessハンドラー追加**
  - エラー時の適切なログ出力
  - 成功時のキャッシュ更新最適化
- **ミューテーション後の処理**
  - 認証後の関連クエリ再フェッチ
  - サインアウト時のキャッシュクリア

### 🗂️ 設定構造の改善
- **UI設定と永続化設定の分離**
  - `ui`配下: 一時的なUI状態（フォーム、モーダル等）
  - `settings`配下: 永続化される設定（生体認証、自動ログイン等）
- **lastLoginEmailの移動**
  - `ui.loginForm`から`settings.lastLoginEmail`へ
  - 永続化による自動復元

### 🧹 不要コードの削除
- **loadPersistentSettings関数の削除**
  - persist middlewareによる自動化
  - 手動呼び出しが不要に
- **個別MMKV操作の削除**
  - setBiometricEnabled内の手動保存
  - setAutoLoginEnabled内の手動保存
  - reset内の手動削除

### 📊 パフォーマンス最適化
- **Shallow比較の適切な使用**
  - 複数値を返すセレクターでの最適化検討
  - 単一値セレクターでは不要
- **開発環境限定のdevtools**
  ```typescript
  enabled: process.env.NODE_ENV === 'development'
  ```

### 🔍 型安全性の向上
- **すべてのTypeScriptエラー解決**
- **明示的な型定義維持**
- **エクスポート名の後方互換性維持**
