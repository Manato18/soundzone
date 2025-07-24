import { useQuery } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';

interface UseAudioPinsQueryParams {
  layerIds?: string[];
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  enabled?: boolean;
}

export const useAudioPinsQuery = (params?: UseAudioPinsQueryParams) => {
  const { layerIds, bounds, enabled = true } = params || {};
  
  return useQuery({
    queryKey: ['audioPins', { layerIds, bounds }],
    queryFn: () => audioPinService.getAudioPins({ layerIds, bounds }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000, // 15分
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};