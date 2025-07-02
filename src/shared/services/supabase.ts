import { createClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '../../../env.config';

// Supabaseクライアントを作成
export const supabase = createClient(
  ENV_CONFIG.SUPABASE_URL,
  ENV_CONFIG.SUPABASE_ANON_KEY
);

// 認証状態の型定義
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    user_metadata: {
      name?: string;
      avatar_url?: string;
    };
  };
} | null; 