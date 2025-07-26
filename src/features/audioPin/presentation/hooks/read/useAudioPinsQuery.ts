import { useQuery } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';

interface UseAudioPinsQueryParams {
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  enabled?: boolean;
}

export const useAudioPinsQuery = (params?: UseAudioPinsQueryParams) => {
  const { bounds, enabled = true } = params || {};
  
  return useQuery({
    queryKey: ['audioPins', { bounds }],
    queryFn: () => audioPinService.getAudioPins({ bounds }), // 全てのピンを取得
    enabled,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000, // 15分
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};