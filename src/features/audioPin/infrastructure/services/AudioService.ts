import TrackPlayer, {
  Track,
  State,
  Event,
  Capability,
  AppKilledPlaybackBehavior,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
} from 'react-native-track-player';

/**
 * AudioService - Infrastructure層
 * TrackPlayerの操作を抽象化し、音声再生機能を提供
 * StateManagement.mdのレイヤー責務に従い、SDKの直接操作はこのクラスに集約
 */
export class AudioService {
  private static instance: AudioService;
  private isInitialized = false;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * TrackPlayerを初期化
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      await TrackPlayer.setupPlayer();
      
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
        ],
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[AudioService] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * 現在の再生状態を取得
   */
  async getState(): Promise<State> {
    return await TrackPlayer.getState();
  }

  /**
   * 音声トラックを追加して再生
   */
  async play(track: Track): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AudioService not initialized');
      }
    }

    // 既存のトラックをクリア
    await TrackPlayer.reset();
    
    // 新しいトラックを追加
    await TrackPlayer.add(track);
    
    // 再生開始
    await TrackPlayer.play();
  }

  /**
   * 再生を一時停止
   */
  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  /**
   * 再生を再開
   */
  async resume(): Promise<void> {
    await TrackPlayer.play();
  }

  /**
   * 再生を停止してリセット
   */
  async stop(): Promise<void> {
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch (error) {
      console.error('[AudioService] Error stopping audio:', error);
    }
  }

  /**
   * 指定位置にシーク
   */
  async seekTo(position: number): Promise<void> {
    await TrackPlayer.seekTo(position);
  }

  /**
   * 現在の再生位置を取得
   */
  async getProgress() {
    return await TrackPlayer.getProgress();
  }

  /**
   * イベントリスナーを追加
   */
  addEventListener(event: Event, listener: (...args: any[]) => void) {
    return TrackPlayer.addEventListener(event, listener);
  }

  /**
   * サービスをクリーンアップ
   */
  async destroy(): Promise<void> {
    try {
      await this.stop();
      this.isInitialized = false;
    } catch (error) {
      console.error('[AudioService] Error during cleanup:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const audioService = AudioService.getInstance();