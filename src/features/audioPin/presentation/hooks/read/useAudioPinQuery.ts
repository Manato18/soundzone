import { useQuery } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';

interface UseAudioPinQueryParams {
  pinId: string | null;
  enabled?: boolean;
}

export const useAudioPinQuery = ({ pinId, enabled = true }: UseAudioPinQueryParams) => {
  return useQuery({
    queryKey: ['audioPin', pinId],
    queryFn: () => {
      if (!pinId) return null;
      return audioPinService.getAudioPin(pinId);
    },
    enabled: enabled && !!pinId,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000, // 15分
  });
};