import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLayersStore } from '../../application/layers-store';
import { Layer } from '../../domain/entities/Layer';

/**
 * レイヤー選択機能を提供するフック
 * 既存のインターフェースを維持しながら、内部でZustandストアを使用
 */
export const useLayerSelection = () => {
  // パフォーマンス最適化: 必要な状態のみをセレクターで取得
  const { availableLayers, selectedLayerIds } = useLayersStore(
    useShallow((state) => ({
      availableLayers: state.availableLayers,
      selectedLayerIds: state.selectedLayerIds,
    }))
  );
  
  // アクションは別途取得（状態変更時に再レンダリングしない）
  const toggleLayerAction = useLayersStore(state => state.toggleLayer);
  const toggleAllLayersAction = useLayersStore(state => state.toggleAllLayers);
  const setSelectedLayerIds = useLayersStore(state => state.setSelectedLayerIds);
  
  // レイヤー配列（選択状態は別管理）
  const layers = useMemo<Layer[]>(() => {
    return availableLayers;
  }, [availableLayers]);
  
  // レイヤーの選択/解除をトグルする（メモ化）
  const toggleLayer = useCallback((layerId: string) => {
    toggleLayerAction(layerId);
  }, [toggleLayerAction]);
  
  // 選択されているレイヤーIDの配列を取得（メモ化）
  const getSelectedLayerIds = useCallback((): string[] => {
    return useLayersStore.getState().selectedLayerIds;
  }, []);
  
  // すべてのレイヤーを選択/解除（メモ化）
  const toggleAllLayers = useCallback((select: boolean = true) => {
    toggleAllLayersAction(select);
  }, [toggleAllLayersAction]);
  
  // 特定のレイヤーIDを設定（メモ化）
  const setSelectedLayers = useCallback((layerIds: string[]) => {
    setSelectedLayerIds(layerIds);
  }, [setSelectedLayerIds]);
  
  // 選択されたレイヤーオブジェクトを取得（メモ化）
  const selectedLayers = useMemo(() => {
    return availableLayers.filter((layer: Layer) => 
      selectedLayerIds.includes(layer.id)
    );
  }, [availableLayers, selectedLayerIds]);
  
  return {
    layers,
    selectedLayers,
    selectedLayerIds,
    toggleLayer,
    getSelectedLayerIds,
    setSelectedLayers,
    toggleAllLayers,
  };
}; 