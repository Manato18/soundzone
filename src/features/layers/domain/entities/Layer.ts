export enum LayerType {
  TOURISM = 'tourism',      // 観光地
  GOURMET = 'gourmet',      // グルメ
  CULTURE = 'culture',      // 文化・歴史
  NATURE = 'nature',        // 自然
  EVENT = 'event'           // イベント
}

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  icon: string;        // Ioniconsのアイコン名
  color: string;       // レイヤーのテーマカラー
  description?: string;
}

// 固定の5つのレイヤー定義
export const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'layer-tourism',
    type: LayerType.TOURISM,
    name: '観光地',
    icon: 'camera-outline',
    color: '#FF6B6B',
    description: '観光スポットや名所'
  },
  {
    id: 'layer-gourmet',
    type: LayerType.GOURMET,
    name: 'グルメ',
    icon: 'restaurant-outline',
    color: '#4ECDC4',
    description: 'レストランや飲食店'
  },
  {
    id: 'layer-culture',
    type: LayerType.CULTURE,
    name: '文化',
    icon: 'library-outline',
    color: '#45B7D1',
    description: '寺社仏閣や歴史的建造物'
  },
  {
    id: 'layer-nature',
    type: LayerType.NATURE,
    name: '自然',
    icon: 'leaf-outline',
    color: '#96CEB4',
    description: '公園や自然スポット'
  },
  {
    id: 'layer-event',
    type: LayerType.EVENT,
    name: 'イベント',
    icon: 'calendar-outline',
    color: '#FFEAA7',
    description: 'イベントや催し物'
  }
]; 