import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
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

// モーダルの3つの状態
const MODAL_STATES = {
  CLOSED: screenHeight,                    // 完全に下に隠れた状態
  COLLAPSED: screenHeight * 0.5,          // 下半分表示
  EXPANDED: 100,                          // ほぼ全画面（ステータスバー分を残す）
};

export default function AudioPlayerModal({ visible, onClose, audioData }: AudioPlayerModalProps) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentState, setCurrentState] = useState('COLLAPSED');
  
  // useRefでslideAnimを管理
  const slideAnim = useRef(new Animated.Value(MODAL_STATES.CLOSED)).current;
  // currentStateをrefで管理して、panResponder内で最新の値を参照できるようにする
  const currentStateRef = useRef(currentState);
  
  // react-native-track-playerのフックを使用
  const playbackState = usePlaybackState();
  const progress = useProgress();

  // 指定の状態にアニメーション
  const animateToState = useCallback((state: keyof typeof MODAL_STATES) => {
    setCurrentState(state);
    Animated.spring(slideAnim, {
      toValue: MODAL_STATES[state],
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      if (state === 'CLOSED') {
        onClose();
      }
    });
  }, [slideAnim, onClose]);

  // パンレスポンダーで3段階のスワイプを制御
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        console.log('onStartShouldSetPanResponder: true');
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // 縦方向のスワイプで、少しでも移動があれば反応
        const isVerticalGesture = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const hasMovement = Math.abs(gestureState.dy) > 5;
        const shouldRespond = isVerticalGesture && hasMovement;
        console.log('onMoveShouldSetPanResponder:', shouldRespond, 'dy:', gestureState.dy, 'dx:', gestureState.dx);
        return shouldRespond;
      },
      onPanResponderTerminationRequest: () => false, // 他のコンポーネントに制御を譲らない
      onPanResponderGrant: () => {
        console.log('onPanResponderGrant - current state:', currentStateRef.current);
        // タッチ開始時のベース位置を設定
        slideAnim.setOffset(MODAL_STATES[currentStateRef.current as keyof typeof MODAL_STATES]);
        slideAnim.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // 上下両方向のスワイプを許可
        slideAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log('onPanResponderRelease - dy:', gestureState.dy, 'velocity:', gestureState.vy, 'current state:', currentStateRef.current);
        slideAnim.flattenOffset();
        
        const velocity = gestureState.vy;
        
        // 現在の状態と移動量・速度に基づいて次の状態を決定
        if (currentStateRef.current === 'COLLAPSED') {
          if (gestureState.dy < -100 || velocity < -0.5) {
            // 上にスワイプ → 全画面表示
            console.log('Transitioning to EXPANDED');
            animateToState('EXPANDED');
          } else if (gestureState.dy > 150 || velocity > 0.5) {
            // 下にスワイプ → 閉じる
            console.log('Transitioning to CLOSED');
            animateToState('CLOSED');
          } else {
            // 元の位置に戻す
            console.log('Returning to COLLAPSED');
            animateToState('COLLAPSED');
          }
        } else if (currentStateRef.current === 'EXPANDED') {
          if (gestureState.dy > 100 || velocity > 0.3) {
            // 下にスワイプ → 縮小表示
            console.log('Transitioning to COLLAPSED');
            animateToState('COLLAPSED');
          } else {
            // 元の位置に戻す
            console.log('Returning to EXPANDED');
            animateToState('EXPANDED');
          }
        }
      },
    }),
    [slideAnim, animateToState]
  );

  // モーダルオープンアニメーション（下半分から開始）
  const openModal = useCallback(() => {
    setCurrentState('COLLAPSED');
    Animated.spring(slideAnim, {
      toValue: MODAL_STATES.COLLAPSED,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // モーダルクローズアニメーション
  const closeModal = useCallback(() => {
    animateToState('CLOSED');
  }, [animateToState]);

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
  const setupAndLoadAudio = useCallback(async () => {
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
  }, [audioData]);

  useEffect(() => {
    console.log('AudioPlayerModal visible changed:', visible);
    if (visible && audioData) {
      console.log('Opening modal with audioData:', audioData?.title);
      openModal();
      setupAndLoadAudio();
    }
  }, [visible, audioData, openModal, setupAndLoadAudio]);

  // currentStateRefを同期
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

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
              height: screenHeight, // 画面全体の高さを確保
            },
          ]}
        >
          {/* ハンドルバー（ドラッグ可能エリア） */}
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* 固定プレイヤー情報エリア */}
          <View style={styles.fixedPlayerSection} {...panResponder.panHandlers}>
            {/* メイン横並びセクション */}
            <View style={styles.mainSection}>
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
          </View>

          {/* 説明テキスト（スクロール可能エリア） */}
          <View style={styles.descriptionHeader}>
            <View style={styles.divider} />
          </View>
          <ScrollView 
            style={styles.descriptionScrollContainer}
            contentContainerStyle={styles.descriptionScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
          >
            <Text style={styles.description}>{audioData.description}</Text>
          </ScrollView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  handleContainer: {
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // タッチエリアを大きくするため、最小高さを設定
    minHeight: 30,
    justifyContent: 'center',
  },
  handle: {
    width: 60,
    height: 5,
    backgroundColor: '#999',
    borderRadius: 3,
    // ハンドルを少し目立たせる
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  mainSection: {
    flexDirection: 'row',
  },
  leftSection: {
    alignItems: 'center',
    width: 60,
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
  descriptionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 1,
  },
  descriptionScrollContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  descriptionScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  fixedPlayerSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    textAlign: 'left',
  },
}); 