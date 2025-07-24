import { useCallback, useMemo } from 'react';
import { useLayersStore, layersSelectors } from '../../application/layers-store';
import { Layer } from '../../domain/entities/Layer';
import { useLayersQuery } from './use-layers-query';

/**
 * レイヤー選択機能を提供するフック
 * 既存のインターフェースを維持しながら、内部でZustandストアを使用
 */
export const useLayerSelection = () => {
  // Zustandストアから必要な状態とアクションを取得
  const availableLayers = useLayersStore(state => state.availableLayers);
  const selectedLayerIds = useLayersStore(state => state.selectedLayerIds);
  const toggleLayerAction = useLayersStore(state => state.toggleLayer);
  const toggleAllLayersAction = useLayersStore(state => state.toggleAllLayers);
  
  // レイヤーデータを取得（初回のみ）
  useLayersQuery();
  
  // 選択状態を含むレイヤー配列を生成
  const layers = useMemo<Layer[]>(() => {
    return availableLayers.map(layer => ({
      ...layer,
      isSelected: selectedLayerIds.includes(layer.id),
    }));
  }, [availableLayers, selectedLayerIds]);
  
  // レイヤーの選択/解除をトグルする
  const toggleLayer = useCallback((layerId: string) => {
    toggleLayerAction(layerId);
  }, [toggleLayerAction]);
  
  // 選択されているレイヤーIDの配列を取得
  const getSelectedLayerIds = useCallback((): string[] => {
    return selectedLayerIds;
  }, [selectedLayerIds]);
  
  // すべてのレイヤーを選択/解除
  const toggleAllLayers = useCallback((select: boolean = true) => {
    toggleAllLayersAction(select);
  }, [toggleAllLayersAction]);
  
  return {
    layers,
    toggleLayer,
    getSelectedLayerIds,
    toggleAllLayers,
  };
}; 