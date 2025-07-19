import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDuration } from '../../../shared/utils/timeUtils';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

// プレビュー画面をインポート
import PreviewScreen from '../../../../app/recording/preview';

export default function RecordingScreen() {
  const {
    isRecording,
    isLoading,
    recordingDuration,
    recordingError,
    startRecording,
    stopRecording,
    clearError,
    isInitialized,
    resetRecorder,
    emergencyStop,
  } = useAudioRecorder();

  // ボタンの感度制御
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const lastPressTime = useRef(0);
  const BUTTON_DEBOUNCE_TIME = 500; // 500ms間隔で制限

  // プレビューモーダルの状態
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    audioUri: string;
    duration: string;
  } | null>(null);

  // クリーンアップ済みフラグ
  const hasCleanedUpRef = useRef(false);

  // コンポーネントのアンマウント時のクリーンアップ（修正版）
  useEffect(() => {
    // マウント時にクリーンアップフラグをリセット
    hasCleanedUpRef.current = false;

    return () => {
      // アンマウント時に一度だけクリーンアップを実行
      if (!hasCleanedUpRef.current) {
        hasCleanedUpRef.current = true;
        console.log('📱 録音画面アンマウント - クリーンアップ実行');
        
        // 緊急停止を非同期で実行（無限ループを防ぐため）
        emergencyStop().catch((error) => {
          console.error('アンマウント時の緊急停止エラー:', error);
        });
      }
    };
  }, []); // 依存配列を空にして一度だけ実行

  // エラーが発生した場合のアラート表示
  useEffect(() => {
    if (recordingError) {
      Alert.alert('エラー', recordingError, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [recordingError, clearError]);

  // プレビューモーダルを閉じる
  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewData(null);
  }, []);

  // 録音開始/停止の処理（デバウンス機能付き）
  const handleRecordingToggle = useCallback(async () => {
    const now = Date.now();
    
    // デバウンス制御
    if (now - lastPressTime.current < BUTTON_DEBOUNCE_TIME) {
      console.log('ボタン押下が早すぎます。しばらくお待ちください。');
      return;
    }

    lastPressTime.current = now;
    setIsButtonDisabled(true);

    try {
      console.log('🎯 録音トグル開始 - 現在の状態:', { 
        isRecording, 
        isLoading, 
        isInitialized,
        recordingDuration 
      });

      if (isRecording) {
        console.log('🛑 録音停止を試行...');
        const result = await stopRecording();
        
        console.log('📋 録音停止結果:', result);
        
        if (result && result.uri) {
          console.log('✅ 録音完了 - プレビュー画面を表示:', {
            uri: result.uri,
            duration: result.duration
          });
          
          // プレビューデータを設定してモーダルを表示
          setPreviewData({
            audioUri: result.uri,
            duration: result.duration.toString(),
          });
          setShowPreview(true);
        } else {
          console.warn('⚠️ 録音結果が無効です:', result);
          Alert.alert('エラー', '録音の保存に失敗しました');
        }
      } else {
        console.log('🎤 録音開始を試行...');
        const success = await startRecording();
        
        console.log('📋 録音開始結果:', success);
        
        if (!success) {
          console.log('❌ 録音開始に失敗しました');
          Alert.alert('エラー', '録音を開始できませんでした');
        } else {
          console.log('✅ 録音が正常に開始されました');
        }
      }
    } catch (error) {
      console.error('❌ 録音操作エラー（詳細）:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        isRecording,
        isLoading,
        isInitialized
      });
      
      // エラーの種類に応じてメッセージを変更
      let errorMessage = '録音操作中にエラーが発生しました';
      if (error instanceof Error) {
        if (error.message.includes('isReady')) {
          errorMessage = '録音機器の初期化に問題があります。アプリを再起動してください。';
        } else if (error.message.includes('permission')) {
          errorMessage = 'マイクの権限が必要です。設定から許可してください。';
        } else {
          errorMessage = `録音エラー: ${error.message}`;
        }
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      // 1秒後にボタンを再有効化
      setTimeout(() => {
        console.log('🔓 ボタンを再有効化');
        setIsButtonDisabled(false);
      }, 1000);
    }
  }, [isRecording, startRecording, stopRecording, isLoading, isInitialized, recordingDuration]);

  // ホームに戻る処理（状態リセット機能付き）
  const handleGoHome = useCallback(async () => {
    try {
      // クリーンアップフラグを設定
      hasCleanedUpRef.current = true;
      
      // 状態をリセット
      await resetRecorder();
      
      console.log('🏠 ホーム画面に戻ります');
      // タブナビゲーションなので特別な処理は不要
    } catch (error) {
      console.error('ホーム遷移エラー:', error);
    }
  }, [resetRecorder]);

  // 録音中の確認付きホーム戻り
  const confirmGoHome = useCallback(() => {
    if (isRecording) {
      // 録音中の場合は確認ダイアログを表示
      Alert.alert(
        '録音中です',
        '録音を停止してホーム画面に戻りますか？録音データは失われます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '停止して戻る',
            style: 'destructive',
            onPress: handleGoHome,
          },
        ]
      );
    } else {
      // 録音中でない場合もリセットしてから戻る
      handleGoHome();
    }
  }, [isRecording, handleGoHome]);

  // 初期化状態に基づいてUIを表示
  const getStatusMessage = () => {
    if (!isInitialized) {
      return '音声システムを初期化中...';
    }
    if (isLoading) {
      return '処理中...';
    }
    if (isRecording) {
      return '録音中...';
    }
    return '録音待機中';
  };

  const getInstructionText = () => {
    if (!isInitialized) {
      return 'しばらくお待ちください';
    }
    if (isRecording) {
      return 'ボタンをタップして録音を停止し、\nプレビュー画面に移動します';
    }
    return 'ボタンをタップして録音を開始\n（連続タップを防ぐため少し間隔をあけてください）';
  };

  const getButtonLabel = () => {
    if (!isInitialized) {
      return '初期化中...';
    }
    if (isLoading || isButtonDisabled) {
      return '処理中...';
    }
    if (isRecording) {
      return '録音停止';
    }
    return '録音開始';
  };

  // ボタンが押せる状態かどうか
  const isButtonPressable = isInitialized && !isLoading && !isButtonDisabled;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>音声録音</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={confirmGoHome}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* 録音時間表示 */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {formatDuration(recordingDuration)}
          </Text>
          <Text style={styles.timerLabel}>
            {getStatusMessage()}
          </Text>
        </View>

        {/* 録音インジケーター */}
        <View style={styles.indicatorContainer}>
          <View
            style={[
              styles.recordingIndicator,
              isRecording && styles.recordingActive,
              !isInitialized && styles.recordingDisabled,
            ]}
          >
            {isRecording && (
              <View style={styles.recordingPulse} />
            )}
            {!isInitialized && (
              <View style={styles.initializingIndicator}>
                <Text style={styles.initializingText}>🎙️</Text>
              </View>
            )}
          </View>
        </View>

        {/* 録音ボタン */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              !isButtonPressable && styles.recordButtonDisabled,
            ]}
            onPress={handleRecordingToggle}
            disabled={!isButtonPressable}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonInnerActive,
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.recordButtonLabel}>
            {getButtonLabel()}
          </Text>
          
          {/* デバウンス状態の表示 */}
          {isButtonDisabled && !isLoading && (
            <Text style={styles.debounceText}>
              少々お待ちください...
            </Text>
          )}
        </View>

        {/* 説明テキスト */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {getInstructionText()}
          </Text>
        </View>

        {/* 進行状況 */}
        {isRecording && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              録音完了後、自動的にプレビュー画面に移動します
            </Text>
          </View>
        )}

        {/* 操作ヒント */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 ヒント: 右上の × ボタンでホーム画面に戻れます{'\n'}
            ホームに戻った後でも、録音画面には再度アクセスできます
          </Text>
        </View>
      </View>

      {/* プレビューモーダル */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={closePreview}
      >
        {previewData && (
          <PreviewScreen
            audioUri={previewData.audioUri}
            duration={previewData.duration}
            onClose={closePreview}
          />
        )}
      </Modal>
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
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  timerLabel: {
    fontSize: 18,
    color: '#888',
    marginTop: 10,
  },
  indicatorContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  recordingActive: {
    backgroundColor: '#ff4444',
  },
  recordingDisabled: {
    backgroundColor: '#222',
    opacity: 0.5,
  },
  recordingPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
  },
  initializingIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initializingText: {
    fontSize: 32,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButtonActive: {
    backgroundColor: '#ff4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  recordButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
  },
  recordButtonInnerActive: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  recordButtonLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  debounceText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  instructionContainer: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#4a9eff',
    textAlign: 'center',
  },
  hintContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 