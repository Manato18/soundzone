import { useCallback, useEffect, useState } from 'react';
import { getLocalAudioPins, LocalAudioPin } from '../../../recording/services/localStorageService';
import { AudioPin } from '../../domain/entities/AudioPin';

// 仮のユーザー画像（実際の実装では、profilesテーブルから取得）
const DEFAULT_USER_IMAGE = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';

// LocalAudioPinをAudioPinに変換する関数
const convertLocalPinToAudioPin = (localPin: LocalAudioPin): AudioPin => ({
  id: localPin.id,
  title: localPin.title,
  userName: 'あなた', // ローカル保存なので固定
  userImage: DEFAULT_USER_IMAGE,
  audioUrl: { uri: localPin.audioUri }, // ローカルファイルパス
  description: localPin.description || '',
  latitude: localPin.latitude || 35.6762, // デフォルト位置（東京）
  longitude: localPin.longitude || 139.6503,
  layerIds: ['layer-user-generated'],
  createdAt: new Date(localPin.createdAt),
});

export const useAudioPins = () => {
  const [audioPins, setAudioPins] = useState<AudioPin[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioPin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ローカルからオーディオピンを取得
  const fetchAudioPins = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ローカルストレージからデータを取得
      const localPins = await getLocalAudioPins();
      
      // ローカルピンをAudioPin形式に変換
      const convertedPins = localPins.map(convertLocalPinToAudioPin);

      // フォールバック用のサンプルデータを追加（デモ用）
      const samplePins: AudioPin[] = [
        {
          id: 'sample-1',
          title: '京都駅の音風景',
          userName: 'Andrew Daniels',
          userImage: DEFAULT_USER_IMAGE,
          audioUrl: require('../../../../../assets/sounds/pin1.wav'),
          description: '京都駅周辺の賑やかな音を収録しました。新幹線の音や人々の声が聞こえます。',
          latitude: 34.9859,
          longitude: 135.7582,
          layerIds: ['layer-tourism'],
          createdAt: new Date(Date.now() - 4 * 60 * 1000),
        },
        {
          id: 'sample-2',
          title: '清水寺の鐘の音',
          userName: 'Sarah Johnson',
          userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
          audioUrl: require('../../../../../assets/sounds/pin2.wav'),
          description: '清水寺の美しい鐘の音と、参拝者の足音を録音しました。',
          latitude: 34.9949,
          longitude: 135.7851,
          layerIds: ['layer-culture', 'layer-tourism'],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'sample-3',
          title: '伏見稲荷の自然音',
          userName: 'Mike Chen',
          userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          audioUrl: require('../../../../../assets/sounds/pin3.wav'),
          description: '伏見稲荷大社の千本鳥居を歩く音と、鳥のさえずりを収録しました。',
          latitude: 34.9671,
          longitude: 135.7727,
          layerIds: ['layer-culture', 'layer-nature'],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ];

      // ローカルピンとサンプルピンを結合（ローカルピンを先頭に）
      const allPins = [...convertedPins, ...samplePins];
      setAudioPins(allPins);

      console.log(`ローカルオーディオピンを${localPins.length}件読み込みました`);
    } catch (err) {
      console.error('オーディオピン取得エラー:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      
      // エラー時はサンプルデータのみ表示
      const fallbackPins: AudioPin[] = [
        {
          id: 'fallback-1',
          title: '京都駅の音風景',
          userName: 'Andrew Daniels',
          userImage: DEFAULT_USER_IMAGE,
          audioUrl: require('../../../../../assets/sounds/pin1.wav'),
          description: '京都駅周辺の賑やかな音を収録しました。新幹線の音や人々の声が聞こえます。',
          latitude: 34.9859,
          longitude: 135.7582,
          layerIds: ['layer-tourism'],
          createdAt: new Date(Date.now() - 4 * 60 * 1000),
        },
        {
          id: 'fallback-2',
          title: '清水寺の鐘の音',
          userName: 'Sarah Johnson',
          userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
          audioUrl: require('../../../../../assets/sounds/pin2.wav'),
          description: '清水寺の美しい鐘の音と、参拝者の足音を録音しました。',
          latitude: 34.9949,
          longitude: 135.7851,
          layerIds: ['layer-culture', 'layer-tourism'],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'fallback-3',
          title: '伏見稲荷の自然音',
          userName: 'Mike Chen',
          userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          audioUrl: require('../../../../../assets/sounds/pin3.wav'),
          description: '伏見稲荷大社の千本鳥居を歩く音と、鳥のさえずりを収録しました。',
          latitude: 34.9671,
          longitude: 135.7727,
          layerIds: ['layer-culture', 'layer-nature'],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ];
      setAudioPins(fallbackPins);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回データ取得
  useEffect(() => {
    fetchAudioPins();
  }, [fetchAudioPins]);

  // ピンタップ時のハンドラー
  const handlePinPress = useCallback((audioData: AudioPin) => {
    console.log('handlePinPress called with:', audioData.title);
    setSelectedAudio(audioData);
    setModalVisible(true);
    console.log('Modal should be visible now');
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    console.log('handleCloseModal called');
    setModalVisible(false);
    setSelectedAudio(null);
  }, []);

  // 手動でデータを再取得（プルトゥリフレッシュなどで使用）
  const refreshPins = useCallback(() => {
    fetchAudioPins();
  }, [fetchAudioPins]);

  return {
    audioPins,
    selectedAudio,
    modalVisible,
    isLoading,
    error,
    handlePinPress,
    handleCloseModal,
    refreshPins,
  };
}; 