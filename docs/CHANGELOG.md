# SoundZone - 変更履歴

## [1.0.0] - 2024-12-XX

### 🎉 プロジェクト初期化
- Expo SDK 53.0.15でプロジェクト作成
- React Native 0.79.4
- TypeScript 5.8.3の設定

### 📁 プロジェクト構造
- Feature-basedアーキテクチャの採用
- `src/features/`配下に機能別ディレクトリ作成
  - `auth/` - 認証機能
  - `home/` - ホーム（地図）画面
  - `recording/` - 音声録音機能
  - `layers/` - レイヤー管理
  - `mypin/` - 個人ピン管理
  - `account/` - アカウント管理
- `src/shared/`に共通機能配置
- `src/navigation/`にナビゲーション設定

### 🔧 依存関係の追加
```json
{
  "@supabase/supabase-js": "^2.50.2",
  "@react-native-async-storage/async-storage": "2.1.2",
  "@react-navigation/native": "^7.1.6",
  "@react-navigation/bottom-tabs": "^7.3.10",
  "@react-navigation/stack": "^7.4.2",
  "react-native-dotenv": "^3.4.11"
}
```

### 🔐 認証システム実装
- **AuthContext**の実装
  - Supabase認証の統合
  - セッション状態管理
  - AsyncStorageによる永続化
- **AuthNavigator**の作成
  - ログイン画面
  - サインアップ画面
- **RootNavigator**での認証フロー制御

### 🗂️ 環境設定
- **babel.config.js**の作成
  - react-native-dotenvの設定
- **env.config.ts**の実装
  - 環境変数の型安全な管理
- **.env**ファイル設定
  - Supabase接続情報の管理

### 🎨 ナビゲーション実装
- **AppNavigator**の作成
  - Bottom Tab Navigatorを使用
  - 5つのタブ（MyPin、レイヤー、ホーム、録音、アカウント）
  - Ioniconsアイコンの統合
  - ダークテーマのタブバーデザイン

### 📱 基本画面の実装
- **HomeScreen** - 地図表示の準備
- **RecordingScreen** - 録音機能の準備
- **LayersScreen** - レイヤー管理の準備
- **MyPinScreen** - 個人ピン管理の準備
- **AccountScreen** - ログアウト機能付き

### 🔄 アーキテクチャ変更
- Expo RouterからReact Navigationへの移行
- `app/`ディレクトリの削除
- `App.tsx`をプロジェクトルートに配置
- `package.json`のエントリーポイント変更

### 🐛 修正・改善
- TypeScriptリンターエラーの解決
- importパスの最適化
- コードの可読性向上（AppNavigatorのリファクタリング）
- "SoundMap" → "SoundZone"への名称統一

### 🎯 次期実装予定
- [ ] 地図表示機能（Google Maps / MapBox）
- [ ] 音声録音・再生機能
- [ ] 位置情報取得
- [ ] Supabaseデータベース設計
- [ ] レイヤー機能の詳細実装
- [ ] MyPin機能の実装

---

## 技術スタック

### フロントエンド
- **React Native**: 0.79.4
- **Expo SDK**: 53.0.15
- **TypeScript**: 5.8.3
- **React Navigation**: v7

### バックエンド
- **Supabase**: 2.50.2
  - Authentication
  - Database（PostgreSQL）
  - Real-time subscriptions

### 開発ツール
- **Metro Bundler**
- **ESLint**
- **Expo CLI**

### 状態管理
- **React Context API**
- **AsyncStorage**（永続化）

---

## アプリ概要

**SoundZone**は位置情報と音声を活用したSNSアプリです。

### 主要機能
1. **音声投稿** - 位置情報付きで音声を投稿
2. **地図表示** - 周辺の音声投稿を地図上で確認
3. **レイヤー機能** - 投稿内容をカテゴリ別に分類
4. **MyPin機能** - 個人の投稿管理
5. **認証システム** - セキュアなユーザー管理 