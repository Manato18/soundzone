import { DEFAULT_LAYERS, Layer } from '../entities/Layer';

/**
 * レイヤーIDの配列から対応するレイヤー情報を取得する
 * @param layerIds レイヤーIDの配列
 * @returns 対応するレイヤー情報の配列
 */
export const getLayersByIds = (layerIds: string[]): Omit<Layer, 'isSelected'>[] => {
  return DEFAULT_LAYERS.filter(layer => layerIds.includes(layer.id));
};

/**
 * 単一のレイヤーIDからレイヤー情報を取得する
 * @param layerId レイヤーID
 * @returns 対応するレイヤー情報、見つからない場合はundefined
 */
export const getLayerById = (layerId: string): Omit<Layer, 'isSelected'> | undefined => {
  return DEFAULT_LAYERS.find(layer => layer.id === layerId);
}; 