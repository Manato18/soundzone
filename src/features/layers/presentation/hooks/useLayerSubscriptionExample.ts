import { useEffect } from 'react';
import { useLayersStore } from '../../application/layers-store';

/**
 * Zustand subscribeを使用したサンプル実装
 * メモリリークを防ぐための正しいクリーンアップ方法を示す
 * 
 * 注意: 通常は useLayersStore((state) => state.selectedLayerIds) のような
 * セレクターフックで十分です。subscribeは特別な場合のみ使用してください。
 */
export const useLayerSubscriptionExample = () => {
  useEffect(() => {
    // 例1: 選択されたレイヤーIDの変更を監視
    const unsubscribeSelectedLayers = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds, previousIds) => {
        console.log('Layer selection changed');
        console.log('Previous:', previousIds);
        console.log('Current:', selectedLayerIds);
        
        // ここで必要な副作用を実行
        // 例: アナリティクスイベント送信
        // 例: ローカルストレージへの保存
        // 例: 他のストアへの通知
      }
    );

    // 例2: 利用可能なレイヤーの変更を監視
    const unsubscribeAvailableLayers = useLayersStore.subscribe(
      (state) => state.availableLayers,
      (availableLayers) => {
        console.log('Available layers updated:', availableLayers.length);
        
        // レイヤーリストが更新された時の処理
        // 例: キャッシュの更新
        // 例: UI通知の表示
      }
    );

    // クリーンアップ関数で全てのsubscriptionを解除
    return () => {
      unsubscribeSelectedLayers();
      unsubscribeAvailableLayers();
    };
  }, []); // 空の依存配列でマウント時のみ実行

  // 通常のセレクターフックも併用可能
  const selectedLayerIds = useLayersStore((state) => state.selectedLayerIds);
  const availableLayers = useLayersStore((state) => state.availableLayers);

  return {
    selectedLayerIds,
    availableLayers,
  };
};

/**
 * 特定の条件でのみsubscribeするパターン
 */
export const useConditionalLayerSubscription = (shouldSubscribe: boolean) => {
  useEffect(() => {
    if (!shouldSubscribe) {
      return;
    }

    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds,
      (selectedLayerIds) => {
        // 条件付きでの処理
        if (selectedLayerIds.length > 5) {
          console.warn('Too many layers selected!');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [shouldSubscribe]); // shouldSubscribeが変更されたら再実行
};

/**
 * パフォーマンス最適化のためのsubscribeパターン
 * 特定のプロパティのみを監視し、不要な再レンダリングを防ぐ
 */
export const useOptimizedLayerSubscription = () => {
  useEffect(() => {
    let previousCount = 0;

    const unsubscribe = useLayersStore.subscribe(
      (state) => state.selectedLayerIds.length,
      (count) => {
        // カウントが変わった時のみ処理
        if (count !== previousCount) {
          console.log(`Selected layer count changed: ${previousCount} -> ${count}`);
          previousCount = count;
          
          // カウントベースの処理
          if (count === 0) {
            console.log('No layers selected');
          } else if (count === 1) {
            console.log('Single layer selected');
          } else {
            console.log('Multiple layers selected');
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);
};