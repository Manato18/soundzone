import { useMemo } from 'react';
import { AudioPin } from '../../domain/entities/AudioPin';

interface UseAudioPinFilteringProps {
  pins: AudioPin[];
  selectedLayerIds: string[];
}

export const useAudioPinFiltering = ({ pins, selectedLayerIds }: UseAudioPinFilteringProps) => {
  const filteredPins = useMemo(() => {
    // レイヤーが何も選択されていない場合はすべてのピンを表示
    if (selectedLayerIds.length === 0) {
      return pins;
    }

    // 選択されたレイヤーのいずれかに属するピンのみを表示
    return pins.filter(pin => 
      pin.layerIds.some(layerId => selectedLayerIds.includes(layerId))
    );
  }, [pins, selectedLayerIds]);

  return {
    filteredPins,
  };
}; 