# SoundZone - 実装ギャップと今後の課題

## 📊 実装状況概要

**現在の進捗: 約25%完了**

| カテゴリ | 完了度 | 状態 | 課題レベル |
|----------|--------|------|------------|
| 🔐 認証システム | 80% | ✅ 基本機能実装済み | 🟡 中 |
| 🗺️ 地図・位置情報 | 70% | ✅ 表示・追跡完了 | 🟡 中 |
| 🎵 音声再生 | 90% | ✅ 高品質再生完了 | 🟢 低 |
| 🧭 ナビゲーション | 100% | ✅ 完全実装 | ✅ なし |
| 🎙️ 録音機能 | 0% | ❌ 未着手 | 🔴 高 |
| 📍 MyPin管理 | 0% | ❌ 未着手 | 🔴 高 |
| 🗂️ レイヤーシステム | 0% | ❌ 未着手 | 🔴 高 |
| 👤 アカウント管理 | 20% | ⚠️ 部分実装 | 🟡 中 |
| 🗃️ データベース設計 | 0% | ❌ 未着手 | 🔴 高 |

## 🚨 クリティカルな欠陥

### 1. データベーススキーマ未実装 (🔴 最重要)

**問題**: 
- Supabaseのテーブルが一切定義されていない
- 音声ピンが固定値（3個）でハードコーディング
- ユーザーデータの永続化機能なし

**影響**:
- アプリの基本機能が動作しない
- スケーラビリティが皆無
- 新しいピンの作成・保存ができない

**必要な実装**:
```sql
-- ユーザープロフィール
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 音声ピン
CREATE TABLE audio_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- 秒
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- レイヤー
CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ピン-レイヤー関連
CREATE TABLE pin_layers (
  pin_id UUID REFERENCES audio_pins(id),
  layer_id UUID REFERENCES layers(id),
  PRIMARY KEY (pin_id, layer_id)
);
```

### 2. 録音機能完全未実装 (🔴 最重要)

**現状**: `RecordingScreen.tsx`がプレースホルダーのみ

**問題**:
- ユーザーがコンテンツを作成できない
- アプリの根本的な価値提案が機能しない

**必要な実装**:
```typescript
// 必要なパッケージ
expo-av // 音声録音
expo-file-system // ファイル管理
react-native-fs // ファイルシステムアクセス

// 実装が必要な機能
interface RecordingFeatures {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>; // ファイルパス返却
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  playbackRecording(uri: string): Promise<void>;
  uploadRecording(uri: string): Promise<string>; // アップロード後のURL
}

// 権限管理
interface Permissions {
  requestMicrophonePermission(): Promise<boolean>;
  checkMicrophonePermission(): Promise<boolean>;
}
```

### 3. ピン作成フロー未実装 (🔴 最重要)

**問題**:
- 録音からピン投稿までの流れが存在しない
- ユーザーがコンテンツを地図に投稿できない

**必要な実装**:
```typescript
// ピン作成フロー
interface PinCreationFlow {
  // 1. 録音完了後
  onRecordingComplete(audioUri: string): void;
  
  // 2. メタデータ入力
  setPinMetadata(title: string, description?: string): void;
  
  // 3. 位置選択
  selectLocation(lat: number, lng: number): void;
  
  // 4. プライバシー設定
  setPrivacy(isPublic: boolean): void;
  
  // 5. レイヤー選択
  selectLayers(layerIds: string[]): void;
  
  // 6. アップロード・保存
  createPin(): Promise<AudioPin>;
}
```

## ⚠️ 重要な機能ギャップ

### 4. MyPin管理システム (🔴 高)

**現状**: プレースホルダー画面のみ

**必要な機能**:
- ユーザーが作成したピンの一覧表示
- ピンの編集・削除機能
- ピンの統計情報（再生回数、いいね数）
- ピンの公開/非公開切り替え

**実装例**:
```typescript
interface MyPinManagement {
  getUserPins(userId: string): Promise<AudioPin[]>;
  updatePin(pinId: string, updates: Partial<AudioPin>): Promise<void>;
  deletePin(pinId: string): Promise<void>;
  togglePinVisibility(pinId: string): Promise<void>;
  getPinStatistics(pinId: string): Promise<PinStats>;
}
```

### 5. レイヤーシステム (🔴 高)

**現状**: プレースホルダー画面のみ

**コンセプト**: 
テーマ別にピンをグループ化（例: 観光地、レストラン、歴史的な場所）

**必要な機能**:
```typescript
interface LayerSystem {
  createLayer(name: string, description: string): Promise<Layer>;
  getUserLayers(userId: string): Promise<Layer[]>;
  getPublicLayers(): Promise<Layer[]>;
  addPinToLayer(pinId: string, layerId: string): Promise<void>;
  filterPinsByLayer(layerIds: string[]): Promise<AudioPin[]>;
  shareLayer(layerId: string, userIds: string[]): Promise<void>;
}
```

### 6. アカウント管理の拡充 (🟡 中)

**現状**: サインアウト機能のみ

**不足機能**:
- プロフィール画像のアップロード
- ユーザー名・表示名の編集
- アカウント設定（通知、プライバシー）
- パスワード変更
- アカウント削除

## 🔧 技術的な課題

### 7. エラーハンドリングの不備 (🟡 中)

**現在の問題**:
```typescript
// 現在のエラーハンドリング例
try {
  await signIn(email, password);
} catch (error) {
  console.error(error); // コンソールに出力するのみ
}
```

**改善が必要**:
```typescript
// より良いエラーハンドリング
interface ErrorHandling {
  // ネットワークエラー
  handleNetworkError(error: NetworkError): void;
  
  // 認証エラー
  handleAuthError(error: AuthError): void;
  
  // ファイルアップロードエラー
  handleUploadError(error: UploadError): void;
  
  // 権限エラー
  handlePermissionError(permission: string): void;
  
  // ユーザーフレンドリーなエラー表示
  showErrorToUser(message: string, actionable?: boolean): void;
}
```

### 8. オフライン対応未実装 (🟡 中)

**問題**:
- ネットワークなしでは何も動作しない
- 位置情報の取得・保存ができない
- 録音したファイルの一時保存なし

**必要な対応**:
```typescript
interface OfflineSupport {
  // ローカルデータベース
  saveToLocal(data: any): Promise<void>;
  syncWithServer(): Promise<void>;
  
  // ネットワーク状態監視
  onNetworkChange(callback: (isOnline: boolean) => void): void;
  
  // キューシステム
  queueForUpload(action: UploadAction): void;
}
```

### 9. パフォーマンス問題 (🟡 中)

**現在の問題**:
- 音声ピンが固定配列で管理
- 地図上のピン数に制限なし（スケールしない）
- 音声ファイルの事前読み込みなし

**最適化が必要**:
```typescript
interface PerformanceOptimizations {
  // 仮想化・ページネーション
  loadPinsInViewport(bounds: MapBounds): Promise<AudioPin[]>;
  
  // 音声ファイルの遅延読み込み
  preloadAudioFile(pinId: string): Promise<void>;
  
  // キャッシュ戦略
  cacheAudioFile(url: string): Promise<string>; // ローカルパス返却
  
  // メモリ管理
  cleanupAudioCache(): Promise<void>;
}
```

## 🔐 セキュリティ・権限の課題

### 10. 権限管理の不備 (🟡 中)

**現在未実装の権限**:
```typescript
// 必要な権限チェック
interface PermissionChecks {
  // マイク権限
  checkMicrophonePermission(): Promise<PermissionStatus>;
  requestMicrophonePermission(): Promise<boolean>;
  
  // 位置情報権限  
  checkLocationPermission(): Promise<PermissionStatus>;
  requestLocationPermission(): Promise<boolean>;
  
  // ファイルアクセス権限
  checkStoragePermission(): Promise<PermissionStatus>;
  requestStoragePermission(): Promise<boolean>;
  
  // プッシュ通知権限（将来）
  checkNotificationPermission(): Promise<PermissionStatus>;
  requestNotificationPermission(): Promise<boolean>;
}
```

### 11. データ検証・サニタイゼーション (🟡 中)

**現在の問題**:
- ユーザー入力の検証なし
- ファイルアップロードの検証なし
- SQLインジェクション対策なし（Supabaseが対応済みだが確認必要）

**必要な対策**:
```typescript
interface DataValidation {
  // 音声ファイル検証
  validateAudioFile(file: File): ValidationResult;
  
  // 入力値検証
  validatePinTitle(title: string): ValidationResult;
  validateCoordinates(lat: number, lng: number): ValidationResult;
  
  // サニタイゼーション
  sanitizeUserInput(input: string): string;
  
  // ファイルサイズ制限
  checkFileSizeLimit(file: File, limitMB: number): boolean;
}
```

## 📱 プラットフォーム固有の課題

### 12. iOS固有の未実装事項

**Info.plistの追加設定**:
```xml
<!-- 録音権限 -->
<key>NSMicrophoneUsageDescription</key>
<string>音声録音のためにマイクへのアクセスが必要です</string>

<!-- バックグラウンド録音 -->
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>background-processing</string>
</array>

<!-- ファイルアクセス -->
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

### 13. Android固有の未実装事項

**AndroidManifest.xmlの追加設定**:
```xml
<!-- 録音権限 -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- ファイルアクセス -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- バックグラウンド録音 -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## 🧪 テスト実装の欠如 (🟡 中)

**現状**: テストコードが一切存在しない

**必要なテスト**:
```typescript
// 単体テスト
describe('SignInUseCase', () => {
  it('should sign in user with valid credentials', async () => {
    // テスト実装
  });
});

// 統合テスト
describe('Audio Recording Flow', () => {
  it('should record and save audio file', async () => {
    // テスト実装
  });
});

// E2Eテスト
describe('Pin Creation Flow', () => {
  it('should create pin from recording to map display', async () => {
    // テスト実装
  });
});
```

## 🚀 MVP実現に向けた優先順位

### Phase 1: 基盤実装 (🔴 最重要 - 4-6週間)
1. **データベーススキーマ設計・実装**
2. **録音機能の基本実装**
3. **ピン作成フローの実装**
4. **基本的なエラーハンドリング**

### Phase 2: 中核機能 (🟡 重要 - 3-4週間)
1. **MyPin管理画面の実装**
2. **プロフィール管理の拡充**
3. **権限管理の完全実装**
4. **オフライン対応**

### Phase 3: 拡張機能 (🟢 将来 - 2-3週間)
1. **レイヤーシステムの実装**
2. **高度な音声機能**
3. **パフォーマンス最適化**
4. **テスト実装**

## 📋 具体的な実装作業リスト

### データベース実装
- [ ] Supabaseプロジェクトでテーブル作成
- [ ] Row Level Security (RLS) の設定
- [ ] ストレージバケットの作成（音声ファイル用）
- [ ] TypeScript型定義の生成

### 録音機能実装
- [ ] expo-avの導入・設定
- [ ] 録音UI（開始/停止/一時停止ボタン）の作成
- [ ] 録音時間・波形表示の実装
- [ ] ファイル保存・圧縮処理の実装
- [ ] 権限チェック・リクエストの実装

### ピン作成フロー実装
- [ ] 録音完了後の画面遷移
- [ ] メタデータ入力フォーム
- [ ] 位置選択画面（地図上でタップ）
- [ ] ファイルアップロード処理
- [ ] データベース保存処理

## 💡 技術的な推奨事項

### パッケージ追加が必要
```json
{
  "dependencies": {
    "expo-av": "latest",           // 音声録音・再生
    "expo-file-system": "latest",  // ファイル管理
    "react-native-fs": "latest",   // ファイルシステム
    "@supabase/storage-js": "latest", // ファイルストレージ
    "react-native-reanimated": "latest", // 高度なアニメーション
    "react-hook-form": "latest",   // フォーム管理
    "yup": "latest"                // バリデーション
  },
  "devDependencies": {
    "jest": "latest",              // テストフレームワーク
    "@testing-library/react-native": "latest",
    "detox": "latest"              // E2Eテスト
  }
}
```

### 開発環境の改善
```bash
# Husky設定（Pre-commit hooks）
npm install -D husky lint-staged

# TypeScript strict モード有効化
"strict": true,
"noImplicitReturns": true,
"noUnusedLocals": true

# ESLintルールの厳格化
"rules": {
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/explicit-function-return-type": "warn"
}
```

この文書は現在の実装状況を正確に反映しており、MVP実現に向けた具体的なロードマップを提供しています。優先度の高い項目から順次実装を進めることで、効率的にプロダクトを完成させることができます。