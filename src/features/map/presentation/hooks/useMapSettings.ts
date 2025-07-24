import { useMapStore, mapSelectors } from '../../application/map-store';

/**
 * 地図の設定管理フック
 * mapType、表示オプションなどの設定を管理
 */
export const useMapSettings = () => {
  const settings = useMapStore(mapSelectors.settings);
  const updateMapType = useMapStore((state) => state.updateMapType);
  const updateSettings = useMapStore((state) => state.updateSettings);
  const resetToDefaults = useMapStore((state) => state.resetToDefaults);

  return {
    settings,
    mapType: settings.mapType,
    showUserLocation: settings.showUserLocation,
    showCompass: settings.showCompass,
    showScale: settings.showScale,
    updateMapType,
    updateSettings,
    resetToDefaults,
  };
};