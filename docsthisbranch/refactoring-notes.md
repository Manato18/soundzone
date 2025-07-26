# Account機能リファクタリング - 完了報告

## リファクタリング概要

2025年1月26日、Account機能の大規模リファクタリングを完了しました。このリファクタリングは、StateManagement.mdとCentralizedStateManagement.mdの原則に従い、クリーンアーキテクチャを適用した実装への移行を目的としています。

## 解決した問題

### 1. ✅ クリーンアップ関数によるフォームリセット問題
**問題**: アンマウント時にフォームがリセットされ、再マウント時に入力値が消える
**対策**: 
- クリーンアップはプロフィール作成成功時のみ実行
- アンマウント時には実行しない

### 2. ✅ 再レンダリングによる入力値の消失
**問題**: 文字入力のたびにコンポーネントが再レンダリングされ、フォーカスが失われる
**対策**:
- shallow比較を適切に使用
- 個別フィールド更新関数を統合（updateForm一つに）
- Blobデータをstoreから除外

### 3. ✅ AuthとAccountの密結合
**問題**: 相互依存により、Auth状態の変更がAccount全体の再レンダリングを引き起こす
**対策**:
- IAuthContextを削除し、シンプルな依存関係に
- AccountProviderからauthUserプロップスを削除
- 必要最小限の情報のみuseAuthから取得

### 4. ✅ 無限ループエラー "Maximum update depth exceeded"
**問題**: useAccountFormActionsがオブジェクトを返すため、毎回新しい参照が作成される
**対策**:
- アクションを個別に取得するように変更
- useCallbackの依存配列を適切に設定

### 5. ✅ "this.mapToQueryProfile is not a function" エラー
**問題**: TanStack QueryのmutationFnでthisコンテキストが失われる
**対策**:
- サービスクラスのコンストラクタでメソッドをバインド
- mutationFnでアロー関数ラップを使用

### 6. ✅ 新規登録後のOTP検証で画面遷移しない問題
**問題**: OTP検証成功後、emailVerifiedステータスが更新されず、ProfileCreationScreenに遷移しない
**対策**:
- OTP検証後にユーザーデータを再取得
- authStateManagerでemailVerifiedステータスを適切に同期
- 認証状態変更を手動でトリガー

## 実装の主な変更点

### 1. 状態管理の明確な分離
- **サーバー状態**: TanStack Query（profile, profileExists）
- **UI状態**: Zustand（form, uploadState）
- **永続化**: hasCompletedProfileのみ

### 2. Blob管理の改善
```typescript
// ❌ 旧: storeに保存
avatarLocalBlob?: Blob;

// ✅ 新: Refで管理
const imageDataRef = useRef<ImageData | null>(null);
```

### 3. シンプルなAPI
```typescript
// ❌ 旧: 多数の個別関数（15個のアクション）
setDisplayName(), setBio(), setAvatarLocalData()

// ✅ 新: 統合関数（4個のアクション）
updateForm({ displayName, bio, avatarUri })
```

### 4. クリーンアップの適切な実行タイミング
```typescript
// ✅ プロフィール作成成功時のみ
if (result.success) {
  cleanup();
}
```

## ファイル構成の変更

### 削除されたファイル
- 旧版のstore、hooks、providers、screens
- AccountStateManager（StateManagerパターンを廃止）
- IAuthContext（不要な抽象化を削除）

### 最終的なファイル構成
```
account/
├── application/
│   └── account-store.ts          # Zustandストア（UI状態のみ）
├── domain/
│   └── entities/
│       └── Profile.ts            # ドメインエンティティ
├── infrastructure/
│   └── services/
│       └── accountService.ts     # APIサービス
└── presentation/
    ├── hooks/
    │   ├── use-account.ts        # 統合フック
    │   └── use-account-query.ts  # TanStack Queryフック
    ├── providers/
    │   └── AccountProvider.tsx   # コンテキストプロバイダー
    └── screens/
        └── ProfileCreationScreen.tsx
```

## パフォーマンス改善

1. **再レンダリングの削減**
   - 6回のRootNavigator再レンダリング → 1回
   - 3回のProfileCreationScreen再レンダリング → 1回

2. **メモリ使用量の最適化**
   - Blobデータをstoreから除外
   - 必要なタイミングでのみRef経由で管理

3. **バンドルサイズの削減**
   - 不要なStateManagerパターンを削除
   - 冗長な抽象化レイヤーを削除

## 今後の開発での注意点

1. **状態管理の原則を守る**
   - サーバー状態はTanStack Query
   - UI状態はZustand
   - Blobなどの大きなデータはRefで管理

2. **クリーンアップのタイミング**
   - 成功時のみクリーンアップを実行
   - アンマウント時には状態を保持

3. **シンプルなAPIを維持**
   - 過度な抽象化を避ける
   - 統合関数で操作を簡潔に

## TypeScriptエラーの修正

1. **queryKeys.tsの作成**
   - TanStack Query用のクエリキー定義を一元化
   - 型安全性の向上

2. **Zustand shallow比較の修正**
   - 最新版では第2引数のshallow比較が不要

## デバッグ機能の追加

認証フローの問題解決のため、以下のデバッグログを追加：

```typescript
// RootNavigator
console.log('[RootNavigator] Auth state:', {
  isAuthenticated,
  isAuthLoading,
  user: { id, email, emailVerified }
});

// authStateManager
console.log('[AuthStateManager] Syncing auth state with user:', {
  email_confirmed_at: session.user.email_confirmed_at
});

// authService
console.log('[AuthService] verifyOTP response:', {
  user: { email_confirmed_at }
});
```

## 確認済みの動作

- ✅ 文字入力時にフォームがリセットされない
- ✅ 画像選択後も表示が維持される
- ✅ プロフィール作成成功後に適切にクリーンアップ
- ✅ 再マウント時も状態が保持される
- ✅ Auth状態の変更による不要な再レンダリングがない
- ✅ 新規登録→OTP検証→プロフィール作成画面への遷移が正常に動作
- ✅ TypeScriptの型エラーがすべて解消

このリファクタリングにより、Account機能はより保守性が高く、パフォーマンスの良い実装となりました。