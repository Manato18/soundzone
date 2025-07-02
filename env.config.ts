import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

/**
 * 環境変数設定
 * .envファイルを作成して以下の変数を設定してください
 */

export const ENV_CONFIG = {
  // Supabase設定
  SUPABASE_URL: SUPABASE_URL || '',
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || '',
  
  // Google Maps API Key (将来使用予定)
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

// 開発時の警告
if (__DEV__) {
  if (!ENV_CONFIG.SUPABASE_URL || !ENV_CONFIG.SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase環境変数が設定されていません。.envファイルを作成してください。');
  }
} 