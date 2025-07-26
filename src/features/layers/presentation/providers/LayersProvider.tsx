import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { layersService } from '../../infrastructure/layers-service';
import { useLayersStore } from '../../application/layers-store';

/**
 * LayersProvider
 * アプリケーションレベルでレイヤーデータを一元管理するProvider
 * 
 * 責務:
 * - アプリケーション起動時に一度だけレイヤーデータを取得
 * - React Queryのキャッシュを最大限活用
 * - Zustandストアにデータを同期
 * - 重複API呼び出しの防止
 */
interface LayersProviderProps {
  children: React.ReactNode;
}

export const LayersProvider: React.FC<LayersProviderProps> = ({ children }) => {
  const setAvailableLayers = useLayersStore(state => state.setAvailableLayers);
  const setLoading = useLayersStore(state => state.setLoading);
  const setError = useLayersStore(state => state.setError);
  const initializeSelectedLayers = useLayersStore(state => state.initializeSelectedLayers);
  const isInitializedRef = useRef(false);

  // アプリケーションレベルで一度だけレイヤーを取得
  const { data: layers, isLoading, error } = useQuery({
    queryKey: queryKeys.layer.list(),
    queryFn: layersService.fetchLayers,
    staleTime: Infinity, // 手動で無効化するまでキャッシュを保持
    gcTime: 24 * 60 * 60 * 1000, // 24時間キャッシュ
    retry: 3, // 失敗時は3回まで再試行
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // ローディング状態をZustandストアに同期
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // エラー状態をZustandストアに同期
  useEffect(() => {
    if (error) {
      const message = error instanceof Error ? error.message : 'レイヤーの取得に失敗しました';
      setError(message);
    } else {
      setError(null);
    }
  }, [error, setError]);

  // レイヤーデータが取得できたらZustandストアに設定
  useEffect(() => {
    if (layers) {
      setAvailableLayers(layers);
      // 初回のみ選択状態を初期化（永続化データがない場合のみ）
      if (!isInitializedRef.current) {
        initializeSelectedLayers();
        isInitializedRef.current = true;
      }
    }
  }, [layers, setAvailableLayers, initializeSelectedLayers]);

  // 開発環境でのログ出力
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const currentState = useLayersStore.getState();
      console.log('[LayersProvider] State', {
        layersCount: layers?.length ?? 0,
        selectedLayerIds: currentState.selectedLayerIds,
        selectedCount: currentState.selectedLayerIds.length,
        isLoading,
        hasError: !!error,
        wasInitialized: isInitializedRef.current,
      });
    }
  }, [layers, isLoading, error]);

  return <>{children}</>;
};