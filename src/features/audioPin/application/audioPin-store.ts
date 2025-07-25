import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AudioPin, AudioPlaybackState } from '../domain/entities/AudioPin';
import { mmkvStorage } from '../../../shared/infra/storage/mmkvStorage';
import { StorageKeys } from '../../../constants/StorageKeys';

interface AudioPinState {
  // UI状態
  selectedPin: AudioPin | null;
  isModalVisible: boolean;
  playbackState: AudioPlaybackState;
  playingPinId: string | null; // 現在再生中のピンID
  
  // 設定（永続化対象）
  settings: {
    autoPlayOnPinTap: boolean;
    playbackSpeed: number;
    showPinDetails: boolean;
    volume: number;
  };
  
  // アクション
  selectPin: (pin: AudioPin) => void;
  clearSelectedPin: () => void;
  setModalVisible: (visible: boolean) => void;
  updatePlaybackState: (state: Partial<AudioPlaybackState>) => void;
  updateSettings: (settings: Partial<AudioPinState['settings']>) => void;
  
  // 再生管理アクション
  startPlayback: (pinId: string) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
}

const initialPlaybackState: AudioPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

const initialSettings = {
  autoPlayOnPinTap: true,
  playbackSpeed: 1.0,
  showPinDetails: true,
  volume: 1.0,
};

export const useAudioPinStore = create<AudioPinState>()(
  devtools(
    persist(
      immer((set) => ({
        // UI状態
        selectedPin: null,
        isModalVisible: false,
        playbackState: initialPlaybackState,
        playingPinId: null,
        
        // 設定
        settings: initialSettings,
        
        // アクション
        selectPin: (pin) => set((state) => {
          state.selectedPin = pin;
          state.isModalVisible = true;
          state.playbackState = initialPlaybackState;
          if (__DEV__) {
            console.log(`[AudioPinStore] Selected pin: ${pin.title}`);
          }
        }),
        
        clearSelectedPin: () => set((state) => {
          state.selectedPin = null;
          state.isModalVisible = false;
          state.playbackState = initialPlaybackState;
          state.playingPinId = null;
          if (__DEV__) {
            console.log('[AudioPinStore] Cleared selected pin');
          }
        }),
        
        setModalVisible: (visible) => set((state) => {
          state.isModalVisible = visible;
          if (!visible) {
            state.playbackState = initialPlaybackState;
            state.playingPinId = null;
          }
        }),
        
        updatePlaybackState: (newState) => set((state) => {
          state.playbackState = { ...state.playbackState, ...newState };
        }),
        
        updateSettings: (newSettings) => set((state) => {
          state.settings = { ...state.settings, ...newSettings };
          if (__DEV__) {
            console.log('[AudioPinStore] Updated settings:', newSettings);
          }
        }),
        
        // 再生管理アクション
        startPlayback: (pinId) => set((state) => {
          state.playingPinId = pinId;
          state.playbackState.isPlaying = true;
          if (__DEV__) {
            console.log(`[AudioPinStore] Started playback for pin: ${pinId}`);
          }
        }),
        
        pausePlayback: () => set((state) => {
          state.playbackState.isPlaying = false;
          if (__DEV__) {
            console.log('[AudioPinStore] Paused playback');
          }
        }),
        
        stopPlayback: () => set((state) => {
          state.playingPinId = null;
          state.playbackState = initialPlaybackState;
          if (__DEV__) {
            console.log('[AudioPinStore] Stopped playback');
          }
        }),
        
        seekTo: (time) => set((state) => {
          state.playbackState.currentTime = time;
          if (__DEV__) {
            console.log(`[AudioPinStore] Seeked to: ${time}s`);
          }
        }),
        
        setVolume: (volume) => set((state) => {
          state.settings.volume = Math.max(0, Math.min(1, volume));
          if (__DEV__) {
            console.log(`[AudioPinStore] Set volume to: ${volume}`);
          }
        }),
      })),
      {
        name: StorageKeys.AUDIO_PIN.SETTINGS,
        storage: mmkvStorage,
        partialize: (state) => ({ settings: state.settings }) as Partial<AudioPinState>,
      }
    ),
    { name: 'audioPin-store' }
  )
);

// セレクターフック
export const useSelectedPin = () => useAudioPinStore((state) => state.selectedPin);
export const useModalVisible = () => useAudioPinStore((state) => state.isModalVisible);
export const usePlaybackState = () => useAudioPinStore((state) => state.playbackState);
export const usePlayingPinId = () => useAudioPinStore((state) => state.playingPinId);
export const useAudioPinSettings = () => useAudioPinStore((state) => state.settings);

// アクションフック（shallow比較で最適化）
export const useAudioPinActions = () => {
  const selectPin = useAudioPinStore((state) => state.selectPin);
  const clearSelectedPin = useAudioPinStore((state) => state.clearSelectedPin);
  const setModalVisible = useAudioPinStore((state) => state.setModalVisible);
  const updatePlaybackState = useAudioPinStore((state) => state.updatePlaybackState);
  const updateSettings = useAudioPinStore((state) => state.updateSettings);
  
  return {
    selectPin,
    clearSelectedPin,
    setModalVisible,
    updatePlaybackState,
    updateSettings,
  };
};

export const usePlaybackActions = () => {
  const startPlayback = useAudioPinStore((state) => state.startPlayback);
  const pausePlayback = useAudioPinStore((state) => state.pausePlayback);
  const stopPlayback = useAudioPinStore((state) => state.stopPlayback);
  const seekTo = useAudioPinStore((state) => state.seekTo);
  const setVolume = useAudioPinStore((state) => state.setVolume);
  
  return {
    startPlayback,
    pausePlayback,
    stopPlayback,
    seekTo,
    setVolume,
  };
};