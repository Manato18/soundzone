import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { saveAudioPinLocally } from '../../src/features/recording/services/localStorageService';
import { formatDuration } from '../../src/shared/utils/timeUtils';

// パラメータの型定義
type PreviewRouteParams = {
  Preview: {
    audioUri: string;
    duration: string;
  };
};

type PreviewScreenRouteProp = RouteProp<PreviewRouteParams, 'Preview'>;

// プロップスの型定義
interface PreviewScreenProps {
  audioUri?: string;
  duration?: string;
  onClose?: () => void;
}

export default function PreviewScreen({ 
  audioUri: propAudioUri, 
  duration: propDuration, 
  onClose 
}: PreviewScreenProps = {}) {
  const navigation = useNavigation();
  const route = useRoute<PreviewScreenRouteProp>();
  
  // プロップスとルートパラメータのどちらからも値を取得
  const audioUri = propAudioUri || route.params?.audioUri;
  const duration = propDuration || route.params?.duration;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // パラメータのバリデーション
  const validAudioUri = propAudioUri || route.params?.audioUri;
  const durationMs = propDuration ? parseInt(propDuration, 10) : (route.params?.duration ? parseInt(route.params.duration, 10) : 0);

  console.log('🎵 プレビュー画面 - パラメータ詳細:', { 
    propAudioUri,
    propDuration,
    routeParams: route.params,
    validAudioUri, 
    durationMs 
  });

  // 音声プレイヤー（安全な初期化）
  const player = useAudioPlayer(
    validAudioUri ? { uri: validAudioUri } : null
  );
  
  // プレイヤーステータス（安全なアクセス）
  const status = useAudioPlayerStatus(player);

  // ステータスの詳細ログ（最適化版）
  useEffect(() => {
    if (status) {
      console.log('🎵 プレイヤーステータス更新:', {
        isLoaded: status.isLoaded,
        duration: status.duration,
        currentTime: status.currentTime,
        playing: status.playing
      });
    }
  }, [status?.isLoaded, status?.playing]); // 重要な変更のみ監視

  // プレイヤー初期化とオーディオ設定（一度だけ）
  useEffect(() => {
    const initializeAudio = async () => {
      if (validAudioUri && player) {
        console.log('✅ プレイヤー初期化完了:', {
          audioUri: validAudioUri,
          playerExists: !!player,
          durationFromParams: durationMs
        });
        
        try {
          // 再生用のオーディオモードに設定
          await setAudioModeAsync({
            allowsRecording: false, // 録音を無効にして再生に最適化
            playsInSilentMode: true, // サイレントモードでも再生
          });
          console.log('🔊 再生用オーディオモードに設定しました');
        } catch (error) {
          console.warn('⚠️ オーディオモード設定エラー:', error);
        }
        
        setPlayerError(null);
      } else if (!validAudioUri) {
        console.error('❌ 無効なaudioUri:', validAudioUri);
        setPlayerError('音声ファイルのパスが無効です');
      } else if (!player) {
        console.error('❌ プレイヤーの初期化に失敗');
        setPlayerError('音声プレイヤーの初期化に失敗しました');
      }
    };

    initializeAudio();
  }, [validAudioUri]); // playerを依存配列から削除

  // 再生/一時停止の切り替え（安全版）
  const togglePlayback = () => {
    try {
      if (!player) {
        Alert.alert('エラー', '音声プレイヤーが初期化されていません');
        return;
      }

      if (!status) {
        Alert.alert('エラー', '音声の状態を取得できません');
        return;
      }

      console.log('🎵 再生切り替え - 現在の状態:', {
        playing: status.playing,
        isLoaded: status.isLoaded,
        duration: status.duration,
        currentTime: status.currentTime
      });

      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('❌ 再生切り替えエラー:', error);
      Alert.alert('エラー', '音声の再生操作に失敗しました');
    }
  };

  // 再録音 - 改良版
  const handleRetake = () => {
    Alert.alert(
      '再録音',
      '現在の録音をやり直しますか？録音完了後、自動的にこの画面に戻ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '再録音',
          style: 'default',
          onPress: () => {
            try {
              // 音声を停止
              if (player && status?.playing) {
                player.pause();
              }
              
              console.log('🔄 再録音のため録音画面に遷移');
              
              // onCloseコールバックを使用してモーダルを閉じる
              if (onClose) {
                onClose();
              } else {
                // フォールバック: React Navigationを使用
                navigation.goBack();
              }
            } catch (error) {
              console.error('❌ 再録音エラー:', error);
              // エラーが発生してもナビゲーションは実行
              if (onClose) {
                onClose();
              } else {
                navigation.goBack();
              }
            }
          },
        },
      ]
    );
  };

  // 投稿確定（ローカル保存）
  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (!validAudioUri) {
      Alert.alert('エラー', '音声ファイルが見つかりません');
      return;
    }

    setIsUploading(true);

    try {
      console.log('💾 音声を保存中...', {
        uri: validAudioUri,
        title: title.trim(),
        duration: durationMs
      });

      // TODO: 位置情報を取得して含める（将来の機能）
      const audioPin = await saveAudioPinLocally({
        uri: validAudioUri,
        title: title.trim(),
        description: description.trim() || undefined,
        duration: durationMs,
        // latitude: currentLocation?.latitude,
        // longitude: currentLocation?.longitude,
      });

      Alert.alert(
        '保存完了',
        '音声ピンが正常に保存されました！',
        [
          {
            text: 'ホームに戻る',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
          {
            text: 'さらに録音',
            style: 'default',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Recording' }],
              });
            },
          },
        ]
      );

      console.log('保存完了:', audioPin);
    } catch (error) {
      console.error('保存エラー:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : '保存に失敗しました。もう一度お試しください。';
        
      Alert.alert('エラー', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // 時間情報の計算（最適化版）
  const currentTime = status?.currentTime || 0;
  const statusDuration = status?.duration || 0;
  const totalDuration = statusDuration > 0 ? statusDuration : (durationMs / 1000);
  const isPlaying = status?.playing || false;
  const isLoaded = status?.isLoaded || false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>録音プレビュー</Text>
          <View style={styles.placeholder} />
        </View>

        {/* エラー表示 */}
        {playerError && (
          <View style={styles.errorMessage}>
            <Ionicons name="warning" size={24} color="#ff6b6b" />
            <Text style={styles.errorText}>
              {playerError}
            </Text>
          </View>
        )}

        {/* 録音完了メッセージ */}
        {!playerError && (
          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
            <Text style={styles.successText}>
              録音が完了しました！
            </Text>
          </View>
        )}

        {/* 音声プレイヤー */}
        <View style={styles.playerContainer}>
          {!playerError ? (
            <>
              <View style={styles.waveformContainer}>
                {/* シンプルな波形表示（プレースホルダー） */}
                <View style={styles.waveform}>
                  {Array.from({ length: 30 }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.waveBar,
                        {
                          height: Math.random() * 40 + 10,
                          opacity: totalDuration > 0 && (currentTime / totalDuration) * 30 > index ? 1 : 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* 再生コントロール */}
              <View style={styles.playerControls}>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    !isLoaded && styles.playButtonDisabled
                  ]}
                  onPress={togglePlayback}
                  disabled={!isLoaded}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="#fff"
                  />
                </TouchableOpacity>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {formatDuration(currentTime)} / {formatDuration(totalDuration)}
                  </Text>
                  {!isLoaded && (
                    <Text style={styles.loadingText}>読み込み中...</Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.playerErrorContainer}>
              <Ionicons name="musical-note" size={48} color="#666" />
              <Text style={styles.playerErrorText}>
                音声プレイヤーを利用できません
              </Text>
            </View>
          )}
        </View>

        {/* メタデータ入力 */}
        <View style={styles.metadataContainer}>
          <Text style={styles.sectionTitle}>保存情報</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>タイトル *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="音声のタイトルを入力..."
              placeholderTextColor="#666"
              maxLength={100}
            />
            <Text style={styles.characterCount}>{title.length}/100</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>説明</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="音声の説明を入力..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>
          </View>

          {/* ローカル保存の説明 */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={16} color="#4a9eff" />
            <Text style={styles.infoText}>
              音声はデバイスにローカル保存されます
            </Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={isUploading}
          >
            <Ionicons name="refresh" size={20} color="#4a9eff" />
            <Text style={styles.retakeButtonText}>再録音</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postButton,
              (!title.trim() || isUploading) && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!title.trim() || isUploading}
          >
            <Text style={styles.postButtonText}>
              {isUploading ? '保存中...' : '保存する'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* フロー説明 */}
        <View style={styles.flowContainer}>
          <Text style={styles.flowTitle}>📱 録音フロー</Text>
          <Text style={styles.flowText}>
            1. 再録音ボタン → 録音画面に戻る{'\n'}
            2. 録音完了 → 自動的にこの画面に戻る{'\n'}
            3. 保存完了 → ホーム画面 or 再度録音
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '500',
    marginLeft: 8,
  },
  playerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  waveformContainer: {
    marginBottom: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#4a9eff',
    borderRadius: 1.5,
    marginHorizontal: 1,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a9eff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  playerErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  playerErrorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginLeft: 8,
    flex: 1,
  },
  metadataContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4a9eff',
    marginLeft: 8,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4a9eff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 0.45,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#4a9eff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  postButton: {
    backgroundColor: '#4a9eff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flowContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  flowText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
}); 