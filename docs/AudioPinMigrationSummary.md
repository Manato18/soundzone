# audioPin機能の状態管理移行まとめ

**実施日: 2025-07-24**

## 概要

audioPin機能をReact標準のuseStateからZustand + TanStack Queryベースの状態管理に移行しました。この移行により、グローバル状態管理、サーバー状態の効率的な管理、設定の永続化が実現されました。

## 実装内容

### 1. ディレクトリ構造の整備

```
src/features/audioPin/
├── application/           # 新規作成
│   └── audioPin-store.ts  # Zustandストア
├── infrastructure/        # 新規作成
│   └── audioPin-service.ts # APIサービス層
├── presentation/
│   ├── hooks/
│   │   ├── read/         # 新規作成
│   │   │   ├── useAudioPinsQuery.ts
│   │   │   └── useAudioPinQuery.ts
│   │   ├── write/        # 新規作成
│   │   │   ├── useCreateAudioPinMutation.ts
│   │   │   ├── useUpdateAudioPinMutation.ts
│   │   │   └── useDeleteAudioPinMutation.ts
│   │   ├── useAudioPins.ts # 既存（更新）
│   │   └── useAudioPinFiltering.ts # 既存（削除予定）
│   └── components/
│       └── AudioPinMarkers.tsx # 既存
└── domain/
    └── entities/
        └── AudioPin.ts # 既存
```

### 2. audioPin-store.ts の実装

#### 2.1 状態定義

```typescript
interface AudioPinState {
  // UI状態
  selectedPin: AudioPin | null;
  isModalVisible: boolean;
  playbackState: AudioPlaybackState;
  playingPinId: string | null;
  
  // 設定（永続化対象）
  settings: {
    autoPlayOnPinTap: boolean;
    playbackSpeed: number;
    showPinDetails: boolean;
    volume: number;
  };
  
  // アクション
  selectPin: (pin: AudioPin) => void;
  clearSelectedPin: () => void;
  setModalVisible: (visible: boolean) => void;
  updatePlaybackState: (state: Partial<AudioPlaybackState>) => void;
  updateSettings: (settings: Partial<AudioPinState['settings']>) => void;
  
  // 再生管理アクション
  startPlayback: (pinId: string) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
}
```

#### 2.2 主な機能

- **UI状態管理**: 選択されたピン、モーダル表示、再生状態の管理
- **再生機能**: 音声の再生/一時停止/停止、シーク、音量調整
- **設定の永続化**: MMKVを使用した設定の保存
- **デバッグログ**: 開発環境でのアクション追跡

### 3. インフラストラクチャー層の実装

#### 3.1 audioPin-service.ts

モックAPIとして以下の機能を実装：

- `getAudioPins()`: ピン一覧の取得（レイヤー・範囲フィルタリング対応）
- `getAudioPin()`: 単一ピンの取得
- `createAudioPin()`: ピンの作成
- `updateAudioPin()`: ピンの更新
- `deleteAudioPin()`: ピンの削除

将来的なSupabase連携を想定した設計で、現在はハードコードされたデータを返します。

### 4. TanStack Queryフックの実装

#### 4.1 読み取り操作（read/）

- **useAudioPinsQuery**: 
  - ピン一覧の取得
  - レイヤーIDによるフィルタリング
  - 地図の表示範囲によるフィルタリング
  - staleTime: 5分、gcTime: 15分

- **useAudioPinQuery**: 
  - 単一ピンの詳細取得
  - IDベースのキャッシュ管理

#### 4.2 書き込み操作（write/）

- **useCreateAudioPinMutation**: 
  - 新規ピンの作成
  - 成功時にピン一覧のキャッシュを無効化

- **useUpdateAudioPinMutation**: 
  - 既存ピンの更新
  - 個別キャッシュの更新と一覧の無効化

- **useDeleteAudioPinMutation**: 
  - ピンの削除
  - 削除されたピンのキャッシュクリア

### 5. 既存コンポーネントとの統合

#### 5.1 useAudioPins.ts の更新

```typescript
export const useAudioPins = (params?: UseAudioPinsParams) => {
  // ストアから状態を取得
  const selectedAudio = useSelectedPin();
  const modalVisible = useModalVisible();
  const { selectPin, clearSelectedPin } = useAudioPinActions();
  
  // サーバーからピンデータを取得
  const { 
    data: audioPins = [], 
    isLoading, 
    error 
  } = useAudioPinsQuery({
    layerIds: params?.layerIds,
  });

  // ... ハンドラー実装
};
```

#### 5.2 HomeScreen.tsx の更新

- `useAudioPinFiltering`の削除
- `useAudioPins`にレイヤーIDを直接渡すように変更
- フィルタリング処理をクエリレベルで実行

### 6. 永続化の設定

#### 6.1 StorageKeys.ts の更新

```typescript
AUDIO_PIN: {
  SETTINGS: 'audio-pin-settings',
  PLAYBACK_SPEED: 'audio-pin-playback-speed',
  AUTO_PLAY: 'audio-pin-auto-play',
},
```

#### 6.2 永続化対象

- 自動再生設定
- 再生速度
- ピン詳細表示設定
- 音量設定

### 7. 無限ループ問題の修正

#### 7.1 問題の原因

セレクターフックが毎回新しいオブジェクトを作成していたため、無限再レンダリングが発生：

```typescript
// 問題のあるコード
export const useAudioPinActions = () => useAudioPinStore((state) => ({
  selectPin: state.selectPin,
  clearSelectedPin: state.clearSelectedPin,
  // ...
}));
```

#### 7.2 解決方法

各アクションを個別に取得してから、オブジェクトとして返すように修正：

```typescript
// 修正後
export const useAudioPinActions = () => {
  const selectPin = useAudioPinStore((state) => state.selectPin);
  const clearSelectedPin = useAudioPinStore((state) => state.clearSelectedPin);
  // ...
  
  return {
    selectPin,
    clearSelectedPin,
    // ...
  };
};
```

同様の修正を`location-store.ts`にも適用しました。

### 8. TypeScript対応

- TanStack Query v5のgcTime（旧cacheTime）への対応
- mmkvStorageアダプターの型定義追加
- 型安全性の確保

## 成果

1. **グローバル状態管理**: Zustandによる効率的な状態管理
2. **サーバー状態の分離**: TanStack Queryによるキャッシュ管理
3. **永続化**: ユーザー設定の保存と復元
4. **拡張性**: 将来的なSupabase連携への準備
5. **パフォーマンス**: 無限ループの解消と最適化
6. **保守性**: Clean Architectureに準拠した構造

## 今後の課題

1. 実際の音声ファイルアップロード機能の実装
2. Supabaseとの連携
3. リアルタイム同期機能
4. オフライン対応
5. 音声再生コンポーネントとの完全な統合

## 関連ドキュメント

- [StateManagementMigrationPlan.md](./StateManagementMigrationPlan.md)
- [StateManagement.md](./StateManagement.md)
- [CHANGELOG.md](./CHANGELOG.md)