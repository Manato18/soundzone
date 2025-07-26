# Dependencies 依存関係

**なぜ必要か**・**何を書くか**・**どのように書くか**
- **なぜ必要か**：プロジェクトで使用する全ての依存関係を体系的に管理し、バージョン管理・トラブルシューティング・メンテナンス時の参考とするため
- **何を書くか**：主要依存関係の役割、バージョン、設定、外部サービス連携の詳細
- **どのように書くか**：カテゴリ別に整理し、用途・設定・注意点を明記


## 1. フレームワーク・プラットフォーム

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React** | `19.0.0` | UIライブラリのコア | React 19の新機能を活用 |
| **React Native** | `0.79.5` | クロスプラットフォーム開発 | 新アーキテクチャ対応 |
| **Expo** | `53.0.20` | 開発・ビルドプラットフォーム | Dev Client モードで使用 |
| **TypeScript** | `~5.8.3` | 型安全性・開発効率 | 厳格な型チェック設定 |

## 2. 状態管理

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **TanStack Query** | `^5.83.0` | サーバー状態管理・キャッシング | staleTime: 5分、リトライ制御実装済み |
| **Zustand** | `^5.0.6` | UIクライアント状態管理 | devtools + persist + immer で構成 |
| **Immer** | `^10.1.1` | イミュータブル状態更新 | Zustand との組み合わせで使用 |
| **Async Storage** | `2.1.2` | 永続ストレージ | 必要に応じて使用 |

**状態管理アーキテクチャ**
```
TanStack Query (サーバー状態) + Zustand (UI状態) + MMKV (永続化)
```

## 3. ストレージ・永続化

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React Native MMKV** | `^3.3.0` | 高速永続ストレージ | EncryptionKeyManager で動的暗号化キー管理、Zustand persist で使用 |
| **Async Storage** | `2.1.2` | レガシーストレージ（互換性） | 必要に応じて使用 |

## 4. セキュリティ・暗号化

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **Expo Secure Store** | `~14.2.3` | セキュア鍵値ストレージ | iOS Keychain、Android Keystore統合、暗号化キー管理 |
| **Expo Crypto** | `~14.1.5` | 暗号化ユーティリティ | ランダムバイト生成、SHA256ハッシュ、フォールバック実装 |

**セキュリティアーキテクチャ**
```
EncryptionKeyManager (キー生成・管理) → Expo Secure Store (キー保存) → MMKV (暗号化ストレージ) → Zustand (永続化)
```

**実装詳細**
- **キー生成**: 初回起動時に32バイトのランダムキーを自動生成
- **キー保存**: `WHEN_UNLOCKED_THIS_DEVICE_ONLY`でキーチェーン保存
- **フォールバック**: セキュアストレージ利用不可時のデバイス固有キー生成
- **キーローテーション**: 暗号化キーの手動更新機能
- **メモリキャッシュ**: パフォーマンス向上のための一時キャッシュ

## 5. 認証・データベース

| **パッケージ名** | **バージョン** | **役割・用途** | **外部サービス仕様** |
|---|---|---|---|
| **Supabase JS** | `^2.50.2` | 認証・データベース・リアルタイム | API Key認証、環境変数管理 |

**Supabase 設定**
- **URL**: `ENV_CONFIG.SUPABASE_URL`
- **匿名キー**: `ENV_CONFIG.SUPABASE_ANON_KEY`
- **機能**: 認証、セッション管理、リアルタイムデータ同期

## 6. ナビゲーション

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React Navigation Native** | `^7.1.6` | ナビゲーションコア | React Navigation v7 |
| **React Navigation Stack** | `^7.4.2` | スタックナビゲーション | 認証フロー用 |
| **React Navigation Bottom Tabs** | `^7.3.10` | タブナビゲーション | メイン画面用 |
| **React Navigation Elements** | `^2.3.8` | UI要素・ヘルパー | 共通コンポーネント |

## 7. マップ・位置情報

| **パッケージ名** | **バージョン** | **役割・用途** | **外部API仕様** |
|---|---|---|---|
| **React Native Maps** | `1.20.1` | マップ表示・操作 | iOS: Apple Maps、Android: Google Maps |
| **Expo Location** | `~18.1.6` | 位置情報取得・監視 | 権限管理、精度設定 |

**外部API連携**
- **Google Maps API**: Android用、API Key設定済み（app.json内）
- **Apple Maps**: iOS用、追加設定不要

## 8. メディア・オーディオ

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React Native Track Player** | `^4.1.1` | オーディオ再生・制御 | バックグラウンド再生対応、ネイティブ設定必要 |
| **Expo Audio** | `^0.4.8` | 音声録音・再生 | マイク権限設定済み、録音機能対応 |
| **Expo File System** | `^18.1.11` | ファイルシステムアクセス | 音声ファイル保存・読み込み |

## 9. UI・アニメーション

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React Native Reanimated** | `~3.17.4` | 高性能アニメーション | 新アーキテクチャ対応、ネイティブランナー |
| **React Native Gesture Handler** | `~2.24.0` | ジェスチャ認識 | Reanimated との組み合わせ |
| **Expo Blur** | `~14.1.5` | ブラー効果 | iOS/Android 対応 |
| **Expo Haptics** | `~14.1.4` | ハプティックフィードバック | デバイス振動制御 |
| **React Native SVG** | `^15.11.0` | SVG描画ライブラリ | ベクター図形描画、地図上の方向表示で使用 |

## 10. Expo モジュール

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **Expo Router** | `~5.1.2` | ファイルベースルーティング | インストール済みだが未使用、React Navigation を採用 |
| **Expo Constants** | `~17.1.6` | アプリ定数・デバイス情報 | 環境変数アクセス |
| **Expo Status Bar** | `~2.2.3` | ステータスバー制御 | テーマ連動 |
| **Expo System UI** | `~5.0.9` | システムUI制御 | ナビゲーションバー制御 |
| **Expo Font** | `~13.3.2` | カスタムフォント | SpaceMono-Regular 使用 |
| **Expo Image** | `~2.4.0` | 最適化画像表示 | パフォーマンス向上 |
| **Expo Asset** | `~11.1.6` | アセット管理 | 画像・音声ファイル |
| **Expo Symbols** | `~0.4.5` | SF Symbols 対応 | iOS ネイティブアイコン |
| **Expo Web Browser** | `~14.2.0` | アプリ内ブラウザ | 外部リンク表示 |
| **Expo Linking** | `~7.1.6` | ディープリンク・URL処理 | 外部アプリ起動 |
| **Expo Splash Screen** | `~0.30.9` | スプラッシュスクリーン | 起動画面制御 |
| **Expo Dev Client** | `^5.2.2` | 開発クライアント | カスタムネイティブコード対応 |
| **Expo Secure Store** | `~14.2.3` | セキュアストレージ | EncryptionKeyManagerで暗号化キー管理 |
| **Expo Crypto** | `~14.1.5` | 暗号化・ハッシュ化 | キー生成・フォールバック処理 |
| **Expo Image Picker** | `~16.1.4` | 画像選択・カメラ撮影 | プロフィール画像選択・撮影機能、権限設定済み |

## 11. その他・ユーティリティ

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **React Native Community NetInfo** | `^11.4.1` | ネットワーク状態監視・管理 | NetworkServiceクラスで使用、接続状態変更監視、オフライン対応 |
| **React Native WebView** | `13.13.5` | Webコンテンツ表示 | セキュリティ設定重要 |
| **React Native Dotenv** | `^3.4.11` | 環境変数管理 | .env ファイル読み込み |
| **React Native Safe Area Context** | `5.4.0` | セーフエリア対応 | ノッチ・ホームインジケータ考慮 |
| **React Native Screens** | `~4.11.1` | ネイティブスクリーン最適化 | メモリ使用量削減 |
| **Expo Vector Icons** | `^14.1.0` | アイコンライブラリ | 複数アイコンセット対応 |
| **UUID** | `^11.1.0` | 一意識別子生成 | オーディオピン識別用 |
| **Base64 ArrayBuffer** | `^1.0.2` | Base64エンコード・デコード | バイナリデータ変換 |
| **React DOM** | `19.0.0` | Web向けReactレンダリング | Web対応のため |
| **React Native Web** | `~0.20.0` | Web向けReact Native | Web対応のため |

## 12. 開発ツール

| **パッケージ名** | **バージョン** | **役割・用途** | **設定・注意点** |
|---|---|---|---|
| **ESLint** | `^9.25.0` | コード品質・スタイル | Expo Config 使用 |
| **ESLint Config Expo** | `~9.2.0` | Expo専用ESLint設定 | Expo推奨ルール |
| **Babel Core** | `^7.25.2` | JavaScript トランスパイラ | React Native 設定 |
| **TypeScript Types** | `~19.0.10` | React の型定義 | 開発時の型安全性 |
| **UUID Types** | `^10.0.0` | UUID の型定義 | TypeScript サポート |

## 13. アプリ設定（app.json）

**主要設定**
- **新アーキテクチャ**: 有効化（newArchEnabled: true）
- **開発クライアント**: サイレント起動無効
- **音声機能**: バックグラウンド音声再生対応
- **権限**: マイク録音権限設定済み

**iOS 設定**
- **Bundle ID**: com.anonymous.soundzone
- **UIBackgroundModes**: audio（バックグラウンド音声）
- **マイク権限**: 日本語説明文設定（NSMicrophoneUsageDescription）
- **カメラ権限**: プロフィール画像撮影用（NSCameraUsageDescription）
- **フォトライブラリ権限**: プロフィール画像選択用（NSPhotoLibraryUsageDescription）

**Android 設定**
- **Package**: com.anonymous.soundzone
- **Google Maps API**: 設定済み
- **Edge to Edge**: 有効化
- **権限**: RECORD_AUDIO, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, CAMERA, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE

## 14. 環境変数要件

```env
# Supabase
SUPABASE_URL=<Supabase プロジェクト URL>
SUPABASE_ANON_KEY=<Supabase 匿名認証キー>

# Google Maps (Android) - app.json に直接設定済み
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<Google Maps API キー>
```

**設定ファイル**: `.env` （プロジェクトルートに配置済み）

## 15. バージョン管理ポリシー

- **React Native**: 0.79.5 (新アーキテクチャ対応)
- **Expo SDK**: 53.0.20 (最新安定版)
- **Node.js**: 18.x 以上推奨
- **セマンティックバージョニング**: メジャーアップデートは慎重に検討

## 16. 実行環境

**ビルド・実行コマンド**
```bash
# iOSデバイス向けビルド・実行
npx expo run:ios --device

# Androidデバイス向けビルド・実行  
npx expo run:android --device

# 開発サーバー起動
npx expo start
```

**前提条件**
- Xcode (iOS開発)
- Android Studio (Android開発)
- CocoaPods (iOS依存関係管理)
- 実機または適切なシミュレータ

## 17. トラブルシューティング

**主要な依存関係の問題**
- **MMKV**: 新アーキテクチャ必須、EncryptionKeyManagerでの動的キー管理確認
- **Expo Secure Store**: iOS Keychain、Android Keystoreへの適切なアクセス権限確認
- **Expo Crypto**: ランダムバイト生成、フォールバック処理の動作確認
- **Expo Audio**: マイク権限設定、録音権限確認
- **Expo Image Picker**: カメラ・フォトライブラリ権限設定、プラグイン設定確認
- **Track Player**: ネイティブ設定、Audio Session 設定
- **Maps**: API キー設定、権限設定
- **Reanimated**: Babel 設定、ネイティブランナー

**セキュリティ関連の注意点**
- **暗号化キー**: EncryptionKeyManagerでの自動生成・ローテーション機能
- **キーチェーン**: iOS/Androidでの適切なキーチェーンアクセス設定
- **フォールバック**: セキュアストレージ利用不可時の代替キー生成
- **メモリキャッシュ**: 暗号化キーの一時キャッシュとクリア機能

**クリーンビルド手順**
```bash
# 依存関係をクリーンインストール
rm -rf node_modules package-lock.json
npm install
npx expo install --fix

# iOSの場合、Podsもクリーン
cd ios && rm -rf Pods Podfile.lock && cd ..
```

**更新時の注意点**
- React Native バージョンアップ時は段階的に実施
- Expo SDK 更新前に Breaking Changes 確認
- ネイティブ依存関係は iOS/Android 両方でテスト
- 音声機能は実機でのテストが必須
- 画像機能（カメラ・ギャラリー）は実機でのテストが必須
- セキュリティライブラリ更新時は暗号化キーの互換性確認

---