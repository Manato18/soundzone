# レイヤー機能の問題と解決策 ✅ 全Phase完了

## 問題の概要とPhase分け

レイヤー機能には以下の問題があり、優先度と依存関係を考慮して3つのPhaseに分けて対応しました：

### Phase 1: メモリリークの修正（緊急度：高）✅ [2025-07-25 完了]
- **問題**: Zustand subscribeのクリーンアップ不足によるメモリリーク
- **影響**: アプリの長時間使用でメモリ使用量が増加、パフォーマンス低下
- **期間**: 1-2日

### Phase 2: パフォーマンス最適化（緊急度：中）✅ [2025-07-25 完了]
- **問題**: 重複API呼び出し、不要な再レンダリング、楽観的更新の競合
- **影響**: レスポンスの遅延、無駄なネットワーク使用
- **期間**: 3-4日

### Phase 3: 既に解決済みの問題 ✅ [完了]
- ✅ レイヤー切替時のピン消失問題
- ✅ 音声再生制御問題（AudioPin）

---

## Phase 1: メモリリーク問題の解決

### 問題の詳細
useEffect内でのZustand subscribeにクリーンアップ関数がなく、コンポーネントのアンマウント時にリスナーが残る。これによりメモリリークが発生し、アプリのパフォーマンスが徐々に低下する。

### 影響箇所
- `src/features/layers/presentation/hooks/useLayerSelection.ts`
- その他Zustand subscribeを使用している全てのカスタムフック

### 実装した解決策 ✅ [2025-07-25]

#### 1. 現状の調査結果
- 現在のコードベースではZustand subscribeメソッドを直接使用している箇所は見つからなかった
- しかし、将来的な実装で問題が発生することを防ぐため、予防的な対策を実施

#### 2. 実装した内容
1. **ガイドラインドキュメントの作成** ✅
   - `/docs/ZustandSubscribeGuideline.md`を作成
   - メモリリークの原因と正しい実装方法を記載
   - よくある間違いとベストプラクティスを明記

2. **サンプル実装の作成** ✅
   - `/src/features/layers/presentation/hooks/useLayerSubscriptionExample.ts`を作成
   - 正しいクリーンアップ方法を示す3つのパターンを実装
   - StateManagement.mdに準拠した実装例

#### 3. 既存コードの確認
- useLayerSelectionフックは通常のセレクターフックのみを使用（問題なし）
- 他のレイヤー関連フックもsubscribeを使用していない（問題なし）

### 今後の実装での注意点

1. **subscribeを使用する前に検討**
   - 通常のセレクターフック `useStore((state) => state.value)` で十分か確認
   - subscribeは副作用の実行が必要な場合のみ使用

2. **必ずクリーンアップを実装**
   ```typescript
   useEffect(() => {
     const unsubscribe = store.subscribe(selector, callback);
     return () => unsubscribe();
   }, []);
   ```

3. **ガイドラインに従う**
   - `/docs/ZustandSubscribeGuideline.md` を参照
   - `/src/features/layers/presentation/hooks/useLayerSubscriptionExample.ts` のパターンを参考に

### 正しい実装例（将来subscribeが必要になった場合）
```typescript
// src/features/layers/presentation/hooks/useLayerSelection.ts
export const useLayerSelection = () => {
  const store = useLayersStore();
  
  useEffect(() => {
    // Zustandのsubscribe使用時は必ずクリーンアップ
    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds) => {
        // 選択されたレイヤーが変更された時の処理
        console.log('Selected layers changed:', selectedLayerIds);
      }
    );
    
    // クリーンアップ関数を返す
    return () => {
      unsubscribe();
    };
  }, []); // 依存配列は空にして、マウント時のみ実行
  
  return {
    // 既存のreturn
  };
};
```

#### カスタムフックでの汎用化
```typescript
// src/shared/hooks/useStoreSubscription.ts
export function useStoreSubscription<T>(
  selector: (state: any) => T,
  listener: (value: T) => void,
  store: any
) {
  useEffect(() => {
    const unsubscribe = store.subscribe(selector, listener);
    return unsubscribe;
  }, []); // ESLintの警告を無視するか、依存配列を適切に設定
}
```

---

## Phase 2: パフォーマンス問題の解決 ✅ [2025-07-25 完了]

### 問題の詳細
- 重複したAPI呼び出し
- 不要な再レンダリング
- 楽観的更新の競合

### 実装した解決策 ✅ [2025-07-25]

#### 1. 重複API呼び出しの防止 ✅
**実装ファイル:**
- `/src/features/layers/presentation/providers/LayersProvider.tsx` (新規作成)
- `/App.tsx` (LayersProvider組み込み)

**実装内容:**
- アプリケーションレベルで一度だけレイヤーデータを取得
- React Queryのキャッシュを最大限活用（staleTime: Infinity）
- 24時間のガベージコレクション時間設定
- エラーハンドリングとリトライロジック実装

#### 2. 不要な再レンダリングの防止 ✅
**実装ファイル:**
- `/src/features/layers/presentation/hooks/useLayerSelection.ts` (最適化)

**実装内容:**
- Zustand shallowセレクターで必要な状態のみ購読
- useCallbackで関数の参照安定性を保証
- useMemoで派生状態の計算を最適化
- アクションと状態を分離して不要な再レンダリングを防止

#### 3. 楽観的更新の改善 ✅
**実装ファイル:**
- `/src/features/layers/presentation/hooks/use-layers-query.ts` (更新)

**実装内容:**
- React Query標準のonMutate/onError/onSettledパターン実装
- 作成・更新・削除の全ミューテーションで楽観的更新
- エラー時の自動ロールバック機能
- 一時的なIDを使用した安全な楽観的更新

### 技術的な改善点
- **API呼び出し削減**: LayersProviderによる一元管理で重複呼び出しを完全に排除
- **パフォーマンス向上**: shallow比較とメモ化により再レンダリングを最小化
- **UX改善**: 楽観的更新により即座に画面に反映
- **保守性向上**: StateManagement.mdに準拠した一貫性のある実装

### 次のステップ
Phase 3については既に解決済みのため、追加の実装は不要です。

---

## 完了ステータスと今後の方針

### 完了した内容
1. **Phase 1**: メモリリーク対策（予防的措置） ✅
2. **Phase 2**: パフォーマンス最適化 ✅
   - LayersProviderによる一元管理
   - useLayerSelectionの最適化
   - 楽観的更新の実装
3. **Phase 3**: 既存問題（既に解決済み） ✅

### 永続化の問題も解決 ✅ [2025-07-25]
- レイヤー選択状態がアプリ再起動時に保持されない問題を修正
- `initializeSelectedLayers`の条件判定を改善

### 今後の方針：一元管理の継続

レイヤー機能は**LayersProviderによる一元管理**を継続します：

1. **理由**
   - レイヤー作成は専用画面で行い、他の画面では登録済みレイヤーのみを使用
   - 全画面で同じレイヤーリストを参照するため一元管理が最適
   - パフォーマンスとUXの観点から現在の実装が理想的

2. **将来の拡張時の対応**
   - ユーザー作成レイヤー機能：現在の構造で対応可能
   - 必要に応じてstaleTimeを調整（現在はInfinity → 5分など）
   - 手動更新機能の追加（リフレッシュボタン等）

3. **現在の実装の強み**
   - Single Source of Truth原則に準拠
   - React Queryのキャッシュ機能を最大限活用
   - 楽観的更新により優れたUXを実現
   - 将来の拡張に対して柔軟な設計

全てのレイヤー機能の問題が解決され、安定した実装となりました。
