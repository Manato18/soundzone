export interface AudioPin {
  id: string;
  title: string;
  userName: string;
  userImage: string;
  audioUrl: any; // require() の戻り値を許可
  description: string;
  latitude: number;
  longitude: number;
  layerIds: string[]; // 複数のレイヤーに属することが可能
  createdAt?: Date; // 投稿日時（オプショナル）
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
} 