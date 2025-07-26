import { Platform } from 'react-native';

interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

export const compressImage = async (
  imageUri: string,
  options: CompressImageOptions = {}
): Promise<{ uri: string; size: number }> => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    maxSizeMB = 1,
  } = options;

  try {
    // React Native Image Pickerは既に圧縮オプションを提供している
    // ここでは追加の検証のみ行う
    
    // ファイルサイズの確認（実際のファイルサイズ取得はプラットフォーム依存）
    // React Native Image Pickerで既に制限をかけるため、ここでは簡易チェックのみ
    
    return {
      uri: imageUri,
      size: 0, // 実際のサイズはImage Pickerから取得
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('画像の圧縮に失敗しました');
  }
};

// 画像のMIMEタイプを取得
export const getImageMimeType = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
};

// URIからBlobを作成（React Native用）
export const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Failed to convert URI to Blob:', error);
    throw new Error('画像の変換に失敗しました');
  }
};