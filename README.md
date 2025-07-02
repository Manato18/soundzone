# 🎵 SoundZone

**位置情報と音声を活用したSNSアプリ**

SoundZoneは、特定の場所に音声メッセージを投稿し、その位置を訪れた人が音声を聞くことができる革新的なSNSアプリです。

## ✨ 主要機能

### 🎤 音声投稿
- 現在地または指定した位置に音声メッセージを投稿
- テキストと組み合わせた豊富な表現

### 🗺️ 地図表示  
- 周辺の音声投稿を地図上でリアルタイム表示
- 距離に応じた投稿の自動表示・非表示

### 🏷️ レイヤー機能
- 投稿をカテゴリ別に分類
- ユーザーの興味に応じたフィルタリング

### 📍 MyPin機能
- 個人の音声投稿を一元管理
- お気に入りの場所の記録

### 🔐 セキュアな認証
- Supabase認証による安全なアカウント管理
- プライバシー保護

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- iOS/Android端末またはシミュレーター
- Expo Goアプリ（最も簡単な開発方法）

### インストールと起動

```bash
# プロジェクトのクローン
git clone <repository-url>
cd soundzone

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルにSupabase設定を追加

# 開発サーバーの起動
npx expo start
```

### Expo Goでの実行
1. App StoreまたはGoogle PlayからExpo Goをダウンロード
2. 表示されるQRコードをカメラで読み込み
3. アプリが自動的に起動

## 🏗️ 技術スタック

### フロントエンド
- **React Native** 0.79.4
- **Expo SDK** 53.0.15
- **TypeScript** 5.8.3
- **React Navigation** v7

### バックエンド
- **Supabase** 2.50.2
  - Authentication
  - PostgreSQL Database
  - Real-time subscriptions

### 開発ツール
- **Metro Bundler**
- **ESLint**
- **Expo Developer Tools**

## 📁 プロジェクト構造

```
soundzone/
├── src/
│   ├── features/          # 機能別ディレクトリ
│   │   ├── auth/          # 認証機能
│   │   ├── home/          # ホーム（地図）画面
│   │   ├── recording/     # 音声録音機能
│   │   ├── layers/        # レイヤー管理
│   │   ├── mypin/         # MyPin機能
│   │   └── account/       # アカウント管理
│   ├── shared/            # 共通機能
│   │   ├── components/    # 共通コンポーネント
│   │   ├── services/      # API・サービス
│   │   ├── types/         # 型定義
│   │   └── utils/         # ユーティリティ
│   └── navigation/        # ナビゲーション設定
├── docs/                  # プロジェクトドキュメント
├── assets/                # 画像・フォントなどのアセット
└── components/            # Expoテンプレートコンポーネント
```

## 🔧 開発

### 基本的な開発フロー

```bash
# 開発サーバー起動
npm start

# iOS シミュレーターで起動
npm run ios

# Android エミュレーターで起動  
npm run android

# Webブラウザで起動
npm run web
```

### コード品質

```bash
# リンターチェック
npm run lint

# 型チェック
npx tsc --noEmit
```

## 📚 ドキュメント

- [**CHANGELOG.md**](./CHANGELOG.md) - 変更履歴
- [**TIPS.md**](./TIPS.md) - 開発Tips・トラブルシューティング

## 🎯 ロードマップ

### v1.0.0（現在）
- ✅ 基本的なプロジェクト構造
- ✅ 認証システム
- ✅ ナビゲーション設定
- ✅ 基本画面の実装

### v1.1.0（次期）
- [ ] 地図表示機能（Google Maps/MapBox）
- [ ] 位置情報取得機能
- [ ] 基本的な音声録音・再生

### v1.2.0（将来）
- [ ] 音声投稿・取得機能
- [ ] レイヤー機能の詳細実装
- [ ] リアルタイム通知

### v2.0.0（長期）
- [ ] ソーシャル機能（フォロー・いいね）
- [ ] 高度な音声エフェクト
- [ ] AR機能の統合

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 📞 サポート

### 開発者向けリソース
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Documentation](https://supabase.com/docs)

### トラブルシューティング
詳細な解決方法は [TIPS.md](./TIPS.md) を参照してください。

### 問い合わせ
- Issues: [GitHub Issues](https://github.com/your-username/soundzone/issues)
- Email: your-email@example.com

---

<div align="center">

**🎵 音で繋がる、新しいSNS体験 🎵**

Made with ❤️ using React Native & Expo

</div> 