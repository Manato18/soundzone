import TrackPlayer, {
    Capability
} from 'react-native-track-player';

export const trackPlayerSetup = async (): Promise<boolean> => {
  let isSetupDone = false;

  try {
    // TrackPlayerが既に設定されているかチェック
    await TrackPlayer.getActiveTrack();
    isSetupDone = true;
  } catch {
    // まだ設定されていない場合
    try {
      await TrackPlayer.setupPlayer();

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
      });

      isSetupDone = true;
    } catch (error) {
      console.error('TrackPlayer setup failed:', error);
      isSetupDone = false;
    }
  }

  return isSetupDone;
}; 