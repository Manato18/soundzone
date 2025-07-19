import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

export interface LocalAudioPin {
  id: string;
  title: string;
  description?: string;
  audioUri: string; // ローカルファイルパス
  duration: number; // ミリ秒
  latitude?: number;
  longitude?: number;
  createdAt: string;
  fileName: string;
}

export interface AudioPinUploadData {
  uri: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  duration: number;
}

const STORAGE_KEY = 'soundzone_audio_pins';
const AUDIO_DIRECTORY = `${FileSystem.documentDirectory}soundzone_audio/`;

/**
 * 音声ファイル保存用ディレクトリを初期化
 */
const initializeDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });
  }
};

/**
 * ローカルに保存されたオーディオピンのリストを取得
 */
export const getLocalAudioPins = async (): Promise<LocalAudioPin[]> => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const pins: LocalAudioPin[] = JSON.parse(storedData);
      
      // ファイルの存在確認と不正なデータの除去
      const validPins: LocalAudioPin[] = [];
      for (const pin of pins) {
        const fileInfo = await FileSystem.getInfoAsync(pin.audioUri);
        if (fileInfo.exists) {
          validPins.push(pin);
        }
      }
      
      // 不正なデータがあった場合は更新
      if (validPins.length !== pins.length) {
        await saveAudioPinsList(validPins);
      }
      
      return validPins.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('ローカルオーディオピン取得エラー:', error);
    return [];
  }
};

/**
 * オーディオピンリストをAsyncStorageに保存
 */
const saveAudioPinsList = async (pins: LocalAudioPin[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (error) {
    console.error('オーディオピンリスト保存エラー:', error);
    throw new Error('データの保存に失敗しました');
  }
};

/**
 * 音声ファイルをローカルに保存し、メタデータを記録
 */
export const saveAudioPinLocally = async (
  data: AudioPinUploadData
): Promise<LocalAudioPin> => {
  try {
    // ディレクトリ初期化
    await initializeDirectory();

    // ファイル情報確認
    const sourceFileInfo = await FileSystem.getInfoAsync(data.uri);
    if (!sourceFileInfo.exists) {
      throw new Error('音声ファイルが見つかりません');
    }

    // 一意なファイル名を生成
    const fileId = uuidv4();
    const fileName = `${fileId}.m4a`;
    const destinationUri = `${AUDIO_DIRECTORY}${fileName}`;

    // ファイルをローカルディレクトリにコピー
    await FileSystem.copyAsync({
      from: data.uri,
      to: destinationUri,
    });

    // メタデータを作成
    const audioPin: LocalAudioPin = {
      id: fileId,
      title: data.title,
      description: data.description,
      audioUri: destinationUri,
      duration: data.duration,
      latitude: data.latitude,
      longitude: data.longitude,
      createdAt: new Date().toISOString(),
      fileName: fileName,
    };

    // 既存のピンリストを取得
    const existingPins = await getLocalAudioPins();
    
    // 新しいピンを追加
    const updatedPins = [audioPin, ...existingPins];
    
    // 保存
    await saveAudioPinsList(updatedPins);

    return audioPin;
  } catch (error) {
    console.error('ローカル音声保存エラー:', error);
    throw new Error('音声の保存に失敗しました');
  }
};

/**
 * ローカルオーディオピンを削除
 */
export const deleteLocalAudioPin = async (audioPinId: string): Promise<void> => {
  try {
    // 既存のピンリストを取得
    const existingPins = await getLocalAudioPins();
    
    // 削除対象のピンを見つける
    const targetPin = existingPins.find(pin => pin.id === audioPinId);
    if (!targetPin) {
      throw new Error('オーディオピンが見つかりません');
    }

    // ファイルを削除
    const fileInfo = await FileSystem.getInfoAsync(targetPin.audioUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(targetPin.audioUri);
    }

    // リストから削除
    const updatedPins = existingPins.filter(pin => pin.id !== audioPinId);
    
    // 更新されたリストを保存
    await saveAudioPinsList(updatedPins);
  } catch (error) {
    console.error('ローカルオーディオピン削除エラー:', error);
    throw new Error('オーディオピンの削除に失敗しました');
  }
};

/**
 * オーディオピンのメタデータを更新
 */
export const updateLocalAudioPin = async (
  audioPinId: string,
  updates: Partial<Pick<LocalAudioPin, 'title' | 'description'>>
): Promise<LocalAudioPin> => {
  try {
    const existingPins = await getLocalAudioPins();
    const targetIndex = existingPins.findIndex(pin => pin.id === audioPinId);
    
    if (targetIndex === -1) {
      throw new Error('オーディオピンが見つかりません');
    }

    // 更新
    const updatedPin = {
      ...existingPins[targetIndex],
      ...updates,
    };

    existingPins[targetIndex] = updatedPin;
    
    // 保存
    await saveAudioPinsList(existingPins);

    return updatedPin;
  } catch (error) {
    console.error('ローカルオーディオピン更新エラー:', error);
    throw new Error('オーディオピンの更新に失敗しました');
  }
};

/**
 * ローカルストレージの容量情報を取得
 */
export const getStorageInfo = async (): Promise<{
  totalPins: number;
  totalSizeBytes: number;
  directory: string;
}> => {
  try {
    const pins = await getLocalAudioPins();
    let totalSize = 0;

    for (const pin of pins) {
      const fileInfo = await FileSystem.getInfoAsync(pin.audioUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size || 0;
      }
    }

    return {
      totalPins: pins.length,
      totalSizeBytes: totalSize,
      directory: AUDIO_DIRECTORY,
    };
  } catch (error) {
    console.error('ストレージ情報取得エラー:', error);
    return {
      totalPins: 0,
      totalSizeBytes: 0,
      directory: AUDIO_DIRECTORY,
    };
  }
};

/**
 * 全てのローカルデータをクリア（デバッグ用）
 */
export const clearAllLocalData = async (): Promise<void> => {
  try {
    // AsyncStorageをクリア
    await AsyncStorage.removeItem(STORAGE_KEY);
    
    // ディレクトリ内のファイルを削除
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIRECTORY);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(AUDIO_DIRECTORY);
    }
  } catch (error) {
    console.error('ローカルデータクリアエラー:', error);
    throw new Error('データのクリアに失敗しました');
  }
}; 