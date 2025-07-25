import { create } from 'zustand';
import { createJSONStorage, devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StorageKeys } from '../../../constants/StorageKeys';
import { Layer } from '../domain/entities/Layer';
import { mmkvStorage } from '../../../shared/infra/storage/mmkvStorage';

// Zustand ストアの状態定義
interface LayersState {
  // サーバー状態（将来的にTanStack Queryで管理予定）
  availableLayers: Layer[];
  
  // UI状態
  selectedLayerIds: string[];
  isLoading: boolean;
  error: string | null;
  
  // 設定（永続化対象）
  settings: {
    favoriteLayerIds: string[];
    defaultLayerIds: string[];
    showAllByDefault: boolean;
  };
}

// アクション定義
interface LayersActions {
  // レイヤー選択
  toggleLayer: (layerId: string) => void;
  toggleAllLayers: (select: boolean) => void;
  setSelectedLayerIds: (layerIds: string[]) => void;
  
  // お気に入り管理
  toggleFavoriteLayer: (layerId: string) => void;
  setFavoriteLayerIds: (layerIds: string[]) => void;
  
  // デフォルト設定
  setDefaultLayerIds: (layerIds: string[]) => void;
  
  // サーバー状態（将来的にTanStack Queryから更新）
  setAvailableLayers: (layers: Layer[]) => void;
  
  // UI状態
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 設定
  updateSettings: (settings: Partial<LayersState['settings']>) => void;
  
  // 初期化・リセット
  initializeSelectedLayers: () => void;
  resetToDefaults: () => void;
}

// ストア型定義
export type LayersStore = LayersState & LayersActions;

// 永続化する部分の型定義
type PersistedState = {
  settings: LayersState['settings'];
  selectedLayerIds: string[];
};

// MMKV ストレージアダプター
const layersStorage = createJSONStorage<PersistedState>(() => mmkvStorage);

// Zustand ストア
export const useLayersStore = create<LayersStore>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set) => ({
          // 初期状態
          availableLayers: [],
          selectedLayerIds: [],
          isLoading: false,
          error: null,
          settings: {
            favoriteLayerIds: [],
            defaultLayerIds: [],
            showAllByDefault: true,
          },
          
          // アクション実装
          toggleLayer: (layerId) => set((state) => {
            const index = state.selectedLayerIds.indexOf(layerId);
            if (index >= 0) {
              state.selectedLayerIds.splice(index, 1);
            } else {
              state.selectedLayerIds.push(layerId);
            }
          }),
          
          toggleAllLayers: (select) => set((state) => {
            if (select) {
              state.selectedLayerIds = state.availableLayers.map(layer => layer.id);
            } else {
              state.selectedLayerIds = [];
            }
          }),
          
          setSelectedLayerIds: (layerIds) => set((state) => {
            state.selectedLayerIds = layerIds;
          }),
          
          toggleFavoriteLayer: (layerId) => set((state) => {
            const index = state.settings.favoriteLayerIds.indexOf(layerId);
            if (index >= 0) {
              state.settings.favoriteLayerIds.splice(index, 1);
            } else {
              state.settings.favoriteLayerIds.push(layerId);
            }
          }),
          
          setFavoriteLayerIds: (layerIds) => set((state) => {
            state.settings.favoriteLayerIds = layerIds;
          }),
          
          setDefaultLayerIds: (layerIds) => set((state) => {
            state.settings.defaultLayerIds = layerIds;
          }),
          
          setAvailableLayers: (layers) => set((state) => {
            state.availableLayers = layers;
          }),
          
          setLoading: (isLoading) => set((state) => {
            state.isLoading = isLoading;
          }),
          
          setError: (error) => set((state) => {
            state.error = error;
          }),
          
          updateSettings: (settings) => set((state) => {
            state.settings = { ...state.settings, ...settings };
          }),
          
          initializeSelectedLayers: () => set((state) => {
            // デフォルトレイヤーIDがある場合はそれを使用、なければ全レイヤーを選択
            if (state.settings.defaultLayerIds.length > 0) {
              state.selectedLayerIds = state.settings.defaultLayerIds;
            } else if (state.settings.showAllByDefault) {
              state.selectedLayerIds = state.availableLayers.map(layer => layer.id);
            }
          }),
          
          resetToDefaults: () => set((state) => {
            state.selectedLayerIds = state.settings.defaultLayerIds;
            state.error = null;
          }),
        }))
      ),
      {
        name: StorageKeys.LAYERS.SETTINGS,
        storage: layersStorage,
        partialize: (state) => ({
          settings: state.settings,
          selectedLayerIds: state.selectedLayerIds,
        }),
      }
    ),
    {
      name: 'layers-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// セレクター（パフォーマンス最適化のため）
export const layersSelectors = {
  // 選択されたレイヤーのみ取得
  getSelectedLayers: (state: LayersStore): Layer[] => {
    return state.availableLayers.filter(layer => 
      state.selectedLayerIds.includes(layer.id)
    );
  },
  
  // お気に入りレイヤーのみ取得
  getFavoriteLayers: (state: LayersStore): Layer[] => {
    return state.availableLayers.filter(layer => 
      state.settings.favoriteLayerIds.includes(layer.id)
    );
  },
  
  // レイヤーが選択されているか確認
  isLayerSelected: (layerId: string) => (state: LayersStore): boolean => {
    return state.selectedLayerIds.includes(layerId);
  },
  
  // レイヤーがお気に入りか確認
  isLayerFavorite: (layerId: string) => (state: LayersStore): boolean => {
    return state.settings.favoriteLayerIds.includes(layerId);
  },
};