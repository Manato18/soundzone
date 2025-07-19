import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../shared/services/supabase';

export interface AudioPinUploadData {
  uri: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface AudioPinResponse {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  duration: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

/**
 * 音声ファイルをSupabase Storageにアップロードし、
 * データベースにオーディオピンのレコードを作成する
 */
export const uploadAudioPin = async (
  data: AudioPinUploadData
): Promise<AudioPinResponse> => {
  try {
    // 1. 音声ファイルを読み込み
    const fileInfo = await FileSystem.getInfoAsync(data.uri);
    if (!fileInfo.exists) {
      throw new Error('音声ファイルが見つかりません');
    }

    // 2. ファイルをBase64で読み込み
    const base64 = await FileSystem.readAsStringAsync(data.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 3. 一意なファイル名を生成
    const fileId = uuidv4();
    const fileName = `${fileId}.m4a`;
    const filePath = `audio-pins/${fileName}`;

    // 4. Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, decode(base64), {
        contentType: 'audio/mp4',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('ストレージアップロードエラー:', uploadError);
      throw new Error('音声ファイルのアップロードに失敗しました');
    }

    // 5. アップロードしたファイルの公開URLを取得
    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('音声ファイルのURLを取得できませんでした');
    }

    // 6. 音声の長さを取得（ファイル情報から推定）
    // TODO: 実際の音声ファイルの長さを取得する実装が必要
    const estimatedDuration = Math.floor(fileInfo.size / 32000); // 大まかな推定

    // 7. 現在のユーザーIDを取得
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('ユーザー認証が必要です');
    }

    // 8. データベースにオーディオピンのレコードを作成
    const { data: audioPinData, error: dbError } = await supabase
      .from('audio_pins')
      .insert({
        id: fileId,
        user_id: userData.user.id,
        title: data.title,
        description: data.description || null,
        audio_url: urlData.publicUrl,
        duration: estimatedDuration,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('データベース挿入エラー:', dbError);
      
      // データベース挿入に失敗した場合、アップロードしたファイルを削除
      await supabase.storage.from('audio-files').remove([filePath]);
      
      throw new Error('オーディオピンの作成に失敗しました');
    }

    // 9. レスポンスデータを構築
    const response: AudioPinResponse = {
      id: audioPinData.id,
      title: audioPinData.title,
      description: audioPinData.description,
      audioUrl: audioPinData.audio_url,
      duration: audioPinData.duration,
      latitude: audioPinData.latitude,
      longitude: audioPinData.longitude,
      createdAt: audioPinData.created_at,
    };

    return response;
  } catch (error) {
    console.error('音声アップロードエラー:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('音声のアップロードに失敗しました');
  }
};

/**
 * 音声ファイルをSupabase Storageから削除する
 */
export const deleteAudioFile = async (audioUrl: string): Promise<void> => {
  try {
    // URLからファイルパスを抽出
    const url = new URL(audioUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // "audio-pins/filename.m4a"

    const { error } = await supabase.storage
      .from('audio-files')
      .remove([filePath]);

    if (error) {
      console.error('ファイル削除エラー:', error);
      throw new Error('音声ファイルの削除に失敗しました');
    }
  } catch (error) {
    console.error('音声ファイル削除エラー:', error);
    throw error;
  }
};

/**
 * オーディオピンをデータベースから削除する
 */
export const deleteAudioPin = async (audioPinId: string): Promise<void> => {
  try {
    // 1. オーディオピンの情報を取得
    const { data: audioPinData, error: fetchError } = await supabase
      .from('audio_pins')
      .select('audio_url')
      .eq('id', audioPinId)
      .single();

    if (fetchError) {
      throw new Error('オーディオピンが見つかりません');
    }

    // 2. データベースからレコードを削除
    const { error: deleteError } = await supabase
      .from('audio_pins')
      .delete()
      .eq('id', audioPinId);

    if (deleteError) {
      throw new Error('オーディオピンの削除に失敗しました');
    }

    // 3. 音声ファイルを削除
    if (audioPinData.audio_url) {
      await deleteAudioFile(audioPinData.audio_url);
    }
  } catch (error) {
    console.error('オーディオピン削除エラー:', error);
    throw error;
  }
}; 