import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { storage } from '../../../shared/infra/storage/mmkvStorage';
import { LocationError, UserLocationData } from '../domain/entities/Location';

/**
 * 位置情報状態の型定義
 * StateManagement.md の規約に基づいて分類
 */
export interface LocationState {
  // ========== サーバー状態 ==========
  // （現在はローカルの位置情報APIを使用しているが、将来的にサーバー連携も想定）
  currentLocation: UserLocationData | null;
  
  // ========== UI状態 ==========
  isLoading: boolean;
  error: string | null;
  isLocationEnabled: boolean;
  isTracking: boolean;
  
  // ========== 設定（永続化対象） ==========
  settings: {
    locationUpdateInterval: number; // ミリ秒単位
    highAccuracyMode: boolean;
    distanceFilter: number; // メートル単位
    headingUpdateInterval: number; // ミリ秒単位（方向情報の更新間隔）
  };
}

/**
 * 位置情報アクション
 */
export interface LocationActions {
  // 位置情報の更新
  setCurrentLocation: (location: UserLocationData | null) => void;
  updateHeading: (heading: number | null) => void;
  
  // UI状態の更新
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setIsLocationEnabled: (enabled: boolean) => void;
  setIsTracking: (tracking: boolean) => void;
  
  // 設定の更新
  updateLocationSettings: (settings: Partial<LocationState['settings']>) => void;
  
  // 複合アクション
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  handleLocationError: (error: LocationError) => void;
  
  // 状態のリセット
  resetLocationState: () => void;
}

/**
 * 初期状態
 */
export const initialLocationState: LocationState = {
  // サーバー状態
  currentLocation: null,
  
  // UI状態
  isLoading: false,
  error: null,
  isLocationEnabled: false,
  isTracking: false,
  
  // 設定（デフォルト値）
  settings: {
    locationUpdateInterval: 2000, // 2秒
    highAccuracyMode: true,
    distanceFilter: 5, // 5メートル
    headingUpdateInterval: 100, // 100ミリ秒（0.1秒）
  },
};

// 結合した型
type LocationStore = LocationState & LocationActions;

/**
 * Zustand ストアの作成
 * StateManagement.md の middleware 順序に従う:
 * devtools → persist → immer
 */
export const useLocationStore = create<LocationStore>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set) => ({
        // ========== 初期状態 ==========
        ...initialLocationState,

        // ========== アクション ==========
        // 位置情報の更新
        setCurrentLocation: (location) => set((state) => {
          state.currentLocation = location;
        }),

        // 方向情報のみ更新（nullの場合は前の値を保持）
        updateHeading: (heading) => set((state) => {
          if (state.currentLocation && heading !== null) {
            state.currentLocation.coords.heading = heading;
          }
        }),

        // UI状態の更新
        setIsLoading: (isLoading) => set((state) => {
          state.isLoading = isLoading;
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        setIsLocationEnabled: (enabled) => set((state) => {
          state.isLocationEnabled = enabled;
        }),

        setIsTracking: (tracking) => set((state) => {
          state.isTracking = tracking;
        }),

        // 設定の更新
        updateLocationSettings: (settings) => set((state) => {
          state.settings = { ...state.settings, ...settings };
        }),

        // 複合アクション
        startLocationTracking: () => set((state) => {
          state.isTracking = true;
          state.error = null;
        }),

        stopLocationTracking: () => set((state) => {
          state.isTracking = false;
        }),

        handleLocationError: (error) => set((state) => {
          state.error = error.message;
          state.isLoading = false;
          state.isTracking = false;
          
          // エラーコードに応じた追加処理
          if (error.code === 'PERMISSION_DENIED' || error.code === 'SERVICES_DISABLED') {
            state.isLocationEnabled = false;
          }
        }),

        // 状態のリセット
        resetLocationState: () => set(() => ({
          ...initialLocationState,
        })),
      })),
      ),
      {
        name: 'location-settings',
        storage: {
          getItem: (name) => {
            const value = storage.getString(name);
            return value ? JSON.parse(value) : null;
          },
          setItem: (name, value) => {
            storage.set(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            storage.delete(name);
          },
        },
        // 永続化対象：設定のみ（StateManagement.mdの規約に従う）
        partialize: (state) => ({
          settings: state.settings,
        }) as any,
      },
    ),
    {
      name: 'location-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

// ========== セレクターフック ==========
// StateManagement.md の規約に従い、shallow比較を使用して再描画を最小化

/**
 * 現在の位置情報を取得
 */
export const useCurrentLocation = () => 
  useLocationStore((state) => state.currentLocation);

/**
 * 位置情報関連のUI状態を取得
 */
export const useLocationUIState = () => {
  const isLoading = useLocationStore((state) => state.isLoading);
  const error = useLocationStore((state) => state.error);
  const isLocationEnabled = useLocationStore((state) => state.isLocationEnabled);
  const isTracking = useLocationStore((state) => state.isTracking);
  
  return {
    isLoading,
    error,
    isLocationEnabled,
    isTracking,
  };
};

/**
 * 位置情報設定を取得
 */
export const useLocationSettings = () => 
  useLocationStore((state) => state.settings);

/**
 * 位置情報のロード状態を取得
 */
export const useIsLocationLoading = () => 
  useLocationStore((state) => state.isLoading);

/**
 * 位置情報のエラー状態を取得
 */
export const useLocationError = () => 
  useLocationStore((state) => state.error);

/**
 * 位置情報の有効化状態を取得
 */
export const useIsLocationEnabled = () => 
  useLocationStore((state) => state.isLocationEnabled);

/**
 * 位置情報の追跡状態を取得
 */
export const useIsLocationTracking = () => 
  useLocationStore((state) => state.isTracking);

/**
 * 位置情報関連のアクションを取得
 */
export const useLocationActions = () => {
  const setCurrentLocation = useLocationStore((state) => state.setCurrentLocation);
  const setIsLoading = useLocationStore((state) => state.setIsLoading);
  const setError = useLocationStore((state) => state.setError);
  const setIsLocationEnabled = useLocationStore((state) => state.setIsLocationEnabled);
  const setIsTracking = useLocationStore((state) => state.setIsTracking);
  const updateLocationSettings = useLocationStore((state) => state.updateLocationSettings);
  const startLocationTracking = useLocationStore((state) => state.startLocationTracking);
  const stopLocationTracking = useLocationStore((state) => state.stopLocationTracking);
  const handleLocationError = useLocationStore((state) => state.handleLocationError);
  const resetLocationState = useLocationStore((state) => state.resetLocationState);
  
  return {
    setCurrentLocation,
    setIsLoading,
    setError,
    setIsLocationEnabled,
    setIsTracking,
    updateLocationSettings,
    startLocationTracking,
    stopLocationTracking,
    handleLocationError,
    resetLocationState,
  };
};