# SoundZone - 開発Tips

## 🚀 アプリ起動方法

### 現在の推奨方法（QRコード）

```bash
cd soundzone
npx expo start --clear
```

1. **Expo Go**をApp Storeからダウンロード
2. ターミナルに表示されるQRコードをカメラで読み込み
3. Expo Goで自動的にアプリが起動

### USB接続による起動（将来的な本格開発）

```bash
# iOS Development Build
npx expo run:ios

# 特定デバイス指定
npx expo run:ios --device "iPhone の名前"

# Android Development Build  
npx expo run:android
```

---

## 🔧 環境設定

### 必須ファイル: `.env`

プロジェクトルートに作成：
```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase設定の確認

```typescript
// env.config.tsで環境変数が正しく読み込まれているか確認
console.log('SUPABASE_URL:', ENV_CONFIG.SUPABASE_URL);
```

---

## 🐛 トラブルシューティング

### よくある問題と解決法

#### 1. 「モジュールが見つかりません」エラー

```bash
# キャッシュクリア
npx expo start --clear

# node_modules再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScriptリンターエラー

**VSCode:**
- `Cmd + Shift + P`
- `TypeScript: Restart TS Server`を実行

#### 3. 環境変数が認識されない

```bash
# babel.config.jsの設定確認
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
    ],
  };
};
```

#### 4. Metro bundlerのエラー

```bash
# Metro cache削除
npx expo start --clear

# Watchmanのリセット（macOS）
watchman watch-del-all
```

#### 5. iOS Simulatorが起動しない

```bash
# Xcode Command Line Toolsのインストール
xcode-select --install

# Simulatorの手動起動
open -a Simulator
```

#### 6. 実機での"No script URL provided"エラー

実機でアプリを起動した際に、白い画面や"No script URL provided"エラーが表示される場合：

**原因:**
- Metro開発サーバーとの接続が確立できていない
- Development Clientの設定が不完全

**解決手順:**

1. **必要なパッケージのインストール**
```bash
npm install expo-dev-client
npx expo prebuild --clean
```

2. **app.jsonの設定確認**
```json
{
  "expo": {
    "developmentClient": {
      "silentLaunch": false
    },
    "scheme": "soundzone"
  }
}
```

3. **接続方法の選択**
- **USB接続の場合:**
  ```bash
  npx expo run:ios --device
  npx expo start --dev-client
  ```
- **Wi-Fi接続の場合:**
  ```bash
  npx expo start --dev-client --tunnel
  ```

4. **手動URL入力による接続**
- デバイスを振って開発メニューを表示
- 「Change Bundle Location」を選択
- 以下のいずれかを入力：
  - USB接続: `http://localhost:8081`
  - Wi-Fi接続: `http://[MacのIPアドレス]:8081`

**注意点:**
- iPhoneとMacが同じWi-Fiネットワークに接続されていることを確認
- ファイアウォールがポート8081をブロックしていないか確認
- USBケーブルでの接続を推奨（より安定した開発環境）

---

## 📱 デバイス開発の比較

### QRコード方式（Expo Go）

**✅ メリット:**
- 簡単・高速
- アプリストアからダウンロードするだけ
- ワンタッチで接続

**❌ デメリット:**
- Expo SDKの制限あり
- カスタムネイティブモジュール使用不可

### USB接続（Development Build）

**✅ メリット:**
- フル機能のReact Native
- カスタムネイティブコード可能
- 高速デバッグ
- 本番環境に近い

**❌ デメリット:**
- 初回セットアップに時間
- Xcodeが必要（iOS）

---

## 🔄 開発ワークフロー

### 日常的な開発

```bash
# 1. 開発サーバー起動
cd soundzone
npx expo start

# 2. コード変更後は自動リロード

# 3. キャッシュクリアが必要な場合
npx expo start --clear
```

### Git管理

```bash
# .envファイルは除外（機密情報のため）
echo ".env" >> .gitignore

# 一般的な無視パターン
node_modules/
.expo/
.env
```

---

## 🎯 パフォーマンス最適化

### Metro bundlerの最適化

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// アセットの最適化
config.assetExts.push('db');

module.exports = config;
```

### メモリ使用量の監視

```bash
# React Developer Toolsの使用
npm install -g react-devtools

# Flipperの使用（高度なデバッグ）
```

---

## 📚 コード品質

### ESLintの設定

```bash
# リントチェック
npx expo lint

# 自動修正
npx expo lint --fix
```

### TypeScript型チェック

```bash
# 型チェック
npx tsc --noEmit

# 継続的な型チェック
npx tsc --noEmit --watch
```

---

## 🔐 セキュリティ

### 環境変数の管理

```typescript
// 本番環境での環境変数チェック
if (__DEV__) {
  if (!ENV_CONFIG.SUPABASE_URL) {
    console.warn('⚠️ Supabase環境変数が設定されていません');
  }
}
```

### APIキーの保護

- `.env`ファイルをGitで管理しない
- 本番環境では環境変数を使用
- Supabase Row Level Security（RLS）の有効化

---

## 🧪 テスト

### 基本的なテスト環境

```bash
# Jestのセットアップ
npm install --save-dev jest @types/jest

# テスト実行
npm test
```

### 実機テスト

```bash
# TestFlightでのベータ配布（iOS）
npx expo build:ios

# Google Play Consoleでの内部テスト（Android）
npx expo build:android
```

---

## 📈 デバッグツール

### React Developer Tools

```bash
# インストール
npm install -g react-devtools

# 起動
react-devtools
```

### ネットワークデバッグ

```javascript
// Fetch APIの監視
import { NetworkingModule } from 'react-native';

// リクエスト/レスポンスの監視
```

### 認証デバッグ

```typescript
// AuthContextでのデバッグログ
useEffect(() => {
  console.log('Session state:', session);
  console.log('Loading state:', isLoading);
}, [session, isLoading]);
```

---

## 🎨 UI/UXのTips

### テーマ管理

```typescript
// components/ThemedText.tsx, ThemedView.tsxの活用
import { ThemedText } from '@/components/ThemedText';

// 一貫したデザインシステム
```

### アイコン管理

```typescript
// @expo/vector-iconsの効率的な使用
import { Ionicons } from '@expo/vector-icons';

// 型安全なアイコン指定
const iconName: keyof typeof Ionicons.glyphMap = 'home';
```

---

## ⚡ パフォーマンス監視

### メトリクス測定

```bash
# Expo Developer Toolsの使用
# Performance監視
# Bundle Size分析
```

### 最適化チェックリスト

- [ ] 画像圧縮
- [ ] 不要なライブラリの削除  
- [ ] Code Splitting
- [ ] メモ化の適用
- [ ] アニメーションの最適化

---

## 🚨 緊急時の対処法

### アプリがクラッシュする場合

```bash
# 1. ログの確認
npx expo start --clear
# コンソールエラーを確認

# 2. 依存関係の修復
npm install

# 3. キャッシュの完全クリア
rm -rf node_modules .expo
npm install
```

### Supabase接続エラー

```typescript
// 接続テスト
const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase connection:', { data, error });
  } catch (err) {
    console.error('Connection failed:', err);
  }
};
```

---

## 📞 サポートリソース

- **Expo Documentation**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **Supabase Documentation**: https://supabase.com/docs
- **React Native Debugger**: GitHub - jhen0409/react-native-debugger 