import { useMemo } from 'react';
import { useAudioPinsQuery } from './useAudioPinsQuery';

interface UseFilteredAudioPinsParams {
  layerIds?: string[];
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  enabled?: boolean;
}

/**
 * レイヤーIDでフィルタリングされた音声ピンを取得するフック
 * クライアントサイドでフィルタリングを行うことで、レイヤー切替時のちらつきを防ぐ
 */
export const useFilteredAudioPins = (params?: UseFilteredAudioPinsParams) => {
  const { layerIds, bounds, enabled } = params || {};
  
  // 全てのピンを取得（layerIdsは含めない）
  const queryResult = useAudioPinsQuery({ bounds, enabled });
  const { data: allPins, ...restQueryResult } = queryResult;
  
  // クライアントサイドでレイヤーフィルタリング
  const filteredPins = useMemo(() => {
    if (!allPins) return [];
    
    // レイヤーIDが指定されていない場合は全てのピンを返す
    if (!layerIds || layerIds.length === 0) {
      return allPins;
    }
    
    // 指定されたレイヤーIDに属するピンのみをフィルタリング
    return allPins.filter(pin => 
      pin.layerIds.some(pinLayerId => layerIds.includes(pinLayerId))
    );
  }, [allPins, layerIds]);
  
  // デバッグログ（コメントアウト）
  // if (__DEV__) {
  //   console.log(`[useFilteredAudioPins] Total pins: ${allPins?.length || 0}, Filtered pins: ${filteredPins.length}`);
  // }
  
  return {
    ...restQueryResult,
    data: filteredPins,
  };
};