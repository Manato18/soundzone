# Layers機能の状態管理移行まとめ

**作成日: 2025-07-24**

## 概要

layers機能を`StateManagement.md`の規約に従い、React標準のuseStateからZustand + TanStack Queryによる状態管理に移行しました。

## 実装内容

### 1. 作成したファイル

#### 1.1 application層
- **layers-store.ts**
  - Zustandストアの実装
  - UI状態（選択レイヤー、ローディング、エラー）の管理
  - 設定（お気に入り、デフォルトレイヤー）の永続化
  - immer、persist（MMKV）、devtoolsミドルウェアの適用

#### 1.2 infrastructure層
- **layers-service.ts**
  - レイヤーデータのAPI/データアクセスサービス
  - 現在は固定データを返すが、将来的なSupabase連携を想定した設計
  - ユーザー設定の保存/取得メソッドの実装

#### 1.3 presentation層
- **use-layers-query.ts**
  - TanStack Queryフックの実装
  - レイヤー一覧取得、ユーザー設定管理のクエリ
  - カスタムレイヤーの作成/更新/削除用ミューテーション

#### 1.4 テスト
- **layers-store.test.ts**
  - Zustandストアのユニットテスト
  - レイヤー選択、お気に入り、設定管理のテスト

### 2. 更新したファイル

#### 2.1 StorageKeys.ts
- `LAYERS.SETTINGS`キーを追加

#### 2.2 useLayerSelection.ts
- 内部実装をZustandストアを使用するように変更
- 既存のインターフェースを維持（破壊的変更なし）
- TanStack Queryフックを統合

### 3. アーキテクチャの改善点

#### 3.1 レイヤー分離
```
presentation/
  ├── hooks/
  │   ├── useLayerSelection.ts    # UIとの接点
  │   └── use-layers-query.ts     # サーバー状態管理
  ├── components/                  # UIコンポーネント（変更なし）
  └── LayersScreen.tsx            # 画面（変更なし）

application/
  └── layers-store.ts             # アプリケーション状態管理

infrastructure/
  └── layers-service.ts           # API/データアクセス

domain/
  ├── entities/
  │   └── Layer.ts               # エンティティ定義（変更なし）
  └── utils/
      └── layerUtils.ts          # ユーティリティ（変更なし）
```

#### 3.2 状態管理の分離
- **Ephemeral UI state**: Zustandで管理（selectedLayerIds、isLoading、error）
- **Remote server state**: TanStack Queryで管理（availableLayers）
- **Persistent client state**: MMKVで永続化（settings、selectedLayerIds）

### 4. 主な機能

#### 4.1 レイヤー選択
- 個別レイヤーのトグル
- 全レイヤーの一括選択/解除
- 選択状態の永続化

#### 4.2 お気に入り機能
- お気に入りレイヤーの管理
- 設定の永続化

#### 4.3 デフォルト設定
- デフォルトレイヤーの設定
- 初期表示時の自動選択

### 5. 将来の拡張性

#### 5.1 Supabase連携
- layers-service.tsでAPIエンドポイントを実装するだけで対応可能
- TanStack Queryのキャッシュ戦略は既に実装済み

#### 5.2 カスタムレイヤー
- 作成/更新/削除のミューテーションフックは実装済み
- UIの追加のみで機能拡張可能

#### 5.3 リアルタイム同期
- Supabase Realtimeとの連携準備完了
- queryClient.invalidateQueriesで更新通知可能

### 6. パフォーマンス最適化

- shallow比較によるセレクター最適化
- メモ化によるレンダリング最小化
- 永続化データの部分保存（partialize）

### 7. 破壊的変更

なし。既存のコンポーネントはそのまま動作します。

### 8. 次のステップ

1. 実機での動作確認
2. Supabase APIとの連携実装（必要に応じて）
3. カスタムレイヤー機能のUI実装（必要に応じて）

## 関連ドキュメント

- [StateManagement.md](./StateManagement.md) - 状態管理規約
- [StateManagementMigrationPlan.md](./StateManagementMigrationPlan.md) - 全体の移行計画