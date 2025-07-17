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
import { formatDuration, getRelativeTime } from '../src/shared/utils/timeUtils';

interface AudioData {
  id: string;
  title: string;
  userName: string;
  userImage: string;
  audioUrl: any; // requireの戻り値の型
  description: string;
  layerIds: string[]; // レイヤー情報を追加
  createdAt?: Date; // 投稿日時（オプショナル）
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
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          closeModal();
        } else {
          // 元の位置に戻す
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // モーダルオープンアニメーション
  const openModal = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // モーダルクローズアニメーション
  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // バックドロップタップでモーダルを閉じる
  const handleBackdropPress = () => {
    closeModal();
  };

  // 再生状態の管理
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering || 
                     playbackState.state === State.Loading ||
                     isLoading;

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

  if (!audioData) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ハンドルバー */}
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* メインコンテンツ */}
          <View style={styles.content}>
            {/* メイン横並びセクション */}
            <View style={styles.mainSection}>
              {/* 左側：アイコンと名前 */}
              <View style={styles.leftSection}>
                <Image source={{ uri: audioData.userImage }} style={styles.userIcon} />
                <Text style={styles.userName}>{audioData.userName}</Text>
              </View>

              {/* 右側：プレイヤー部分 */}
              <View style={styles.rightSection}>
                {/* タイトルと音声時間、右側に再生コントロール */}
                <View style={styles.titleSection}>
                  <View style={styles.titleInfo}>
                    <Text style={styles.title}>{audioData.title}</Text>
                    <Text style={styles.duration}>
                      {formatDuration(progress.position)} / {formatDuration(progress.duration)}
                    </Text>
                  </View>

                  {/* 右側の再生コントロール */}
                  <View style={styles.playControls}>
                    <TouchableOpacity 
                      style={styles.smallControlButton} 
                      onPress={skipBackward}
                      disabled={!isPlayerReady || isBuffering}
                    >
                      <Ionicons name="play-back" size={20} color={!isPlayerReady ? "#999" : "#007AFF"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.playButton, (!isPlayerReady || isBuffering) && styles.disabledButton]}
                      onPress={togglePlayback}
                      disabled={!isPlayerReady}
                    >
                      {isBuffering ? (
                        <Ionicons name="hourglass" size={24} color="#fff" />
                      ) : (
                        <Ionicons 
                          name={isPlaying ? "pause" : "play"} 
                          size={24} 
                          color="#fff" 
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.smallControlButton} 
                      onPress={skipForward}
                      disabled={!isPlayerReady || isBuffering}
                    >
                      <Ionicons name="play-forward" size={20} color={!isPlayerReady ? "#999" : "#007AFF"} />
                    </TouchableOpacity>
                  </View>
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

                {/* 投稿時間とレイヤー情報 */}
                <View style={styles.metaInfo}>
                  <Text style={styles.timeAgo}>
                    {audioData.createdAt ? getRelativeTime(audioData.createdAt) : "投稿時間不明"}
                  </Text>
                  
                  {audioData.layerIds && audioData.layerIds.length > 0 && (
                    <View style={styles.layersInfo}>
                      {getLayersByIds(audioData.layerIds).map((layer, index) => (
                        <View key={layer.id} style={styles.layerChip}>
                          <Ionicons
                            name={layer.icon as any}
                            size={12}
                            color={layer.color}
                            style={styles.layerIcon}
                          />
                          <Text style={[styles.layerName, { color: layer.color }]}>
                            {layer.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* 説明テキスト（全体の下） */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{audioData.description}</Text>
            </View>
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
  content: {
    padding: 20,
  },
  mainSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leftSection: {
    alignItems: 'center',
    width: 60, // アイコン幅(60px) + 余白(12px)
    marginRight: 15,
  },
  rightSection: {
    flex: 1,
  },
  userIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleInfo: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  playControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallControlButton: {
    padding: 8,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  progressContainer: {
    marginBottom: 12,
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
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
  },
  layersInfo: {
    flexDirection: 'row',
    gap: 6,
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  layerIcon: {
    marginRight: 4,
  },
  layerName: {
    fontSize: 10,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    textAlign: 'left',
  },
}); 