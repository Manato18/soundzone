# Zustand Subscribe メモリリーク防止ガイドライン

## 概要

Zustandのsubscribeメソッドを使用する際は、必ずクリーンアップ処理を実装する必要があります。これを怠るとメモリリークが発生し、アプリのパフォーマンスが低下します。

## 問題の詳細

subscribeメソッドはリスナーを登録しますが、コンポーネントがアンマウントされてもリスナーは自動的に削除されません。これにより：
- メモリ使用量が増加
- 不要なコールバックが実行される
- パフォーマンスが低下

## 正しい実装方法

### 基本パターン

```typescript
import { useEffect } from 'react';
import { useLayersStore } from '../application/layers-store';

export const useLayerSubscription = () => {
  useEffect(() => {
    // subscribeはunsubscribe関数を返す
    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds) => {
        console.log('Selected layers changed:', selectedLayerIds);
      }
    );
    
    // クリーンアップ関数でunsubscribeを呼ぶ
    return () => {
      unsubscribe();
    };
  }, []); // 依存配列は空にして、マウント時のみ実行
};
```

### StateManagement.mdに準拠した実装

```typescript
// Presentation層のカスタムフック
export const useLayerSelectionWithSubscription = () => {
  // 既存のセレクターフック使用
  const selectedLayerIds = useLayersStore((state) => state.selectedLayerIds);
  const availableLayers = useLayersStore((state) => state.availableLayers);
  
  // 必要に応じてsubscribeを使用
  useEffect(() => {
    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds) => {
        // 選択変更時の処理
        // 例: アナリティクス送信、ログ記録など
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  return { selectedLayerIds, availableLayers };
};
```

## 実装チェックリスト

- [ ] subscribeの戻り値（unsubscribe関数）を保存している
- [ ] useEffectのクリーンアップ関数でunsubscribeを呼んでいる
- [ ] 依存配列を適切に設定している
- [ ] 不要なsubscribeを避け、通常のセレクターフックで十分な場合はそちらを使用

## よくある間違い

### ❌ クリーンアップなし
```typescript
useEffect(() => {
  useLayersStore.subscribe(
    (state) => state.selectedLayerIds,
    (selectedLayerIds) => {
      console.log('Selected layers changed:', selectedLayerIds);
    }
  );
  // クリーンアップ関数がない！
}, []);
```

### ❌ 戻り値を無視
```typescript
useEffect(() => {
  // unsubscribe関数を保存していない
  useLayersStore.subscribe(/* ... */);
  
  return () => {
    // 何もクリーンアップできない
  };
}, []);
```

## ベストプラクティス

1. **必要性を検討**: 通常のセレクターフック（`useStore((state) => state.value)`）で十分な場合が多い
2. **subscribeが必要な場合**: 
   - 値の変更を監視して副作用を実行したい
   - 特定の条件でのみ処理を実行したい
   - パフォーマンス最適化が必要
3. **必ずクリーンアップ**: subscribeを使う場合は必ずunsubscribeする

## 参考リンク

- [StateManagement.md](./StateManagement.md) - 状態管理の全体的なガイドライン
- [Zustand公式ドキュメント](https://github.com/pmndrs/zustand)