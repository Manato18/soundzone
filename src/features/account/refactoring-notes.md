# Account機能リファクタリング - 注意点

## これまでのエラーと対策

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

## 新実装のポイント

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
// ❌ 旧: 多数の個別関数
setDisplayName(), setBio(), setAvatarLocalData()

// ✅ 新: 統合関数
updateForm({ displayName, bio, avatarUri })
```

### 4. クリーンアップの適切な実行タイミング
```typescript
// ✅ プロフィール作成成功時のみ
if (result.success) {
  cleanup();
}
```

## 移行時の注意点

1. **既存のコンポーネントを一度に変更しない**
   - v2ファイルとして新規作成
   - 動作確認後に既存ファイルを置き換え

2. **importパスの更新を忘れない**
   - account-store → account-store-v2
   - use-account → use-account-v2

3. **テスト項目**
   - [ ] 文字入力時にフォームがリセットされない
   - [ ] 画像選択後も表示が維持される
   - [ ] プロフィール作成成功後に適切にクリーンアップ
   - [ ] 再マウント時も状態が保持される