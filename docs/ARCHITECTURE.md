# SoundZone - アーキテクチャドキュメント

## 🏗️ アーキテクチャ概要

SoundZoneは**フィーチャーベース**の構成で設計されており、**クリーンアーキテクチャ**の原則を部分的に採用したReact Nativeアプリケーションです。

## 📐 設計原則

### 1. 関心の分離 (Separation of Concerns)
- **Feature-based**: 機能ごとにフォルダを分離
- **Layer-based**: 認証機能でドメイン層、データ層、プレゼンテーション層を分離
- **Component-based**: 再利用可能なUIコンポーネントを独立して管理

### 2. 依存性の逆転 (Dependency Inversion)
```typescript
// Domain層のRepository（抽象）
interface AuthRepository {
  signIn(email: string, password: string): Promise<User>
}

// Data層の実装（具象）
class SupabaseAuthRepository implements AuthRepository {
  // Supabase固有の実装
}
```

### 3. 単一責任の原則 (Single Responsibility)
- 各Usecase: 1つのビジネスロジックのみ実行
- 各Repository: 特定のデータソースへのアクセスのみ担当
- 各Component: 単一のUI責任のみ担当

## 🏛️ アーキテクチャレイヤー

### 認証機能のクリーンアーキテクチャ実装

```
src/features/auth/
├── domain/                    # ビジネスロジック層
│   ├── entities/             # エンティティ
│   │   └── User.ts          # ユーザードメインモデル
│   ├── repositories/        # リポジトリインターフェース
│   │   └── AuthRepository.ts # 認証リポジトリ抽象
│   ├── usecases/           # ユースケース
│   │   ├── SignInUseCase.ts
│   │   ├── SignUpUseCase.ts
│   │   ├── SignOutUseCase.ts
│   │   └── GetCurrentUserUseCase.ts
│   ├── values/             # 値オブジェクト
│   │   ├── Email.ts        # メールアドレス値オブジェクト
│   │   └── Password.ts     # パスワード値オブジェクト
│   └── errors/             # ドメインエラー
│       └── AuthError.ts    # 認証エラー定義
├── data/                   # データアクセス層
│   ├── datasources/        # データソース
│   │   └── SupabaseAuthDataSource.ts
│   └── repositories/       # リポジトリ実装
│       └── SupabaseAuthRepository.ts
└── presentation/           # プレゼンテーション層
    ├── screens/           # 画面コンポーネント
    │   ├── LoginScreen.tsx
    │   └── SignUpScreen.tsx
    ├── context/           # React Context
    │   └── AuthContext.tsx
    └── hooks/             # カスタムフック
        └── useAuth.ts
```

### その他機能の簡易構成

```
src/features/home/
└── presentation/
    └── HomeScreen.tsx     # 地図表示とピン管理

src/features/recording/
└── presentation/
    └── RecordingScreen.tsx # 録音機能（未実装）

src/features/mypin/
└── presentation/
    └── MyPinScreen.tsx    # ピン管理（未実装）
```

## 🔄 データフロー

### 認証フローの例

```typescript
// 1. UI層でアクション発生
const handleSignIn = async (email: string, password: string) => {
  
  // 2. Usecase層でビジネスロジック実行
  const signInUseCase = new SignInUseCase(authRepository);
  const result = await signInUseCase.execute(email, password);
  
  // 3. Repository層でデータアクセス
  // SupabaseAuthRepository -> SupabaseAuthDataSource -> Supabase API
  
  // 4. 結果をContext経由で全体に通知
  setUser(result.user);
};
```

### 音声再生フローの例

```typescript
// 1. 地図のピンタップ
onPinPress(pinData) 
  
// 2. TrackPlayerセットアップ
setupTrackPlayer(audioUrl)

// 3. AudioPlayerModalの表示
showAudioModal(pinData)

// 4. react-native-track-playerで再生制御
play() / pause() / seekTo()
```

## 🧩 主要コンポーネント設計

### 1. AuthContext（グローバル状態管理）

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**責任**:
- 認証状態の管理
- 認証関連操作の提供
- セッション永続化（AsyncStorage）

### 2. AudioPlayerModal（音声再生UI）

```typescript
interface AudioPlayerModalProps {
  visible: boolean;
  audioData: AudioPinData;
  onClose: () => void;
}
```

**責任**:
- 音声再生UIの表示
- 再生制御（play/pause/seek）
- スワイプ・タップジェスチャー処理
- react-native-track-playerとの連携

### 3. HomeScreen（地図・メイン画面）

```typescript
interface LocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
```

**責任**:
- 地図表示とユーザー位置追跡
- 音声ピンの表示とタップ処理
- 位置情報権限の管理
- AudioPlayerModalの制御

## 🗄️ データ管理戦略

### 現在の実装

1. **認証データ**: AsyncStorage（ローカル永続化）
2. **音声ピンデータ**: ハードコーディング（要改善）
3. **位置情報**: expo-locationからリアルタイム取得

### 将来的な設計（未実装）

```typescript
// データベース設計案
interface AudioPin {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  audio_url: string;
  title: string;
  description?: string;
  created_at: Date;
  is_public: boolean;
}

interface Recording {
  id: string;
  user_id: string;
  audio_url: string;
  duration: number;
  file_size: number;
  created_at: Date;
}
```

## 🔧 技術決定と理由

### フレームワーク選択

| 技術 | 理由 | 代替案 |
|------|------|--------|
| **React Native + Expo** | クロスプラットフォーム開発の効率化、豊富なライブラリ | Flutter, Native開発 |
| **TypeScript** | 型安全性、開発効率の向上 | JavaScript |
| **Supabase** | BaaS、認証・DB・ストレージを一括提供 | Firebase, AWS Amplify |
| **react-navigation** | React Nativeの標準ナビゲーション | React Router Native |

### アーキテクチャ選択

| パターン | 採用理由 | 適用箇所 |
|----------|----------|----------|
| **Clean Architecture** | ビジネスロジックの独立性、テスタビリティ | 認証機能 |
| **Feature-based Structure** | 機能ごとの独立性、チーム開発の効率化 | 全体構成 |
| **Context + Hooks** | Reactの標準パターン、軽量 | 状態管理 |

## 📱 プラットフォーム固有の対応

### iOS固有
```typescript
// Apple Mapsの使用
PROVIDER_DEFAULT // iOS = Apple Maps

// Info.plistの設定
NSLocationWhenInUseUsageDescription
NSMicrophoneUsageDescription
UIBackgroundModes: ['audio']
```

### Android固有
```typescript
// Google Mapsの使用  
PROVIDER_GOOGLE

// AndroidManifest.xmlの設定
RECORD_AUDIO permission
ACCESS_FINE_LOCATION permission
```

## 🔐 セキュリティ設計

### 現在の実装
- **認証**: Supabaseによる JWT トークン
- **セッション管理**: AsyncStorageによるローカル保存
- **通信**: HTTPS（Supabase提供）

### 改善が必要な点
- **ファイルアップロード検証**: 音声ファイルの形式・サイズチェック
- **コンテンツモデレーション**: 不適切な音声コンテンツの検出
- **レート制限**: API呼び出し回数の制限
- **データ暗号化**: ローカルストレージの暗号化

## 🚀 パフォーマンス戦略

### 現在の最適化
- **TrackPlayer**: バックグラウンド音声再生
- **地図表示**: プラットフォーム最適化（Apple/Google Maps）
- **アニメーション**: React Native Animatedによるネイティブ実行

### 改善計画
- **音声ファイル**: 遅延読み込み、圧縮
- **地図ピン**: 仮想化、領域ベース読み込み
- **画像**: WebP形式、サイズ最適化
- **キャッシュ戦略**: Redis、CDN活用

## 🧪 テスト戦略（計画）

### 単体テスト
```typescript
// ドメイン層のテスト例
describe('SignInUseCase', () => {
  it('should return user when valid credentials', async () => {
    // Given
    const mockRepository = new MockAuthRepository();
    const useCase = new SignInUseCase(mockRepository);
    
    // When
    const result = await useCase.execute('test@example.com', 'password');
    
    // Then
    expect(result.user).toBeDefined();
  });
});
```

### 統合テスト
- React Navigation フロー
- Supabase API 連携
- 音声再生フロー

### E2Eテスト
- ユーザー認証からピン再生までのフルフロー
- Detox または Maestro を使用予定

## 🔄 今後の拡張性

### マイクロサービス化
現在はモノリス構成だが、将来的には以下の分離を検討：
- **認証サービス**: ユーザー管理専用
- **コンテンツサービス**: 音声ピン管理
- **位置情報サービス**: 地理的データ処理

### リアルタイム機能
- **WebSocket**: リアルタイムピン更新
- **Push通知**: 近くの新しいピン通知
- **ライブ音声**: リアルタイム音声ストリーミング

## 📊 メトリクス・監視

### パフォーマンス監視（計画）
- **音声再生レイテンシ**: 再生開始までの時間
- **位置情報精度**: GPS精度の監視  
- **API応答時間**: Supabase API のレスポンス時間
- **クラッシュレート**: プラットフォーム別クラッシュ率

### ビジネスメトリクス（計画）
- **DAU/MAU**: デイリー/マンスリーアクティブユーザー
- **ピン作成率**: ユーザーあたりのピン投稿数
- **再生完了率**: 音声の最後まで聞かれる割合

## 🔧 開発ワークフロー

### Git戦略
```
main ←─ develop ←─ feature/auth-implementation
                ←─ feature/recording-system
                ←─ hotfix/audio-player-crash
```

### コード品質
- **ESLint**: コード品質チェック
- **TypeScript**: 型チェック  
- **Prettier**: コードフォーマット
- **Husky**: Pre-commit hooks（計画）

## 📚 参考アーキテクチャ

このプロジェクトは以下のアーキテクチャパターンを参考にしています：
- **Clean Architecture** by Robert C. Martin
- **Feature-Sliced Design** for frontend architecture
- **React Native best practices** by Software Mansion
- **Domain-Driven Design** principles for business logic