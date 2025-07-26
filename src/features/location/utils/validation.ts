import { UserLocationData } from '../domain/entities/Location';

/**
 * 座標値が有効かどうかをチェックする
 * @param coords 座標オブジェクト
 * @returns 有効な座標値の場合true
 */
export const isValidCoordinates = (coords: { latitude: number; longitude: number }): boolean => {
  // 0,0は無効な座標として扱う（GPS未取得の初期値）
  if (coords.latitude === 0 && coords.longitude === 0) {
    return false;
  }
  
  // 緯度の有効範囲: -90 〜 90
  if (coords.latitude < -90 || coords.latitude > 90) {
    return false;
  }
  
  // 経度の有効範囲: -180 〜 180
  if (coords.longitude < -180 || coords.longitude > 180) {
    return false;
  }
  
  // NaNチェック
  if (isNaN(coords.latitude) || isNaN(coords.longitude)) {
    return false;
  }
  
  return true;
};

/**
 * 位置情報オブジェクト全体が有効かどうかをチェックする
 * @param location 位置情報オブジェクト
 * @returns 有効な位置情報の場合true
 */
export const isValidLocation = (location: UserLocationData | null): location is UserLocationData => {
  if (!location) {
    return false;
  }
  
  if (!location.coords) {
    return false;
  }
  
  return isValidCoordinates(location.coords);
};

/**
 * 位置情報の精度が許容範囲内かどうかをチェックする
 * @param accuracy 精度（メートル）
 * @param maxAccuracy 最大許容精度（デフォルト: 100m）
 * @returns 許容範囲内の場合true
 */
export const isAcceptableAccuracy = (accuracy: number | null, maxAccuracy: number = 100): boolean => {
  if (accuracy === null || accuracy === undefined) {
    return false;
  }
  
  if (isNaN(accuracy) || accuracy < 0) {
    return false;
  }
  
  return accuracy <= maxAccuracy;
};

/**
 * 2つの座標間の距離を計算する（ハバーサイン公式）
 * @param coord1 座標1
 * @param coord2 座標2
 * @returns 距離（メートル）
 */
export const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};