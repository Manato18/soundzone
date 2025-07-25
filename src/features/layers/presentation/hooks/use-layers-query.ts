import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { layersService } from '../../infrastructure/layers-service';
import { useLayersStore } from '../../application/layers-store';
import { Layer } from '../../domain/entities/Layer';

/**
 * レイヤー一覧を取得するクエリフック
 */
export const useLayersQuery = () => {
  const setAvailableLayers = useLayersStore(state => state.setAvailableLayers);
  const setLoading = useLayersStore(state => state.setLoading);
  const setError = useLayersStore(state => state.setError);
  const initializeSelectedLayers = useLayersStore(state => state.initializeSelectedLayers);
  
  const query = useQuery({
    queryKey: queryKeys.layer.list(),
    queryFn: async () => {
      setLoading(true);
      setError(null);
      
      try {
        const layers = await layersService.fetchLayers();
        return layers;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'レイヤーの取得に失敗しました';
        setError(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: Infinity, // レイヤーは基本的に変更されないため
    gcTime: 24 * 60 * 60 * 1000, // 24時間キャッシュ
  });
  
  // レイヤーが取得できたらZustandストアに設定
  useEffect(() => {
    if (query.data) {
      setAvailableLayers(query.data);
      // 初回のみ選択状態を初期化
      initializeSelectedLayers();
    }
  }, [query.data, setAvailableLayers, initializeSelectedLayers]);
  
  return query;
};

/**
 * ユーザーのレイヤー設定を取得するクエリフック
 */
export const useUserLayerPreferencesQuery = (userId: string | null) => {
  const updateSettings = useLayersStore(state => state.updateSettings);
  const setSelectedLayerIds = useLayersStore(state => state.setSelectedLayerIds);
  
  return useQuery({
    queryKey: ['userLayerPreferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const preferences = await layersService.fetchUserLayerPreferences(userId);
      
      // 設定が取得できたらストアに反映
      if (preferences) {
        updateSettings({
          favoriteLayerIds: preferences.favoriteLayerIds,
          defaultLayerIds: preferences.defaultLayerIds,
        });
        setSelectedLayerIds(preferences.selectedLayerIds);
      }
      
      return preferences;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
  });
};

/**
 * ユーザーのレイヤー設定を保存するミューテーションフック
 */
export const useSaveUserLayerPreferencesMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, preferences }: {
      userId: string;
      preferences: {
        selectedLayerIds: string[];
        favoriteLayerIds: string[];
        defaultLayerIds: string[];
      };
    }) => {
      await layersService.saveUserLayerPreferences(userId, preferences);
    },
    onSuccess: (_, variables) => {
      // キャッシュを無効化して再取得を促す
      queryClient.invalidateQueries({
        queryKey: ['userLayerPreferences', variables.userId],
      });
    },
  });
};

/**
 * カスタムレイヤーを作成するミューテーションフック
 * React Query標準の楽観的更新を使用
 */
export const useCreateLayerMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (layer: Omit<Layer, 'id'>) => {
      return await layersService.createCustomLayer(layer);
    },
    onMutate: async (newLayer) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.layer.list() });
      
      // 楽観的更新用の一時的なレイヤー
      const optimisticLayer: Layer = {
        ...newLayer,
        id: `temp-${Date.now()}`,
        isSelected: true,
      };
      
      // 現在のデータを取得
      const previousLayers = queryClient.getQueryData<Layer[]>(queryKeys.layer.list());
      
      // 楽観的更新
      if (previousLayers) {
        queryClient.setQueryData<Layer[]>(
          queryKeys.layer.list(),
          [...previousLayers, optimisticLayer]
        );
      }
      
      // ロールバック用のコンテキストを返す
      return { previousLayers };
    },
    onError: (err, newLayer, context) => {
      // エラー時は元に戻す
      if (context?.previousLayers) {
        queryClient.setQueryData(queryKeys.layer.list(), context.previousLayers);
      }
      
      // エラーをZustandストアに設定
      useLayersStore.getState().setError(
        err instanceof Error ? err.message : 'レイヤーの作成に失敗しました'
      );
    },
    onSettled: () => {
      // 成功・失敗に関わらず最新データを取得
      queryClient.invalidateQueries({ queryKey: queryKeys.layer.list() });
    },
  });
};

/**
 * レイヤーを更新するミューテーションフック
 * React Query標準の楽観的更新を使用
 */
export const useUpdateLayerMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ layerId, updates }: {
      layerId: string;
      updates: Partial<Layer>;
    }) => {
      return await layersService.updateLayer(layerId, updates);
    },
    onMutate: async ({ layerId, updates }) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.layer.list() });
      
      // 現在のデータを取得
      const previousLayers = queryClient.getQueryData<Layer[]>(queryKeys.layer.list());
      
      // 楽観的更新
      if (previousLayers) {
        queryClient.setQueryData<Layer[]>(
          queryKeys.layer.list(),
          previousLayers.map(layer => 
            layer.id === layerId 
              ? { ...layer, ...updates }
              : layer
          )
        );
      }
      
      // ロールバック用のコンテキストを返す
      return { previousLayers };
    },
    onError: (err, _, context) => {
      // エラー時は元に戻す
      if (context?.previousLayers) {
        queryClient.setQueryData(queryKeys.layer.list(), context.previousLayers);
      }
      
      // エラーをZustandストアに設定
      useLayersStore.getState().setError(
        err instanceof Error ? err.message : 'レイヤーの更新に失敗しました'
      );
    },
    onSettled: () => {
      // 成功・失敗に関わらず最新データを取得
      queryClient.invalidateQueries({ queryKey: queryKeys.layer.list() });
    },
  });
};

/**
 * レイヤーを削除するミューテーションフック
 * React Query標準の楽観的更新を使用
 */
export const useDeleteLayerMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (layerId: string) => {
      await layersService.deleteLayer(layerId);
      return layerId;
    },
    onMutate: async (layerId) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.layer.list() });
      
      // 現在のデータを取得
      const previousLayers = queryClient.getQueryData<Layer[]>(queryKeys.layer.list());
      
      // 楽観的更新
      if (previousLayers) {
        queryClient.setQueryData<Layer[]>(
          queryKeys.layer.list(),
          previousLayers.filter(layer => layer.id !== layerId)
        );
      }
      
      // 選択状態からも削除
      const currentSelectedIds = useLayersStore.getState().selectedLayerIds;
      if (currentSelectedIds.includes(layerId)) {
        useLayersStore.getState().setSelectedLayerIds(
          currentSelectedIds.filter(id => id !== layerId)
        );
      }
      
      // ロールバック用のコンテキストを返す
      return { previousLayers };
    },
    onError: (err, _, context) => {
      // エラー時は元に戻す
      if (context?.previousLayers) {
        queryClient.setQueryData(queryKeys.layer.list(), context.previousLayers);
      }
      
      // エラーをZustandストアに設定
      useLayersStore.getState().setError(
        err instanceof Error ? err.message : 'レイヤーの削除に失敗しました'
      );
    },
    onSettled: () => {
      // 成功・失敗に関わらず最新データを取得
      queryClient.invalidateQueries({ queryKey: queryKeys.layer.list() });
    },
  });
};