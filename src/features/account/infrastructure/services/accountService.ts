import { supabase } from '../../../../shared/services/supabase';
import { Profile, QueryProfile } from '../../domain/entities/Profile';
import { StorageError } from '@supabase/storage-js';

// Infrastructure Layer: Supabase APIとの通信
export class AccountService {
  constructor() {
    // メソッドのthisコンテキストをバインド
    this.createProfile = this.createProfile.bind(this);
    this.fetchProfile = this.fetchProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.checkProfileExists = this.checkProfileExists.bind(this);
    this.uploadAvatar = this.uploadAvatar.bind(this);
    this.deleteAvatar = this.deleteAvatar.bind(this);
  }

  // プロフィール作成
  // 注: 認証チェックは呼び出し側の責任で行う
  async createProfile(params: {
    userId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl?: string;
    bio: string;
  }): Promise<QueryProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: params.userId,
          email: params.email,
          email_verified: params.emailVerified,
          display_name: params.displayName,
          avatar_url: params.avatarUrl || null,
          bio: params.bio,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'プロフィールの作成に失敗しました');
      }

      return this.mapToQueryProfile(data);
    } catch (error) {
      throw error;
    }
  }

  // プロフィール取得
  async fetchProfile(userId: string): Promise<QueryProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // レコードが見つからない場合
          return null;
        }
        throw new Error(error.message || 'プロフィールの取得に失敗しました');
      }

      return data ? this.mapToQueryProfile(data) : null;
    } catch (error) {
      throw error;
    }
  }

  // プロフィール更新
  async updateProfile(
    userId: string,
    updates: Partial<Pick<QueryProfile, 'displayName' | 'avatarUrl' | 'bio'>>
  ): Promise<QueryProfile> {
    try {
      const updateData: any = {};
      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) updateData.bio = updates.bio;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'プロフィールの更新に失敗しました');
      }

      return this.mapToQueryProfile(data);
    } catch (error) {
      throw error;
    }
  }

  // プロフィール存在確認
  async checkProfileExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // レコードが見つからない場合
          return false;
        }
        throw new Error(error.message || 'プロフィールの確認に失敗しました');
      }

      return !!data;
    } catch (error) {
      throw error;
    }
  }

  // アバター画像アップロード
  async uploadAvatar(params: {
    userId: string;
    file: File | Blob;
    onProgress?: (progress: number) => void;
  }): Promise<string> {
    try {
      const fileExt = params.file instanceof File 
        ? params.file.name.split('.').pop() 
        : 'jpg';
      const fileName = `${params.userId}/${Date.now()}.${fileExt}`;

      // アップロード実行
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, params.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        if ('statusCode' in error && error.statusCode === 413) {
          throw new Error('画像サイズが大きすぎます。5MB以下の画像を選択してください');
        }
        throw new Error(error.message || 'アバター画像のアップロードに失敗しました');
      }

      // 公開URLを取得
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      throw error;
    }
  }

  // 既存のアバター画像削除
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // URLからファイルパスを抽出
      const url = new URL(avatarUrl);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.*)/);
      if (!pathMatch) return;

      const filePath = pathMatch[1];
      
      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (error) {
        // 削除エラーは無視（既に削除されている可能性があるため）
      }
    } catch (error) {
      // 削除エラーは無視
    }
  }

  // Supabaseのデータ形式をQueryProfileにマッピング
  private mapToQueryProfile(data: any): QueryProfile {
    return {
      userId: data.user_id,
      email: data.email,
      emailVerified: data.email_verified,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bio: data.bio || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// シングルトンインスタンス
export const accountService = new AccountService();