import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorderState,
    useAudioRecorder as useExpoAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isLoading: boolean;
  recordingDuration: number;
  recordingUri: string | null;
  recordingError: string | null;
  isInitialized: boolean;
}

interface RecordingResult {
  uri: string;
  duration: number;
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isLoading: false,
    recordingDuration: 0,
    recordingUri: null,
    recordingError: null,
    isInitialized: false,
  });

  // 無限ループ防止のためのフラグ
  const isCleaningUpRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // expo-audioの録音フック（常に初期化）
  const audioRecorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // 権限とオーディオモードの初期化
  useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      // 既に初期化されている場合はスキップ
      if (hasInitializedRef.current || isCleaningUpRef.current) {
        return;
      }

      try {
        console.log('🎙️ オーディオの初期化を開始...');
        
        // AudioModuleを使用して権限チェック
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!isMounted || isCleaningUpRef.current) return;

        if (!status.granted) {
          console.log('❌ マイクの権限が拒否されました');
          setState(prev => ({ 
            ...prev, 
            recordingError: 'マイクの権限が必要です。設定から許可してください。',
            isInitialized: false 
          }));
          return;
        }

        console.log('✅ マイクの権限が許可されました');

        // オーディオモード設定
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });

        if (!isMounted || isCleaningUpRef.current) return;

        console.log('✅ オーディオモードが設定されました');
        
        setState(prev => ({ 
          ...prev, 
          isInitialized: true,
          recordingError: null 
        }));

        hasInitializedRef.current = true;
        console.log('✅ オーディオの初期化が完了しました');
      } catch (error) {
        console.error('❌ オーディオ初期化エラー:', error);
        if (!isMounted || isCleaningUpRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          recordingError: 'オーディオの初期化に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'),
          isInitialized: false 
        }));
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
    };
  }, []); // 依存配列を空にして一度だけ実行

  // 権限チェック
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const response = await AudioModule.requestRecordingPermissionsAsync();
      return response.granted;
    } catch (error) {
      console.error('録音権限の取得に失敗:', error);
      setState(prev => ({ ...prev, recordingError: '録音権限が必要です' }));
      return false;
    }
  }, []);

  // 録音開始
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isCleaningUpRef.current) {
      console.log('❌ クリーンアップ中のため録音開始をスキップ');
      return false;
    }

    try {
      console.log('🎤 録音開始を試行...');

      if (!state.isInitialized) {
        console.log('❌ オーディオが初期化されていません');
        setState(prev => ({ ...prev, recordingError: 'オーディオが初期化されていません' }));
        return false;
      }

      if (!audioRecorder) {
        console.log('❌ 録音機器が初期化されていません');
        setState(prev => ({ ...prev, recordingError: '録音機器が初期化されていません' }));
        return false;
      }

      setState(prev => ({ ...prev, isLoading: true, recordingError: null }));

      // 権限の再確認
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // ドキュメント通りの録音準備と開始
      console.log('🎙️ 録音を準備中...');
      await audioRecorder.prepareToRecordAsync();
      
      console.log('🎙️ 録音を開始中...');
      audioRecorder.record();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isLoading: false,
        recordingDuration: 0,
        recordingUri: audioRecorder.uri,
      }));

      console.log('✅ 録音が開始されました');
      return true;
    } catch (error) {
      console.error('❌ 録音開始エラー:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        recordingError: '録音の開始に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'),
      }));
      return false;
    }
  }, [audioRecorder, state.isInitialized, requestPermissions]);

  // 録音停止
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (isCleaningUpRef.current) {
      console.log('❌ クリーンアップ中のため録音停止をスキップ');
      return null;
    }

    try {
      // recorderStateの状態チェック
      if (!recorderState?.isRecording || !audioRecorder) {
        console.log('❌ 録音が行われていません - isRecording:', recorderState?.isRecording, 'audioRecorder:', !!audioRecorder);
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      console.log('🛑 録音を停止中...');
      
      // ドキュメント通りの録音停止
      await audioRecorder.stop();

      // 録音結果を取得（停止直後にアクセス）
      const recordingUri = audioRecorder.uri || '';
      const recordingDuration = recorderState.durationMillis || 0;

      console.log('📁 録音結果:', { uri: recordingUri, duration: recordingDuration });

      // 音声モードリセット
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (audioModeError) {
        console.warn('オーディオモードリセット時のエラー:', audioModeError);
      }

      const result: RecordingResult = {
        uri: recordingUri,
        duration: recordingDuration,
      };

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        isLoading: false,
        recordingUri: recordingUri,
      }));

      console.log('✅ 録音が停止されました:', result);
      return result;
    } catch (error) {
      console.error('❌ 録音停止エラー:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRecording: false, // エラーが発生しても録音状態をリセット
        recordingError: '録音の停止に失敗しました',
      }));
      return null;
    }
  }, [audioRecorder, recorderState]);

  // 録音一時停止
  const pauseRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (!recorderState?.isRecording || !audioRecorder) {
        return false;
      }

      audioRecorder.pause();
      setState(prev => ({ ...prev, isPaused: true }));

      return true;
    } catch (error) {
      console.error('録音一時停止エラー:', error);
      setState(prev => ({ ...prev, isPaused: false })); // エラー時は状態をリセット
      return false;
    }
  }, [audioRecorder, recorderState?.isRecording]);

  // 録音再開
  const resumeRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isPaused || !audioRecorder) {
        return false;
      }

      audioRecorder.record();
      setState(prev => ({ ...prev, isPaused: false }));

      return true;
    } catch (error) {
      console.error('録音再開エラー:', error);
      setState(prev => ({ ...prev, isPaused: true })); // エラー時は元の状態を保持
      return false;
    }
  }, [audioRecorder, state.isPaused]);

  // 録音ファイル削除
  const deleteRecording = useCallback(async (uri: string): Promise<boolean> => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('録音ファイル削除エラー:', error);
      return false;
    }
  }, []);

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, recordingError: null }));
  }, []);

  // 録音状態を完全にリセット（安全版）
  const resetRecorder = useCallback(async (): Promise<void> => {
    // 無限ループ防止
    if (isCleaningUpRef.current) {
      console.log('🔄 既にクリーンアップ中 - リセットをスキップ');
      return;
    }

    isCleaningUpRef.current = true;

    try {
      console.log('🔄 録音状態をリセット中...');

      // 録音中の場合は停止
      if (recorderState?.isRecording && audioRecorder) {
        try {
          await audioRecorder.stop();
        } catch (error) {
          console.warn('録音停止時にエラー:', error);
        }
      }

      // 音声モードをリセット
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (error) {
        console.warn('オーディオモードリセット時にエラー:', error);
      }

      // 状態をリセット
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        isLoading: false,
        recordingDuration: 0,
        recordingUri: null,
        recordingError: null,
        // isInitialized は保持
      }));

      console.log('✅ 録音状態のリセットが完了しました');
    } catch (error) {
      console.error('❌ 録音状態リセットエラー:', error);
    } finally {
      // クリーンアップフラグを少し遅らせてリセット
      setTimeout(() => {
        isCleaningUpRef.current = false;
      }, 100);
    }
  }, [audioRecorder, recorderState]);

  // 緊急停止（シンプル版）
  const emergencyStop = useCallback(async (): Promise<void> => {
    // 無限ループ防止
    if (isCleaningUpRef.current) {
      return;
    }

    isCleaningUpRef.current = true;
    
    try {
      console.log('🚨 緊急停止を実行中...');
      
      // 録音中の場合のみ停止処理
      if (recorderState?.isRecording && audioRecorder) {
        try {
          await audioRecorder.stop();
        } catch (stopError) {
          console.warn('緊急停止時の録音停止エラー:', stopError);
        }
      }
      
      // 音声モードリセット
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (error) {
        // エラーが発生してもログに出すだけ
        console.warn('緊急停止時のオーディオモードリセットエラー:', error);
      }

      // 状態を直接リセット
      setState({
        isRecording: false,
        isPaused: false,
        isLoading: false,
        recordingDuration: 0,
        recordingUri: null,
        recordingError: null,
        isInitialized: false, // 緊急停止時は初期化もリセット
      });

      console.log('✅ 緊急停止が完了しました');
    } catch (error) {
      console.error('❌ 緊急停止エラー:', error);
    } finally {
      // フラグをリセット
      setTimeout(() => {
        isCleaningUpRef.current = false;
        hasInitializedRef.current = false;
      }, 200);
    }
  }, [audioRecorder, recorderState]);

  // recorderStateを元に状態を更新（安全なプロパティアクセス）
  const updatedState: RecordingState = {
    ...state,
    // recorderStateが存在する場合のみ更新
    ...(recorderState && !isCleaningUpRef.current && {
      isRecording: recorderState.isRecording || false,
      recordingDuration: recorderState.durationMillis || 0,
    }),
    // audioRecorderが存在する場合のみURI更新
    ...(audioRecorder && !isCleaningUpRef.current && {
      recordingUri: audioRecorder.uri || null,
    }),
  };

  return {
    // 状態
    ...updatedState,
    // 関数
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    clearError,
    requestPermissions,
    resetRecorder,
    emergencyStop,
  };
}; 