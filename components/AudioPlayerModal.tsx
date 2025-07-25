import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { useProgress } from 'react-native-track-player';
import { getLayersByIds } from '../src/features/layers/domain/utils/layerUtils';
import { formatDuration, getRelativeTime } from '../src/shared/utils/timeUtils';
import { useAudioPlayer } from '../src/features/audioPin/presentation/hooks/useAudioPlayer';

interface AudioData {
  id: string;
  title: string;
  userName: string;
  userImage: string;
  audioUrl: any; // requireの戻り値の型
  description: string;
  layerIds: string[]; // レイヤー情報を追加
  createdAt?: Date; // 投稿日時（オプショナル）
  // AudioPinとの互換性のため、以下のプロパティを追加（モーダルでは使用しない）
  latitude: number;
  longitude: number;
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
  // マウント状態を追跡してメモリリークを防ぐ
  const isMountedRef = useRef(false);
  
  // useAudioPlayerフックを使用（StateManagement.mdに準拠）
  const {
    isPlaying,
    currentTime,
    duration,
    play,
    stop,
    togglePlayback,
    skipBackward,
    skipForward,
    settings,
  } = useAudioPlayer();
  
  // react-native-track-playerの進捗情報（UI表示用）
  const progress = useProgress();

  // マウント・アンマウント管理
  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // useAudioPlayerフックが内部でクリーンアップを処理
      // 追加のクリーンアップが必要な場合はここに記述
    };
  }, []);

  // 安全な状態更新関数
  const safeSetState = useCallback((setter: () => void) => {
    if (isMountedRef.current) {
      // 状態更新を次のフレームに遅延
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setter();
        }
      });
    }
  }, []);

  // 指定の状態にアニメーション
  const animateToState = useCallback((state: keyof typeof MODAL_STATES) => {
    if (!isMountedRef.current) return;
    
    // 状態更新を安全に実行
    safeSetState(() => {
      setCurrentState(state);
    });
    
    Animated.spring(slideAnim, {
      toValue: MODAL_STATES[state],
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start((finished) => {
      if (finished && state === 'CLOSED' && isMountedRef.current) {
        // アニメーション完了後のコールバックも安全に実行
        requestAnimationFrame(() => {
          if (isMountedRef.current) {
            onClose();
          }
        });
      }
    });
  }, [slideAnim, onClose, safeSetState]);

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
        
        // panResponder内での状態更新を安全に実行
        const performTransition = (targetState: keyof typeof MODAL_STATES) => {
          setTimeout(() => {
            if (isMountedRef.current) {
              animateToState(targetState);
            }
          }, 0);
        };
        
        // 現在の状態と移動量・速度に基づいて次の状態を決定
        if (currentStateRef.current === 'COLLAPSED') {
          if (gestureState.dy < -100 || velocity < -0.5) {
            // 上にスワイプ → 全画面表示
            console.log('Transitioning to EXPANDED');
            performTransition('EXPANDED');
          } else if (gestureState.dy > 150 || velocity > 0.5) {
            // 下にスワイプ → 閉じる
            console.log('Transitioning to CLOSED');
            performTransition('CLOSED');
          } else {
            // 元の位置に戻す
            console.log('Returning to COLLAPSED');
            performTransition('COLLAPSED');
          }
        } else if (currentStateRef.current === 'EXPANDED') {
          if (gestureState.dy > 100 || velocity > 0.3) {
            // 下にスワイプ → 縮小表示
            console.log('Transitioning to COLLAPSED');
            performTransition('COLLAPSED');
          } else {
            // 元の位置に戻す
            console.log('Returning to EXPANDED');
            performTransition('EXPANDED');
          }
        }
      },
    }),
    [slideAnim, animateToState]
  );

  // モーダルオープンアニメーション（下半分から開始）
  const openModal = useCallback(() => {
    if (!isMountedRef.current) return;
    
    safeSetState(() => {
      setCurrentState('COLLAPSED');
    });
    
    Animated.spring(slideAnim, {
      toValue: MODAL_STATES.COLLAPSED,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, safeSetState]);

  // モーダルクローズアニメーション
  const closeModal = useCallback(async () => {
    try {
      // useAudioPlayerのstop関数を使用
      await stop();
      
      // アニメーションで閉じる
      animateToState('CLOSED');
    } catch (error) {
      console.error('Error closing audio modal:', error);
      // エラーが発生してもモーダルは閉じる
      animateToState('CLOSED');
    }
  }, [animateToState, stop]);

  // バックドロップタップでモーダルを閉じる
  const handleBackdropPress = () => {
    closeModal();
  };

  // 再生状態の管理（isBufferingはローディング状態のみ）
  const isBuffering = isLoading;

  // 音声の読み込みと再生
  const loadAndPlayAudio = useCallback(async () => {
    if (!audioData || !isMountedRef.current) return;

    try {
      safeSetState(() => {
        setIsLoading(true);
      });
      
      // useAudioPlayerフックのplay関数を使用
      if (settings.autoPlayOnPinTap) {
        await play(audioData);
      }
      
      if (isMountedRef.current) {
        safeSetState(() => {
          setIsPlayerReady(true);
        });
      }
    } catch (error) {
      console.error('音声設定エラー:', error);
    } finally {
      if (isMountedRef.current) {
        safeSetState(() => {
          setIsLoading(false);
        });
      }
    }
  }, [audioData, play, settings.autoPlayOnPinTap, safeSetState]);

  // visibleとaudioDataの変化を監視（安全な状態更新）
  useEffect(() => {
    console.log('AudioPlayerModal visible changed:', visible);
    if (visible && audioData && isMountedRef.current) {
      console.log('Opening modal with audioData:', audioData?.title);
      // モーダル開始とオーディオ設定を順次実行
      setTimeout(() => {
        if (isMountedRef.current) {
          openModal();
          loadAndPlayAudio();
        }
      }, 0);
    }
  }, [visible, audioData, openModal, loadAndPlayAudio]);

  // currentStateRefを同期
  useLayoutEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  // バックグラウンド処理はuseAudioPlayerフックで管理されるため削除

  // togglePlaybackはuseAudioPlayerフックから提供される関数を使用

  // skipBackwardとskipForwardはuseAudioPlayerフックから提供される関数を使用

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