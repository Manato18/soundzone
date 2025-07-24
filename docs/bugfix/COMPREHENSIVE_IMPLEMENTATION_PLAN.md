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

### Phase 0: 緊急セキュリティ対応（1週間）
**理由**: セキュリティリスクは即座に対処すべき

1. **認証システムの緊急修正**
   - ハードコードされた暗号化キーの除去
   - セキュアなキー管理の実装
   - トークン自動更新メカニズム

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

3. **AudioServiceシングルトンの実装**
   - TrackPlayerの適切な管理
   - 音声再生状態の一元化

### Phase 2: ユーザー体験に直接影響する問題（2週間）
**理由**: ユーザーが直面している問題を優先

1. **レイヤー切替時のピン消失問題**
   - keepPreviousDataの実装
   - クライアントサイドフィルタリング

2. **AudioPinの音声再生制御**
   - モーダルクローズ時の音声停止
   - グローバル音声管理

3. **地図の追従モード改善**
   - ユーザー操作検出の改善
   - 適切なフィードバック

### Phase 3: パフォーマンスと安定性（2週間）
**理由**: 基本機能が安定してから最適化

1. **メモリリークの総合対策**
   - 全コンポーネントのクリーンアップ監査
   - WeakMapの活用
   - リソースプールの実装

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

## まとめ

この統合実装計画により、SoundZoneアプリの主要な問題を体系的かつ効率的に解決できます。セキュリティを最優先に、基盤となる問題から順次解決することで、安定した改善を実現します。

各フェーズは相互に依存関係があるため、順序を守って実装することが重要です。また、共通コンポーネントを先に実装することで、後続の実装を効率化できます。