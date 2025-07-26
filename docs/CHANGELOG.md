現状の問題点分析

  1. StateManagement.mdの原則から逸脱している箇所

  ❌ 状態の分類が曖昧

  - profile（サーバー状態）がZustandで管理されている
  - TanStack Queryとの責務分担が不明確
  - Blobデータ（avatarLocalBlob）を直接storeに保持

  ❌ 複雑なアクション数

  - 個別フィールド更新関数が多すぎる（setDisplayName, setBio, setAvatarLocalDataなど）
  - updateProfileCreationFormと個別更新関数が併存

  ❌ 命名規則の不統一

  - useAccount vs useProfileCreationFormHook
  - セレクターフックの命名が混在

  2. CentralizedStateManagement.mdの原則から逸脱

  ❌ StateManagerパターンの誤用

  - accountStateManagerが必要以上に複雑
  - ProviderとStateManagerの責務が重複

  ❌ IAuthContext導入による複雑化

  - AuthとAccountの分離が中途半端
  - 依存関係の解決方法が複雑

  改善計画

  ステップ1: 状態の再分類と責務の明確化

  // 1. サーバー状態 → TanStack Query
  - profile データ
  - プロフィール存在確認

  // 2. UI状態 → Zustand（非永続）
  - フォーム入力値
  - バリデーションエラー
  - ローディング状態

  // 3. 永続化状態 → Zustand + MMKV
  - hasCompletedProfile のみ

  ステップ2: シンプルなAPI設計

  // 統合フック1つに集約
  export const useAccountProfile = () => {
    // TanStack Queryでプロフィール管理
    const { data: profile, isLoading } = useProfileQuery();

    // フォーム状態のみZustandで管理
    const formState = useProfileCreationFormState();
    const formActions = useProfileCreationFormActions();

    return {
      profile,
      isLoading,
      form: formState,
      actions: formActions
    };
  };

  ステップ3: 画像管理の改善

  // Blobは一時的にRefで管理
  const imageRef = useRef<{uri: string, blob: Blob}>();

  // storeには画像URIのみ保存

  段階的な実装手順

⏺ Update Todos
  ⎿  ☒ Account機能の現状確認                           
     ☒ StateManagement.mdの原則に基づく問題点の洗い出し
     ☒ 改善計画の策定
     ☒ 段階的な実装手順の作成

✻ Thinking…

  段階的な実装手順を詳しく書きます。

⏺ フェーズ1: 状態管理の整理（優先度：高）

  1. account-store.tsの簡素化
    - プロフィールデータ（profile）を削除
    - アクション数を削減（個別更新関数を統合）
    - UI状態のみに集中
  2. use-account-query.tsの強化
    - プロフィール取得をTanStack Queryに完全移行
    - useProfileQueryとuseCheckProfileExistsQueryに統合
  3. 画像管理の改善
    - Blobデータをstoreから削除
    - 一時的なRefまたはローカル状態で管理

  フェーズ2: インターフェースの簡素化（優先度：中）

  1. IAuthContextの削除
    - AccountProviderのprops経由での認証情報受け渡しを廃止
    - 必要最小限の情報のみをuseAuthから取得
  2. accountStateManagerの削減
    - 不要な初期化ロジックを削除
    - TanStack Queryのキャッシュ管理に委譲

  フェーズ3: 命名規則とAPI統一（優先度：低）

  1. フック命名の統一
    - useAccountProfile - メイン統合フック
    - useProfileCreationForm - フォーム専用フック
    - useProfileQuery - Query専用フック
  2. セレクターの整理
    - 必要最小限のセレクターのみ公開
    - shallow比較の適切な使用

  実装による期待効果

  1. コードの簡素化
    - ファイル数の削減
    - 理解しやすいデータフロー
    - メンテナンス性の向上
  2. パフォーマンス改善
    - 不要な再レンダリングの削減
    - メモリ使用量の最適化（Blob管理）
  3. 原則への準拠
    - StateManagement.mdの分類に従った実装
    - CentralizedStateManagement.mdのパターンに準拠

  注意事項

  - 既存の機能を壊さないよう、段階的に実装
  - 各フェーズ完了後にテストを実施
  - 不要なファイルは最後に削除

