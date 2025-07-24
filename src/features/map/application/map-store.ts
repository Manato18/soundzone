import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { MMKV } from 'react-native-mmkv';
import { MapRegion } from '../domain/entities/MapRegion';
import { StorageKeys } from '../../../constants/StorageKeys';

/**
 * 地図関連の状態管理
 * StateManagement.mdの規約に基づいて実装
 */

// MMKVインスタンス
const storage = new MMKV();

// ストレージアダプター（StorageValue型に対応）
const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    storage.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => storage.delete(name),
};

// 地図タイプの定義
export type MapType = 'standard' | 'satellite' | 'hybrid';

// UI状態と設定の型定義
interface MapState {
  // UI状態（非永続化）
  region: MapRegion;
  zoomLevel: number;
  isFollowingUser: boolean; // ユーザー位置に追従中かどうか
  
  // 設定（永続化対象）
  settings: {
    mapType: MapType;
    showUserLocation: boolean;
    showCompass: boolean;
    showScale: boolean;
    defaultZoomLevel: number;
  };
  
  // アクション
  updateRegion: (region: MapRegion) => void;
  updateZoomLevel: (zoomLevel: number) => void;
  setIsFollowingUser: (isFollowing: boolean) => void;
  updateMapType: (mapType: MapType) => void;
  updateSettings: (settings: Partial<MapState['settings']>) => void;
  resetToDefaults: () => void;
}

// 永続化する部分の型定義
type PersistedState = {
  settings: MapState['settings'];
};

// 初期値
const initialState = {
  region: {
    latitude: 35.0116, // 京都を初期表示
    longitude: 135.7681,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
  zoomLevel: 15, // おおよそのズームレベル
  isFollowingUser: false,
  settings: {
    mapType: 'standard' as MapType,
    showUserLocation: true,
    showCompass: true,
    showScale: true,
    defaultZoomLevel: 15,
  },
};

export const useMapStore = create<MapState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        
        updateRegion: (region) => set((state) => {
          state.region = region;
          // regionから概算のズームレベルを計算
          // deltaが小さいほどズームレベルが高い
          const avgDelta = (region.latitudeDelta + region.longitudeDelta) / 2;
          state.zoomLevel = Math.round(Math.log2(360 / avgDelta));
        }),
        
        updateZoomLevel: (zoomLevel) => set((state) => {
          state.zoomLevel = zoomLevel;
        }),
        
        setIsFollowingUser: (isFollowing) => set((state) => {
          state.isFollowingUser = isFollowing;
          if (__DEV__) {
            console.log(`[MapStore] 追従モード: ${isFollowing ? 'ON' : 'OFF'}`);
          }
        }),
        
        updateMapType: (mapType) => set((state) => {
          state.settings.mapType = mapType;
        }),
        
        updateSettings: (settings) => set((state) => {
          state.settings = { ...state.settings, ...settings };
        }),
        
        resetToDefaults: () => set(() => ({
          ...initialState,
        })),
      })),
      {
        name: StorageKeys.MAP.SETTINGS,
        storage: mmkvStorage,
        partialize: (state) => ({
          settings: state.settings,
        }) as MapState,
      }
    ),
    {
      name: 'map-store',
    }
  )
);

// セレクターヘルパー関数
export const mapSelectors = {
  region: (state: MapState) => state.region,
  zoomLevel: (state: MapState) => state.zoomLevel,
  isFollowingUser: (state: MapState) => state.isFollowingUser,
  settings: (state: MapState) => state.settings,
  mapType: (state: MapState) => state.settings.mapType,
  showUserLocation: (state: MapState) => state.settings.showUserLocation,
};