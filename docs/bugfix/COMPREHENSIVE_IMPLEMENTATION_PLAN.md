# SoundZone 総合実装計画

## 概要
このドキュメントは、SoundZoneアプリの5つの主要機能（レイヤー、位置情報、マップ、AudioPin、認証）における問題点と解決策を統合し、効率的な実装順序と共通解決策を提示します。

## 共通パターンと依存関係

### 1. 状態管理の問題（全機能共通）
- **問題**: 状態の二重管理、不整合、メモリリーク
- **影響範囲**: 全機能
- **共通解決策**: 
  - Single Source of Truthの確立
  - 適切なクリーンアップ処理
  - イベント駆動アーキテクチャの採用

### 2. メモリリークとリソース管理（4/5機能）
- **問題**: クリーンアップ不足、リスナーの未解除
- **影響範囲**: AudioPin、Map、Location、Layer
- **共通解決策**:
  - 統一されたリソース管理パターン
  - AbortControllerの活用
  - useEffectのクリーンアップ徹底

### 3. API呼び出しとキャッシング（3/5機能）
- **問題**: 重複リクエスト、不適切なキャッシュ戦略
- **影響範囲**: Layer、Map、AudioPin
- **共通解決策**:
  - React Queryの最適化設定
  - クライアントサイドフィルタリング
  - 楽観的更新

## 実装優先順位（リスクベース）

### Phase 0: 緊急セキュリティ対応（1週間）✅ [完了]
**理由**: セキュリティリスクは即座に対処すべき

1. **認証システムの緊急修正** ✅
   - ハードコードされた暗号化キーの除去 ✅
   - セキュアなキー管理の実装 ✅
   - トークン自動更新メカニズム ✅

### Phase 1: 基盤となる問題の解決（2週間）
**理由**: 他の修正の基礎となる部分

1. **グローバルリソース管理システムの構築**
   ```typescript
   // shared/services/ResourceManager.ts
   class ResourceManager {
     private resources = new Map<string, {
       cleanup: () => void;
       type: 'listener' | 'timer' | 'subscription';
     }>();

     register(id: string, cleanup: () => void, type: string) {
       this.resources.set(id, { cleanup, type });
     }

     unregister(id: string) {
       const resource = this.resources.get(id);
       if (resource) {
         resource.cleanup();
         this.resources.delete(id);
       }
     }

     cleanupAll() {
       this.resources.forEach(resource => resource.cleanup());
       this.resources.clear();
     }
   }
   ```

2. **位置情報の状態管理統一**
   - stableLocationの一元管理
   - heading更新の統合
   - 共通バリデーション関数

3. **AudioServiceシングルトンの実装** ✅ [Phase 1で完了]
   - TrackPlayerの適切な管理
   - 音声再生状態の一元化
   - StateManagement.mdに準拠した実装

### Phase 2: ユーザー体験に直接影響する問題（2週間）
**理由**: ユーザーが直面している問題を優先

1. **レイヤー切替時のピン消失問題** ✅ [Phase 2で完了]
   - keepPreviousDataの実装
   - クライアントサイドフィルタリング
   - useFilteredAudioPinsフックの実装

2. **AudioPinの音声再生制御** ✅ [Phase 1で完了]
   - モーダルクローズ時の音声停止
   - グローバル音声管理
   - バックグラウンド処理の実装

3. **地図の追従モード改善**
   - ユーザー操作検出の改善
   - 適切なフィードバック

### Phase 3: パフォーマンスと安定性（2週間）
**理由**: 基本機能が安定してから最適化

1. **メモリリークの総合対策** ⚠️ [AudioPinはPhase 1で完了]
   - 全コンポーネントのクリーンアップ監査
   - WeakMapの活用
   - リソースプールの実装
   - AudioPinのメモリリークは解決済み

2. **API最適化**
   - デバウンス/スロットリング
   - バッチリクエスト
   - キャッシュ戦略の統一

3. **エラーハンドリングの統一**
   ```typescript
   // shared/utils/errorHandler.ts
   class ErrorHandler {
     static handle(error: Error, context: string) {
       // 環境別ログ制御
       // ユーザーフレンドリーメッセージ
       // リトライロジック
     }
   }
   ```

### Phase 4: 高度な機能実装（3週間）
**理由**: 基本機能が安定してから追加機能

1. **生体認証の実装**
2. **オフラインサポート**
3. **高度なセキュリティ機能**

## 共通コンポーネント/ユーティリティ

### 1. 統一されたクリーンアップフック
```typescript
// shared/hooks/useCleanup.ts
export const useCleanup = () => {
  const cleanupFns = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((fn: () => void) => {
    cleanupFns.current.push(fn);
  }, []);

  useEffect(() => {
    return () => {
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  return { addCleanup };
};
```

### 2. 統一されたロガー
```typescript
// shared/utils/logger.ts
export const logger = {
  error: (message: string, error?: unknown, context?: string) => {
    if (__DEV__) {
      console.error(`[${context}] ${message}`, error);
    } else {
      // Sentryなどへ送信
    }
  },
  warn: (message: string, context?: string) => {
    // 同様の実装
  }
};
```

### 3. 統一されたバリデーション
```typescript
// shared/utils/validation.ts
export const validators = {
  location: {
    isValid: (location: Location | null): location is Location => {
      return location !== null && 
             location.coords.latitude !== 0 && 
             location.coords.longitude !== 0;
    }
  },
  // 他のバリデーション
};
```

## 実装時の注意事項

### 1. 段階的な移行
- 一度に全てを変更せず、機能ごとに段階的に実装
- 各フェーズ後にテストとレビュー
- ロールバック計画の準備

### 2. テスト戦略
- 各フェーズでの回帰テスト
- パフォーマンステスト
- セキュリティテスト

### 3. モニタリング
- エラー率の監視
- パフォーマンスメトリクス
- ユーザーフィードバック

## 技術的負債の削減

### 1. コードの統一性
- 共通パターンの文書化
- コーディング規約の策定
- レビュープロセスの強化

### 2. ドキュメント化
- 実装ガイドラインの作成
- APIドキュメントの整備
- トラブルシューティングガイド

## リスク管理

### 1. 高リスク項目
- セキュリティ関連の変更
- 状態管理の大規模変更
- 認証フローの変更

### 2. 中リスク項目
- パフォーマンス最適化
- UI/UXの変更
- キャッシュ戦略の変更

### 3. 低リスク項目
- ログ追加
- エラーメッセージの改善
- コードのリファクタリング

## 成功指標

### 1. 技術的指標
- メモリリーク件数: 0
- API呼び出し削減: 50%
- エラー率: < 0.1%

### 2. ユーザー体験指標
- アプリクラッシュ率: < 0.5%
- 応答時間: < 200ms
- ユーザー満足度: > 4.5/5

## 実装済みの項目（2025-07-25時点）

### AudioPin関連
1. **メモリリーク対策** ✅
   - AudioPlayerModalのクリーンアップ処理
   - TrackPlayerの適切な解放
   - バックグラウンド時の音声停止
   - EventListenerの適切なクリーンアップ（useAudioPlayer）

2. **StateManagement.md準拠のリファクタリング** ✅
   - AudioService（Infrastructure層）の実装
   - useAudioPlayerフック（Presentation層）の実装
   - レイヤー責務の明確化

3. **レイヤー切替時のピン表示最適化** ✅
   - クライアントサイドフィルタリング実装
   - useFilteredAudioPinsフックの作成
   - ちらつきの解消

### Map関連 ✅ [メモリリーク修正済み]
1. **メモリリーク対策** ✅ [2025-07-25]
   - useMapWithLocationのpreviousLocationRefクリーンアップ実装

### Location関連 ✅ [問題なし]
1. **メモリリーク調査** ✅ [2025-07-25]
   - watchPositionAsyncのsubscriptionが適切にクリーンアップされている
   - headingSubscriptionも適切にクリーンアップされている

### Layer関連 ✅ [全Phase完了]
1. **メモリリーク予防** ✅ [2025-07-25]
   - ZustandSubscribeGuideline.md作成
   - useLayerSubscriptionExample.ts作成
   - 現在subscribeを使用していないことを確認

2. **パフォーマンス最適化（Phase 2）** ✅ [2025-07-25]
   - LayersProviderによる一元管理実装
   - useLayerSelectionフックの最適化（useShallow, useCallback）
   - 楽観的更新の実装（React Query標準パターン）
   - 永続化の問題も解決（初期化処理の修正）

3. **一元管理の継続決定** ✅ [2025-07-25]
   - レイヤー作成は専用画面で実施
   - 全画面で同じレイヤーリストを参照
   - 将来の拡張時はキャッシュ戦略を調整

### 認証関連 ✅ [全て完了]
1. **セキュリティ強化（Phase 0, 1, 2）** ✅
   - 暗号化キーの動的管理（encryptionKeyManager.ts） ✅
   - トークン自動更新（authTokenManager.ts） ✅
   - レート制限の実装（rateLimiter.ts） ✅
   - エラーメッセージのサニタイズ（errorSanitizer.ts） ✅

2. **状態管理改善（Phase 3）** ✅
   - 認証状態の一元管理（authStateManager.ts） ✅
   - 競合状態の解決（authProcessStateフラグ） ✅
   - メモリリークの防止（全クリーンアップ処理） ✅
   - セッション永続化（sessionPersistence.ts） ✅

## 残っている主要な問題と優先度

### 緊急度：高（ユーザー体験に直接影響）
1. **位置情報の状態不整合**
   - stableLocationの二重管理
   - headingのnull値問題
   - 影響：AudioPin作成、地図表示の不具合

2. **エラーハンドリング不足**
   - 位置情報権限拒否時の対応
   - APIエラー時のリトライ不足
   - 影響：ユーザーが機能を使えない

### 緊急度：中（機能の安定性）
1. **地図の追従モード**
   - ユーザー操作検出の不具合
   - 意図しない地図移動

2. **状態管理の一貫性**
   - ストア間の同期問題
   - 永続化戦略の不整合

3. **パフォーマンス問題** ⚠️ [レイヤー機能は解決済み]
   - 重複API呼び出し ✅ [レイヤー機能：LayersProvider実装済み]
   - 不要な再レンダリング ✅ [レイヤー機能：最適化済み]
   - 大量マーカー表示時の低速化

### 緊急度：低（今後の拡張性）
1. **UI/UX改善**
   - アニメーション中の状態更新
   - フィードバック不足

2. **高度な機能**
   - オフラインサポート
   - 生体認証

## まとめ

この統合実装計画により、SoundZoneアプリの主要な問題を体系的かつ効率的に解決できます。認証システムとレイヤー機能は全て完了し、安定した実装となりました。現在は位置情報の状態不整合とエラーハンドリングが最優先で対処すべき課題として残っています。

各フェーズは相互に依存関係があるため、順序を守って実装することが重要です。また、共通コンポーネントを先に実装することで、後続の実装を効率化できます。