# SoundZone - 変更履歴

## 2025-01-26

### Location機能の状態管理一元化（Phase 3）

#### 実装内容
- **LocationProviderの改善**
  - Zustandストアから実際の状態を取得してContext値として提供
  - AppState監視によるフォアグラウンド復帰時の位置再取得機能を追加

- **パフォーマンス最適化**
  - `useLocationUIState`にshallow比較を実装し、不要な再レンダリングを削減
  - heading更新に250msのスロットリングを実装し、過剰な更新を抑制

- **エラーハンドリングの改善**
  - `locationStateManager`からUIアラートを分離
  - エラーコールバック機構を実装し、Presentation層でのエラー表示を実現
  - UIとビジネスロジックの責務を明確に分離

#### 技術的詳細
- StateManagement.mdの設計原則に完全準拠
- Infrastructure層（locationStateManager）からUI関連処理を除去
- Presentation層（LocationProvider）でエラー時のアラート表示を管理
- stableLocationの10m閾値を維持し、地図表示の安定性を確保

### 位置情報権限変更時の動作改善

#### 修正内容
- **AppState監視の強化**
  - フォアグラウンド復帰時に位置情報権限を再チェックする機能を追加
  - 設定画面から戻った際の権限状態変化に適切に対応

- **権限状態変化への対応**
  - OFF→ON: エラーメッセージをクリアし、位置情報サービスを自動的に初期化
  - ON→OFF: 位置情報サービスを停止し、適切なエラーメッセージを表示

- **UIの改善**
  - エラーメッセージの表示位置を現在位置ボタンと同じ高さに調整
  - エラーメッセージの幅を狭めて、現在位置ボタンと重ならないように配置

#### 解決した問題
- 位置情報をOFFからONに変更しても、エラーメッセージが消えない問題を修正
- 位置情報をONからOFFに変更した際の不適切なエラーメッセージを改善

Location機能の状態管理評価

  評価結果：良好 ✅

  StateManagement.mdの規約に対して、location機能は
  高い準拠度を示しています。

  主な評価ポイント：

  1. レイヤー責務（✅ 準拠）
  - Domain: エンティティ定義が適切に配置
  - Infrastructure:
  位置情報API統合をlocationStateManagerで実装
  - Application: Zustandストアで状態管理
  - Presentation: hooks/providersで各レイヤーを統合

  2. Zustand実装（✅ 準拠）
  - ファイル命名: location-store.ts ✓
  - 型定義: interface宣言を使用 ✓
  - middleware順序: devtools → persist → immer ✓
  - 永続化: settingsのみをMMKVに保存 ✓
  - セレクターフック: shallow比較を適切に使用 ✓

  3. 一元管理パターン（✅ 準拠）
  - LocationProviderで初期化・管理を集約
  - 状態の分類が明確（サーバー/UI/設定）
  - エラーハンドリング・クリーンアップ実装済み

  4. 改善可能な点：
  - TanStack Queryとの統合は未実装（現在は位置情報A
  PIのみ使用）
  - 楽観的更新パターンは不要（リアルタイムデータの
  ため）

⏺ Update Todos
  ⎿ ☒ StateManagement.mdの規約に対するlocationモジ 
      ュールの準拠状況を評価
    ☒ 評価結果のサマリーを作成

> 4. 改善可能な点：
    - TanStack 
  Queryとの統合は未実装（現在は位置情報A
    PIのみ使用）について教えて下さい。

⏺ TanStack Queryとの統合について説明します。

⏺ Update Todos
  ⎿  ☐ TanStack Queryとの統合が必要な箇所を特定
     ☐ 具体的な実装例を提示

⏺ 現在のlocation機能は、端末の位置情報APIのみを使用
  していますが、将来的にサーバーとの連携が必要にな
  る場合、TanStack Queryを統合すべきです。

  統合が必要になるケース：

  1. 位置情報の履歴管理
  // 例: ユーザーの移動履歴をサーバーから取得
  const useLocationHistoryQuery = () => {
    return useQuery({
      queryKey: ['location', 'history'],
      queryFn: () => fetchLocationHistory(),
      staleTime: 5 * 60 * 1000, // 5分
    });
  };

  2. 他ユーザーの位置情報共有
  // 例: 近くのユーザーを取得
  const useNearbyUsersQuery = (location: 
  UserLocationData) => {
    return useQuery({
      queryKey: ['users', 'nearby',
  location?.coords],
      queryFn: () => fetchNearbyUsers(location),
      enabled: !!location,
      staleTime: 30 * 1000, // 30秒
    });
  };

  3. 位置情報ベースのコンテンツ取得
  // 例: 現在地周辺の音声ピンを取得
  const useLocationPinsQuery = (location: 
  UserLocationData) => {
    return useQuery({
      queryKey: ['pins', 'location',
  location?.coords],
      queryFn: () =>
  fetchPinsNearLocation(location),
      enabled: !!location,
      gcTime: 15 * 60 * 1000,
    });
  };

  4. 統合パターンの例
  // presentation/hooks/useLocationWithPins.ts
  export const useLocationWithPins = () => {
    const location = useCurrentLocation();
    const { data: pins, isLoading } =
  useLocationPinsQuery(location);

    // Zustandストアへの同期（必要な場合）
    useEffect(() => {
      if (pins) {

  useLocationStore.getState().setNearbyPins(pins);
      }
    }, [pins]);

    return { location, pins, isLoading };
  };

  現状では位置情報取得のみなので、TanStack
  Queryは不要ですが、サーバー連携が追加される際はこ
  のような統合が推奨されます。