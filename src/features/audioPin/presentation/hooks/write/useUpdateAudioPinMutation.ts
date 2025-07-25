import { useMutation, useQueryClient } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';

interface UpdateAudioPinParams {
  id: string;
  title?: string;
  description?: string;
  layerIds?: string[];
}

export const useUpdateAudioPinMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: UpdateAudioPinParams) => 
      audioPinService.updateAudioPin(params),
    onSuccess: (updatedPin, variables) => {
      // 個別のピンキャッシュを更新
      if (updatedPin) {
        queryClient.setQueryData(['audioPin', variables.id], updatedPin);
      }
      
      // ピン一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['audioPins'] });
      
      if (__DEV__) {
        console.log('[UpdateAudioPinMutation] Updated pin:', updatedPin?.title);
      }
    },
    onError: (error) => {
      console.error('[UpdateAudioPinMutation] Failed to update pin:', error);
    },
  });
};