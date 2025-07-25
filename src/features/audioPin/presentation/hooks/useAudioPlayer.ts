import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Event, State, Track } from 'react-native-track-player';
import { AudioPin } from '../../domain/entities/AudioPin';
import { audioService } from '../../infrastructure/services/AudioService';
import {
  useAudioPinStore,
  usePlaybackActions,
  useAudioPinActions,
  usePlaybackState as useZustandPlaybackState,
  useSelectedPin,
  useAudioPinSettings,
} from '../../application/audioPin-store';

/**
 * useAudioPlayer - Presentation層のカスタムフック
 * StateManagement.mdの設計原則に従い、各レイヤーを統合
 * Infrastructure層（AudioService）とApplication層（Zustand）を橋渡し
 */
export const useAudioPlayer = () => {
  const isMountedRef = useRef(true);
  
  // Zustandストアから状態とアクションを取得
  const selectedPin = useSelectedPin();
  const playbackState = useZustandPlaybackState();
  const settings = useAudioPinSettings();
  const {
    startPlayback,
    pausePlayback,
    stopPlayback,
    seekTo: seekToStore,
  } = usePlaybackActions();
  
  const { updatePlaybackState } = useAudioPinActions();

  // マウント状態の管理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * 音声を再生
   */
  const play = useCallback(async (audioPin: AudioPin) => {
    try {
      const track: Track = {
        id: audioPin.id,
        url: audioPin.audioUrl,
        title: audioPin.title,
        artist: audioPin.userName,
        artwork: audioPin.userImage,
      };

      await audioService.play(track);
      
      if (isMountedRef.current) {
        startPlayback(audioPin.id);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error playing audio:', error);
      if (isMountedRef.current) {
        stopPlayback();
      }
      throw error;
    }
  }, [startPlayback, stopPlayback]);

  /**
   * 音声を一時停止
   */
  const pause = useCallback(async () => {
    try {
      await audioService.pause();
      if (isMountedRef.current) {
        pausePlayback();
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error pausing audio:', error);
      throw error;
    }
  }, [pausePlayback]);

  /**
   * 音声を再開
   */
  const resume = useCallback(async () => {
    try {
      await audioService.resume();
      if (isMountedRef.current && selectedPin) {
        startPlayback(selectedPin.id);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error resuming audio:', error);
      throw error;
    }
  }, [startPlayback, selectedPin]);

  /**
   * 音声を停止
   */
  const stop = useCallback(async () => {
    try {
      await audioService.stop();
      if (isMountedRef.current) {
        stopPlayback();
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error stopping audio:', error);
    }
  }, [stopPlayback]);

  /**
   * 再生/一時停止をトグル
   */
  const togglePlayback = useCallback(async () => {
    try {
      const state = await audioService.getState();
      
      if (state === State.Playing) {
        await pause();
      } else if (state === State.Paused) {
        await resume();
      } else if (selectedPin) {
        await play(selectedPin);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error toggling playback:', error);
    }
  }, [pause, resume, play, selectedPin]);

  /**
   * 指定位置にシーク
   */
  const seekTo = useCallback(async (position: number) => {
    try {
      await audioService.seekTo(position);
      if (isMountedRef.current) {
        seekToStore(position);
      }
    } catch (error) {
      console.error('[useAudioPlayer] Error seeking:', error);
    }
  }, [seekToStore]);

  /**
   * 10秒スキップ（前後）
   */
  const skipBackward = useCallback(async () => {
    try {
      const progress = await audioService.getProgress();
      const newPosition = Math.max(0, progress.position - 10);
      await seekTo(newPosition);
    } catch (error) {
      console.error('[useAudioPlayer] Error skipping backward:', error);
    }
  }, [seekTo]);

  const skipForward = useCallback(async () => {
    try {
      const progress = await audioService.getProgress();
      const newPosition = Math.min(progress.duration, progress.position + 10);
      await seekTo(newPosition);
    } catch (error) {
      console.error('[useAudioPlayer] Error skipping forward:', error);
    }
  }, [seekTo]);

  /**
   * TrackPlayerイベントリスナーの設定
   */
  useEffect(() => {
    const subscriptions = [
      // 再生状態の変更を監視
      audioService.addEventListener(Event.PlaybackState, async (data) => {
        if (!isMountedRef.current) return;
        
        const isPlaying = data.state === State.Playing;
        updatePlaybackState({ isPlaying });
      }),

      // 再生進捗の更新を監視
      audioService.addEventListener(Event.PlaybackProgressUpdated, async (data) => {
        if (!isMountedRef.current) return;
        
        updatePlaybackState({
          currentTime: data.position,
          duration: data.duration,
        });
      }),

      // エラーを監視
      audioService.addEventListener(Event.PlaybackError, async (error) => {
        console.error('[useAudioPlayer] Playback error:', error);
        if (isMountedRef.current) {
          stopPlayback();
        }
      }),
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [updatePlaybackState, stopPlayback]);

  /**
   * バックグラウンド処理
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && playbackState.isPlaying) {
        await pause();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [playbackState.isPlaying, pause]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時に音声を停止
      audioService.stop().catch(error => {
        console.error('[useAudioPlayer] Error during cleanup:', error);
      });
    };
  }, []);

  return {
    // 状態
    isPlaying: playbackState.isPlaying,
    currentTime: playbackState.currentTime,
    duration: playbackState.duration,
    selectedPin,
    settings,
    
    // アクション
    play,
    pause,
    resume,
    stop,
    togglePlayback,
    seekTo,
    skipBackward,
    skipForward,
  };
};