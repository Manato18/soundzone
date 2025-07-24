import { useMutation, useQueryClient } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';

interface CreateAudioPinParams {
  title: string;
  description: string;
  audioUrl: string;
  latitude: number;
  longitude: number;
  layerIds: string[];
}

export const useCreateAudioPinMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateAudioPinParams) => 
      audioPinService.createAudioPin(params),
    onSuccess: (newPin) => {
      // キャッシュを無効化してリフレッシュ
      queryClient.invalidateQueries({ queryKey: ['audioPins'] });
      
      // または楽観的更新
      // queryClient.setQueryData(['audioPins'], (oldData: AudioPin[]) => 
      //   [...oldData, newPin]
      // );
      
      if (__DEV__) {
        console.log('[CreateAudioPinMutation] Created pin:', newPin.title);
      }
    },
    onError: (error) => {
      console.error('[CreateAudioPinMutation] Failed to create pin:', error);
    },
  });
};