
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
2. **staleTime / cacheTime 推奨値（チームガイドライン）**

   | データ種別  | staleTime | cacheTime |
   | ------ | --------- | --------- |
   | 認証ユーザー | 5 min     | 15 min    |
   | 参照マスタ  | Infinity  | 24 h      |
   | 高頻度更新  | 0         | 5 min     |
3. **キャッシュ更新**：`onSuccess` で zustand setter を呼び出し単一点同期
4. **クエリクリア**：ログアウト時は `queryClient.removeQueries({ predicate: q => q.queryKey[0] === 'auth' })`
5. **Suspense/ErrorBoundary**：画面単位で局所的に利用し、グローバルでは使用しない
6. **OfflineFirst** が必要な場合は `networkMode: 'offlineFirst'` を指定

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
* **バージョン依存**：v3 以降は TurboModule ベース。React Native 0.75 以上 & 新アーキテクチャが前提。

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

* **Concurrent Rendering**：React Native 0.75 以上 & 新アーキテクチャ有効を前提。アンマウント後の state 更新を回避。
* **トークンリフレッシュ**：`AppState` 変化時にサイレント更新を実装。
* **型自動生成**：`supabase gen types typescript` で API 型を同期。
* **インストルメンテーション**：zustand middleware で Sentry Breadcrumb を記録。
* **E2E テスト**：Detox では Mock MMKV を使用しリアルストレージ依存を排除。

---

## 10. 参考リンク

* Zustand  [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
* TanStack Query [https://tanstack.com/query](https://tanstack.com/query)
* MMKV for React Native [https://github.com/mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
