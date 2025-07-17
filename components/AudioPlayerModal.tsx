import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import TrackPlayer, {
    State,
    Track,
    usePlaybackState,
    useProgress
} from 'react-native-track-player';
import { getLayersByIds } from '../src/features/layers/domain/utils/layerUtils';
import { trackPlayerSetup } from '../src/shared/services/trackPlayerSetup';

interface AudioData {
  id: string;
  title: string;
  userName: string;
  userImage: string;
  audioUrl: any; // requireの戻り値の型
  description: string;
  layerIds: string[]; // レイヤー情報を追加
}

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  audioData: AudioData | null;
}

const { height: screenHeight } = Dimensions.get('window');

export default function AudioPlayerModal({ visible, onClose, audioData }: AudioPlayerModalProps) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // useRefでslideAnimを管理
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  
  // react-native-track-playerのフックを使用
  const playbackState = usePlaybackState();
  const progress = useProgress();

  // パンレスポンダーでスワイプダウンを検出（ハンドルバーのみに適用）
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        closeModal();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const openModal = () => {
    slideAnim.setValue(screenHeight); // 初期位置を確実に設定
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    console.log('handleCloseModal called');
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      // 音声を停止してクリア
      try {
        await TrackPlayer.pause();
        await TrackPlayer.reset();
      } catch (error) {
        console.error('音声停止エラー:', error);
      }
      onClose();
    });
  };

  // TrackPlayerの初期化と音声読み込み
  const setupAndLoadAudio = async () => {
    if (!audioData) return;

    try {
      setIsLoading(true);
      
      // TrackPlayerを初期化
      const isReady = await trackPlayerSetup();
      if (!isReady) {
        console.error('TrackPlayer setup failed');
        return;
      }

      // 既存のトラックをクリア
      await TrackPlayer.reset();

      // 音声ファイルを追加
      const track: Track = {
        id: audioData.id,
        url: audioData.audioUrl, // ローカルファイル（require）も対応
        title: audioData.title,
        artist: audioData.userName,
        artwork: audioData.userImage,
      };

      await TrackPlayer.add(track);
      setIsPlayerReady(true);

    } catch (error) {
      console.error('音声設定エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('AudioPlayerModal visible changed:', visible);
    if (visible && audioData) {
      console.log('Opening modal with audioData:', audioData?.title);
      openModal();
      setupAndLoadAudio();
    }
  }, [visible, audioData]);

  // 音声再生/停止
  const togglePlayback = async () => {
    try {
      if (playbackState.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('再生エラー:', error);
    }
  };

  // 10秒戻る
  const skipBackward = async () => {
    try {
      const newPosition = Math.max(0, progress.position - 10);
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error('スキップエラー:', error);
    }
  };

  // 10秒進む
  const skipForward = async () => {
    try {
      const newPosition = Math.min(progress.duration, progress.position + 10);
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error('スキップエラー:', error);
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!visible || !audioData) return null;

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={closeModal}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* ハンドルバー */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* ユーザー情報 */}
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: audioData.userImage }} 
              style={styles.userImage}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{audioData.userName}</Text>
              <Text style={styles.timeText}>
                {formatTime(progress.position)} / {formatTime(progress.duration)}
              </Text>
            </View>
          </View>

          {/* 音声コントロール */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={skipBackward}
              disabled={!isPlayerReady || isBuffering}
            >
              <Ionicons name="play-back" size={30} color={!isPlayerReady ? "#999" : "#007AFF"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.playButton, (!isPlayerReady || isBuffering) && styles.disabledButton]} 
              onPress={togglePlayback}
              disabled={!isPlayerReady || isBuffering}
            >
              {isLoading || isBuffering ? (
                <Ionicons name="hourglass" size={40} color="#fff" />
              ) : (
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={40} 
                  color="#fff" 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={skipForward}
              disabled={!isPlayerReady || isBuffering}
            >
              <Ionicons name="play-forward" size={30} color={!isPlayerReady ? "#999" : "#007AFF"} />
            </TouchableOpacity>
          </View>

          {/* プログレスバー */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0}%` }
                ]} 
              />
            </View>
          </View>

          {/* レイヤー情報 */}
          {audioData?.layerIds && audioData.layerIds.length > 0 && (
            <View style={styles.layersContainer}>
              <Text style={styles.layersTitle}>所属レイヤー</Text>
              <View style={styles.layersGrid}>
                {getLayersByIds(audioData.layerIds).map((layer) => (
                  <View key={layer.id} style={styles.layerChip}>
                    <Ionicons
                      name={layer.icon as any}
                      size={16}
                      color={layer.color}
                      style={styles.layerIcon}
                    />
                    <Text style={[styles.layerName, { color: layer.color }]}>
                      {layer.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 説明テキスト */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{audioData.description}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
    maxHeight: screenHeight * 0.8,
  },
  handleContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: '#C0C0C0',
    borderRadius: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButton: {
    padding: 15,
    marginHorizontal: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  layersContainer: {
    marginTop: 20,
    marginBottom: 15,
  },
  layersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  layersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  layerIcon: {
    marginRight: 6,
  },
  layerName: {
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionContainer: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
  },
}); 