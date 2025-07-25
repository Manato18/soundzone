import { useCallback } from 'react';
import { AudioPin } from '../../domain/entities/AudioPin';
import { 
  useSelectedPin, 
  useModalVisible, 
  useAudioPinActions 
} from '../../application/audioPin-store';
import { useFilteredAudioPins } from './read/useFilteredAudioPins';

interface UseAudioPinsParams {
  layerIds?: string[];
}

export const useAudioPins = (params?: UseAudioPinsParams) => {
  // ストアから状態を取得
  const selectedAudio = useSelectedPin();
  const modalVisible = useModalVisible();
  const { selectPin, clearSelectedPin } = useAudioPinActions();
  
  // フィルタリングされたピンデータを取得
  const { 
    data: audioPins = [], 
    isLoading, 
    error 
  } = useFilteredAudioPins({
    layerIds: params?.layerIds,
  });

  // ピンタップ時のハンドラー
  const handlePinPress = useCallback((audioData: AudioPin) => {
    console.log('handlePinPress called with:', audioData.title);
    selectPin(audioData);
    console.log('Modal should be visible now');
  }, [selectPin]);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    console.log('handleCloseModal called');
    clearSelectedPin();
  }, [clearSelectedPin]);

  return {
    audioPins,
    selectedAudio,
    modalVisible,
    handlePinPress,
    handleCloseModal,
    isLoading,
    error,
  };
}; 