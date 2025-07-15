import { useState } from 'react';
import { AudioPin } from '../../domain/entities/AudioPin';

// 京都付近の音声ピンデータ（現在はハードコード）
const AUDIO_PINS: AudioPin[] = [
  {
    id: '1',
    title: '1個目のピン',
    userName: 'Andrew Daniels',
    userImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin1.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0116,
    longitude: 135.7681, // 京都市中心部（京都駅付近）
  },
  {
    id: '2',
    title: '2個目のピン',
    userName: 'Sarah Johnson',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin2.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0395,
    longitude: 135.7290, // 清水寺付近
  },
  {
    id: '3',
    title: '3個目のピン',
    userName: 'Mike Chen',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin3.wav'),
    description: 'samplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesamplesample',
    latitude: 35.0394,
    longitude: 135.7290, // 伏見稲荷付近
  },
];

export const useAudioPins = () => {
  const [selectedAudio, setSelectedAudio] = useState<AudioPin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ピンタップ時のハンドラー
  const handlePinPress = (audioData: AudioPin) => {
    console.log('handlePinPress called with:', audioData.title);
    setSelectedAudio(audioData);
    setModalVisible(true);
    console.log('Modal should be visible now');
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    console.log('handleCloseModal called');
    setModalVisible(false);
    setSelectedAudio(null);
  };

  return {
    audioPins: AUDIO_PINS,
    selectedAudio,
    modalVisible,
    handlePinPress,
    handleCloseModal,
  };
}; 