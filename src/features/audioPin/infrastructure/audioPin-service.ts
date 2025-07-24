import { AudioPin } from '../domain/entities/AudioPin';

// モックデータ（将来的にはSupabaseから取得）
const MOCK_AUDIO_PINS: AudioPin[] = [
  {
    id: '1',
    title: '京都駅の音風景',
    userName: 'Andrew Daniels',
    userImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin1.wav'),
    description: '京都駅周辺の賑やかな音を収録しました。新幹線の音や人々の声が聞こえます。',
    latitude: 35.0116,
    longitude: 135.7681,
    layerIds: ['layer-tourism'],
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: '2',
    title: '清水寺の鐘の音',
    userName: 'Sarah Johnson',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin2.wav'),
    description: '清水寺の美しい鐘の音と、参拝者の足音を録音しました。',
    latitude: 35.0395,
    longitude: 135.7290,
    layerIds: ['layer-culture', 'layer-tourism'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: '伏見稲荷の自然音',
    userName: 'Mike Chen',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    audioUrl: require('../../../../assets/sounds/pin3.wav'),
    description: '伏見稲荷大社の千本鳥居を歩く音と、鳥のさえずりを収録しました。',
    latitude: 35.0394,
    longitude: 135.7290,
    layerIds: ['layer-culture', 'layer-nature'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

interface GetAudioPinsParams {
  layerIds?: string[];
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
}

interface CreateAudioPinParams {
  title: string;
  description: string;
  audioUrl: string;
  latitude: number;
  longitude: number;
  layerIds: string[];
}

interface UpdateAudioPinParams {
  id: string;
  title?: string;
  description?: string;
  layerIds?: string[];
}

class AudioPinService {
  /**
   * 音声ピン一覧を取得
   * @param params フィルタリングパラメータ
   * @returns 音声ピンの配列
   */
  async getAudioPins(params?: GetAudioPinsParams): Promise<AudioPin[]> {
    // 模擬的な遅延
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let pins = [...MOCK_AUDIO_PINS];
    
    // レイヤーでフィルタリング
    if (params?.layerIds && params.layerIds.length > 0) {
      pins = pins.filter(pin => 
        pin.layerIds.some(layerId => params.layerIds!.includes(layerId))
      );
    }
    
    // 範囲でフィルタリング
    if (params?.bounds) {
      const { northEast, southWest } = params.bounds;
      pins = pins.filter(pin => 
        pin.latitude >= southWest.latitude &&
        pin.latitude <= northEast.latitude &&
        pin.longitude >= southWest.longitude &&
        pin.longitude <= northEast.longitude
      );
    }
    
    return pins;
  }
  
  /**
   * 単一の音声ピンを取得
   * @param id ピンID
   * @returns 音声ピン
   */
  async getAudioPin(id: string): Promise<AudioPin | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const pin = MOCK_AUDIO_PINS.find(p => p.id === id);
    return pin || null;
  }
  
  /**
   * 音声ピンを作成
   * @param params 作成パラメータ
   * @returns 作成された音声ピン
   */
  async createAudioPin(params: CreateAudioPinParams): Promise<AudioPin> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newPin: AudioPin = {
      id: `${Date.now()}`,
      userName: 'Current User', // 実際の実装では認証ユーザー情報を使用
      userImage: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop&crop=face',
      createdAt: new Date(),
      ...params,
    };
    
    // モックなので実際にはデータを保存しない
    // 将来的にはSupabaseに保存
    console.log('[AudioPinService] Created pin:', newPin);
    
    return newPin;
  }
  
  /**
   * 音声ピンを更新
   * @param params 更新パラメータ
   * @returns 更新された音声ピン
   */
  async updateAudioPin(params: UpdateAudioPinParams): Promise<AudioPin | null> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const pin = MOCK_AUDIO_PINS.find(p => p.id === params.id);
    if (!pin) return null;
    
    const updatedPin = {
      ...pin,
      ...params,
    };
    
    console.log('[AudioPinService] Updated pin:', updatedPin);
    
    return updatedPin;
  }
  
  /**
   * 音声ピンを削除
   * @param id ピンID
   * @returns 成功/失敗
   */
  async deleteAudioPin(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const exists = MOCK_AUDIO_PINS.some(p => p.id === id);
    if (!exists) return false;
    
    console.log('[AudioPinService] Deleted pin:', id);
    
    return true;
  }
}

export const audioPinService = new AudioPinService();