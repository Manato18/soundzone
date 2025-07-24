import { DEFAULT_LAYERS, Layer } from '../domain/entities/Layer';

/**
 * レイヤー関連のAPI/データアクセスサービス
 * 現在は固定データを返すが、将来的にはSupabase APIと連携
 */
export class LayersService {
  /**
   * 利用可能なレイヤー一覧を取得
   * 将来的にはSupabaseから動的に取得
   */
  async fetchLayers(): Promise<Layer[]> {
    // 現在は固定のレイヤーを返す
    // 将来的にはSupabaseからデータを取得
    try {
      // シミュレートされた非同期処理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // DEFAULT_LAYERSにisSelectedを追加して返す
      return DEFAULT_LAYERS.map(layer => ({
        ...layer,
        isSelected: true, // 初期状態では全て選択
      }));
    } catch (error) {
      console.error('Failed to fetch layers:', error);
      throw new Error('レイヤーの取得に失敗しました');
    }
  }
  
  /**
   * ユーザー設定を保存
   * 将来的にはSupabaseのユーザープロファイルに保存
   */
  async saveUserLayerPreferences(userId: string, preferences: {
    selectedLayerIds: string[];
    favoriteLayerIds: string[];
    defaultLayerIds: string[];
  }): Promise<void> {
    try {
      // 将来的にはSupabaseに保存
      console.log('Saving user preferences:', { userId, preferences });
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw new Error('ユーザー設定の保存に失敗しました');
    }
  }
  
  /**
   * ユーザー設定を取得
   * 将来的にはSupabaseから取得
   */
  async fetchUserLayerPreferences(userId: string): Promise<{
    selectedLayerIds: string[];
    favoriteLayerIds: string[];
    defaultLayerIds: string[];
  } | null> {
    try {
      // 将来的にはSupabaseから取得
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 現在はnullを返す（ローカルストレージの設定を使用）
      return null;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return null;
    }
  }
  
  /**
   * カスタムレイヤーを作成
   * 将来的な機能拡張用
   */
  async createCustomLayer(layer: Omit<Layer, 'id'>): Promise<Layer> {
    try {
      // 将来的にはSupabaseに保存
      const newLayer: Layer = {
        ...layer,
        id: `custom-${Date.now()}`,
      };
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return newLayer;
    } catch (error) {
      console.error('Failed to create custom layer:', error);
      throw new Error('カスタムレイヤーの作成に失敗しました');
    }
  }
  
  /**
   * レイヤーを更新
   * 将来的な機能拡張用
   */
  async updateLayer(layerId: string, updates: Partial<Layer>): Promise<Layer> {
    try {
      // 将来的にはSupabaseで更新
      const existingLayer = DEFAULT_LAYERS.find(l => l.id === layerId);
      if (!existingLayer) {
        throw new Error('レイヤーが見つかりません');
      }
      
      const updatedLayer: Layer = {
        ...existingLayer,
        ...updates,
        isSelected: updates.isSelected ?? true,
      };
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return updatedLayer;
    } catch (error) {
      console.error('Failed to update layer:', error);
      throw new Error('レイヤーの更新に失敗しました');
    }
  }
  
  /**
   * レイヤーを削除
   * 将来的な機能拡張用（カスタムレイヤーのみ削除可能）
   */
  async deleteLayer(layerId: string): Promise<void> {
    try {
      // デフォルトレイヤーは削除不可
      if (DEFAULT_LAYERS.some(l => l.id === layerId)) {
        throw new Error('デフォルトレイヤーは削除できません');
      }
      
      // 将来的にはSupabaseから削除
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to delete layer:', error);
      throw new Error('レイヤーの削除に失敗しました');
    }
  }
}

// シングルトンインスタンス
export const layersService = new LayersService();