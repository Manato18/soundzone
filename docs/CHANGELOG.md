# SoundZone - 変更履歴

## 2025年1月26日 - 画像アップロード問題の修正

### 修正内容

#### 1. expo-image-picker への移行
**問題**: `react-native-image-picker` がReact Native 0.79.5のTurboModuleアーキテクチャと互換性がなく、`globalThis.__turboModuleProxy is not a function`エラーが発生

**解決策**:
- `react-native-image-picker` をアンインストール
- `expo-image-picker` v16.1.4 をインストール
- ProfileCreationScreen.tsxを書き換えて新しいAPIに対応

**変更内容**:
- 権限リクエスト処理を追加（カメラ/フォトライブラリ）
- `MediaTypeOptions.Images` → `['images']` に変更（非推奨API対応）
- `File` コンストラクタを使わず直接 `Blob` を使用（TurboModuleエラー回避）
- プレビューURLの処理を修正（URIを直接使用）

#### 2. Supabase Storage RLSポリシー問題の修正
**問題**: "new row violates row-level security policy" エラーが画像アップロード時に発生

**原因**: 
- RLSポリシーが `storage.foldername(name)[1]` でユーザーIDをチェック
- アップロードパスが `avatars/{userId}/{timestamp}.jpg` となっており、`avatars/` プレフィックスが問題

**解決策**:
- アップロードパスから `avatars/` プレフィックスを削除
- 変更前: `const filePath = 'avatars/${fileName}';`
- 変更後: 直接 `fileName` を使用（`{userId}/{timestamp}.jpg`）

### 技術的詳細

#### パッケージの変更
```json
// 削除
"react-native-image-picker": "^8.2.1"

// 追加  
"expo-image-picker": "~16.1.4"
```

#### app.jsonの権限設定追加
```json
"plugins": [
  [
    "expo-image-picker",
    {
      "photosPermission": "プロフィール画像を選択するために写真ライブラリにアクセスします。",
      "cameraPermission": "プロフィール画像を撮影するためにカメラを使用します。"
    }
  ]
]
```

### 残存問題
- 画像アップロード後、プロフィール画像のプレビューが更新されない問題が報告されている
- 画像はSupabase Storageに正常にアップロードされることを確認済み
