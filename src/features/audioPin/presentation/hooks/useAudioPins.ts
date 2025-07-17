import { useState } from 'react';
import { AudioPin } from '../../domain/entities/AudioPin';

// 京都付近の音声ピンデータ（現在はハードコード）
const AUDIO_PINS: AudioPin[] = [
  {
    id: '1',
    title: '京都駅の音風景',
    userName: 'Andrew Daniels',
    userImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin1.wav'),
    description: '京都駅周辺の賑やかな音を収録しました。新幹線の音や人々の声が聞こえます。',
    latitude: 35.0116,
    longitude: 135.7681, // 京都市中心部（京都駅付近）
    layerIds: ['layer-tourism'], // 観光地レイヤー
  },
  {
    id: '2',
    title: '清水寺の鐘の音',
    userName: 'Sarah Johnson',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin2.wav'),
    description: '清水寺の美しい鐘の音と、参拝者の足音を録音しました。',
    latitude: 35.0395,
    longitude: 135.7290, // 清水寺付近
    layerIds: ['layer-culture', 'layer-tourism'], // 文化と観光地レイヤー
  },
  {
    id: '3',
    title: '伏見稲荷の自然音',
    userName: 'Mike Chen',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../../assets/sounds/pin3.wav'),
    description: '伏見稲荷大社の千本鳥居を歩く音と、鳥のさえずりを収録しました。',
    latitude: 35.0394,
    longitude: 135.7290, // 伏見稲荷付近
    layerIds: ['layer-culture', 'layer-nature'], // 文化と自然レイヤー
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