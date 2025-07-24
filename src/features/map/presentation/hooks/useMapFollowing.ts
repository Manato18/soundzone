import { useMapStore } from '../../application/map-store';

/**
 * 地図のユーザー位置追従管理フック
 * ユーザーの現在位置への自動追従機能を管理
 */
export const useMapFollowing = () => {
  const isFollowingUser = useMapStore((state) => state.isFollowingUser);
  const setIsFollowingUser = useMapStore((state) => state.setIsFollowingUser);

  const startFollowing = () => setIsFollowingUser(true);
  const stopFollowing = () => setIsFollowingUser(false);
  const toggleFollowing = () => setIsFollowingUser(!isFollowingUser);

  return {
    isFollowingUser,
    startFollowing,
    stopFollowing,
    toggleFollowing,
  };
};