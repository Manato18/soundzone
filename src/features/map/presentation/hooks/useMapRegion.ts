import { useMapStore } from '../../application/map-store';

/**
 * 地図のリージョン管理フック
 * 既存のインターフェースを維持しながら、内部でZustandストアを使用
 */
export const useMapRegion = () => {
  const region = useMapStore((state) => state.region);
  const updateRegion = useMapStore((state) => state.updateRegion);

  return {
    region,
    updateRegion,
  };
}; 