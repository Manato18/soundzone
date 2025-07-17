import { useState } from 'react';
import { DEFAULT_LAYERS, Layer } from '../../domain/entities/Layer';

export const useLayerSelection = () => {
  // 初期状態ではすべてのレイヤーが選択されている
  const [layers, setLayers] = useState<Layer[]>(
    DEFAULT_LAYERS.map(layer => ({ ...layer, isSelected: true }))
  );

  // レイヤーの選択/解除をトグルする
  const toggleLayer = (layerId: string) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, isSelected: !layer.isSelected }
          : layer
      )
    );
  };

  // 選択されているレイヤーIDの配列を取得
  const getSelectedLayerIds = (): string[] => {
    return layers.filter(layer => layer.isSelected).map(layer => layer.id);
  };

  // すべてのレイヤーを選択/解除
  const toggleAllLayers = (select: boolean = true) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => ({ ...layer, isSelected: select }))
    );
  };

  return {
    layers,
    toggleLayer,
    getSelectedLayerIds,
    toggleAllLayers,
  };
}; 