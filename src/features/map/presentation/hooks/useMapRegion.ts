import { useState } from 'react';
import { MapRegion } from '../../domain/entities/MapRegion';

export const useMapRegion = () => {
  const [region, setRegion] = useState<MapRegion>({
    latitude: 35.0116, // 京都を初期表示
    longitude: 135.7681,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const updateRegion = (newRegion: MapRegion) => {
    setRegion(newRegion);
  };

  return {
    region,
    updateRegion,
  };
}; 