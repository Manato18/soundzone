
## 1. 目的

React／React Native アプリにおいて **UI 状態・サーバー状態・永続クライアント状態** を一貫して取り扱うための実装規約を定義する。
標準スタックは **TanStack Query（サーバー／キャッシュ）＋ Zustand（UI／一時）＋ MMKV（端末永続）** とする。

---

## 2. レイヤー責務

| レイヤー               | 典型的フォルダ                 | 主な責務                | 想定ライブラリ                    |
| ------------------ | ----------------------- | ------------------- | -------------------------- |
| **Domain**         | `domain/**`             | エンティティ・値オブジェクト・不変条件 | ―                          |
| **Infrastructure** | `infrastructure/**`     | API クライアント、SDK、永続化  | Supabase SDK／fetch／MMKV    |
| **Application**    | `application/**`        | アプリケーション・UI 状態の保持   | Zustand (+ middleware)     |
| **Presentation**   | `presentation/hooks/**` | 各レイヤーの統合、UI からの入口   | TanStack Query／React hooks |

* **分類規則**

  * **Ephemeral UI state** (フォーム入力値、モーダル開閉) → Zustand
  * **Remote server state** (API 由来データ) → TanStack Query
  * **Persistent client state** (設定・トークン) → MMKV（Zustand persist）

---

## 3. Zustand 規約

* **ファイル命名**：`<feature>-store.ts`（1 機能 1 ストア、>300 LOC で slice を検討）
* **型定義**：必ず `interface` を宣言し匿名型を避ける
* **再描画最小化**：セレクター Hook と `shallow` 比較を併用
* **middleware 順序**：`devtools → persist(MMKV) → immer`（devtools は最外層）
* **永続化制限**：100 KB 超の配列・オブジェクトを直接保持しない（ID 正規化）
* **本番ビルド**：devtools／ログ出力は除外

---

## 4. TanStack Query 規約

1. **queryKey** はシリアライズ可能な配列：`['auth', 'user']`

2. **staleTime / gcTime 推奨値（v5 仕様準拠）**

   | データ種別  | staleTime | gcTime |
   | ------ | --------- | ------ |
   | 認証ユーザー | 5 min     | 15 min |
   | 参照マスタ  | Infinity  | 24 h   |
   | 高頻度更新  | 0         | 5 min  |

3. **キャッシュ更新**：`onSuccess` で zustand setter を呼び出し単一点同期（重複保持は最小限に）

4. **クエリクリア**：ログアウト時は `queryClient.removeQueries({ predicate: q => q.queryKey[0] === 'auth' })`

5. **Suspense/ErrorBoundary**：画面単位で局所的に利用し、グローバルでは使用しない

6. **OfflineFirst** が必要な場合は `networkMode: 'offlineFirst'` を指定。

上記の `cacheTime` → `gcTime` 名称変更は TanStack Query v5 の公式変更です。

---

## 5. MMKV 使用基準

* キー管理は `src/constants/StorageKeys.ts` に集約
* 同期リードはストア初期化時のみ、書き込みは zustand setter 内に限定
* トークン・PII を扱う場合は **暗号化キーを明示**：

  ```ts
  // 推奨
  const storage = new MMKV({ encryptionKey: ENV.MMKV_KEY });
  ```
* 関数・クラスインスタンスは保存不可（JSON シリアライズ可能なプリミティブのみ）
* **バージョン依存**：v3 以降は TurboModule ベース。React Native **0.74 以上** & 新アーキテクチャが前提。

---

## 6. カスタム Hook 設計

```text
use<Feature><Action>Hook.ts
└─ consumes zustand selectors
└─ consumes query/mutation hooks
└─ exposes { state, handlers, status }
```

* Hook は API クライアントを直接公開しない
* `useCallback`／`useMemo` で参照安定性を保証

---

## 7. 命名規則

| 用途                    | 接頭辞                  | 例                     |
| --------------------- | -------------------- | --------------------- |
| Query Hook            | `use<X>Query`        | `useCurrentUserQuery` |
| Mutation Hook         | `use<X>Mutation`     | `useSignInMutation`   |
| Zustand Selector Hook | `use<X>`             | `useLoginForm`        |
| Composite Hook        | `use<X>Hook`         | `useLoginFormHook`    |
| Store File            | `<feature>-store.ts` | `auth-store.ts`       |

---

## 8. 実装チェックリスト

*  正しいレイヤーに配置しているか
*  UI／Server／Persistent を混同していないか
*  queryKey 命名規則を満たしているか
*  コンポーネントは selector Hook 経由で状態を取得しているか
*  永続対象のデータ量は許容範囲内か
*  ユニット／統合テストを実装したか
*  devtools／ログを本番ビルドで除外しているか

---

## 9. 追加ガイドライン

* **Concurrent Rendering**：React Native 新アーキテクチャ（RN 0.74+）で React 18 の concurrent features を前提にし、アンマウント後の state 更新を回避。
* **トークンリフレッシュ**：`AppState` 変化時にサイレント更新を実装。
* **型自動生成**：`supabase gen types typescript` で API 型を同期。
* **インストルメンテーション**：zustand middleware で Sentry Breadcrumb を記録。
* **E2E テスト**：Detox では Mock MMKV を使用しリアルストレージ依存を排除。

---

## 10. 一元状態管理（Centralized State Management）

### 10.1 一元管理の判断基準

**一元管理が必要な場合**：
- 3つ以上の画面で同じデータを参照
- 画面間でのリアルタイム同期が必要
- 他の機能がそのデータに依存
- アプリ全体の動作に影響するグローバル状態

**個別管理で十分な場合**：
- 特定画面でのみ使用される状態
- 画面遷移時にリセットしてよい一時的なデータ
- 他機能に影響しない独立した処理

### 10.2 Provider実装パターン

```typescript
// 1. ディレクトリ構造
src/features/<feature>/
├── application/
│   └── <feature>-store.ts         # Zustandストア
├── domain/
│   └── entities/                  # ドメインエンティティ
├── infrastructure/
│   └── services/                  # APIサービス、状態管理サービス
└── presentation/
    ├── hooks/
    │   ├── use-<feature>.ts       # 統合フック
    │   └── use-<feature>-query.ts # TanStack Query統合
    └── providers/
        └── <Feature>Provider.tsx   # コンテキストプロバイダー

// 2. Provider実装例
export const FeatureProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // 初期データ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature'],
    queryFn: fetchFeatureData,
    staleTime: Infinity, // データ特性に応じて設定
  });

  // Zustandストアへの同期
  useEffect(() => {
    if (data) {
      useFeatureStore.getState().setData(data);
    }
  }, [data]);

  if (error) return <ErrorBoundary error={error} />;
  return <>{children}</>;
};
```

### 10.3 状態の分類と管理戦略

```typescript
interface FeatureState {
  // サーバー状態（TanStack Queryで管理）
  data: Entity[];
  
  // UI状態（Zustand管理、非永続）
  ui: {
    isLoading: boolean;
    error: string | null;
    selectedId: string | null;
    modalState: ModalState;
  };
  
  // 設定（Zustand管理、MMKV永続化）
  settings: {
    userPreferences: Preferences;
    cachedSelections: string[];
  };
  
  // プロセス状態（競合防止用）
  processState: 'IDLE' | 'PROCESSING' | 'ERROR';
}
```

### 10.4 Zustand Middlewareの順序（重要）

```typescript
// 正しい順序：外側から内側へ
export const useFeatureStore = create<FeatureState & FeatureActions>()(
  devtools(              // 1. 最外層：開発ツール
    persist(             // 2. 永続化
      immer(             // 3. イミュータブル更新
        subscribeWithSelector((set) => ({
          // ストア実装
        }))
      ),
      {
        name: 'feature-storage',
        storage: mmkvStorage,
        partialize: (state) => ({
          settings: state.settings  // 設定のみ永続化
        })
      }
    ),
    { enabled: process.env.NODE_ENV === 'development' }
  )
);
```

### 10.5 楽観的更新の実装

```typescript
const useUpdateFeatureMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateFeature,
    onMutate: async (newData) => {
      // 1. 既存クエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['feature'] });
      
      // 2. 現在のデータを保存
      const previousData = queryClient.getQueryData(['feature']);
      
      // 3. 楽観的更新
      queryClient.setQueryData(['feature'], (old) => ({
        ...old,
        ...newData
      }));
      
      // 4. ロールバック用コンテキストを返す
      return { previousData };
    },
    onError: (err, _, context) => {
      // エラー時はロールバック
      if (context?.previousData) {
        queryClient.setQueryData(['feature'], context.previousData);
      }
    },
    onSettled: () => {
      // 最終的に最新データを取得
      queryClient.invalidateQueries({ queryKey: ['feature'] });
    }
  });
};
```

### 10.6 セレクターパターン

```typescript
// 個別セレクター（再描画最適化）
export const useFeatureData = () => useFeatureStore((state) => state.data);
export const useFeatureUI = () => useFeatureStore((state) => state.ui, shallow);

// 複合セレクター
export const useSelectedFeature = () => {
  const data = useFeatureStore((state) => state.data);
  const selectedId = useFeatureStore((state) => state.ui.selectedId);
  return data.find(item => item.id === selectedId);
};

// セレクターオブジェクト（再利用可能）
export const featureSelectors = {
  getFilteredData: (filter: Filter) => (state: FeatureState) => {
    return state.data.filter(item => matchesFilter(item, filter));
  },
  isItemSelected: (id: string) => (state: FeatureState) => {
    return state.ui.selectedId === id;
  }
};
```

### 10.7 一元管理のベストプラクティス

1. **初期化戦略**：
   - 永続化データの復元を優先
   - デフォルト値へのフォールバック
   - 初回起動時の特別処理

2. **クリーンアップ**：
   - ログアウト時の状態リセット
   - 不要なキャッシュの削除
   - メモリリークの防止

3. **エラーハンドリング**：
   - グレースフルデグラデーション
   - ユーザーへの適切なフィードバック
   - リトライ戦略

4. **パフォーマンス最適化**：
   - セレクターによる再描画制御
   - メモ化の適切な使用
   - バッチ更新の活用

---

## 11. 参考リンク

* Zustand  [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
* TanStack Query [https://tanstack.com/query](https://tanstack.com/query)
* MMKV for React Native [https://github.com/mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
