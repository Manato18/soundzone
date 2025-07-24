import { useMutation, useQueryClient } from '@tanstack/react-query';
import { audioPinService } from '../../../infrastructure/audioPin-service';
import { useAudioPinActions } from '../../../application/audioPin-store';

export const useDeleteAudioPinMutation = () => {
  const queryClient = useQueryClient();
  const { clearSelectedPin } = useAudioPinActions();
  
  return useMutation({
    mutationFn: (pinId: string) => 
      audioPinService.deleteAudioPin(pinId),
    onSuccess: (success, pinId) => {
      if (success) {
        // ストアから選択されたピンをクリア（削除されたピンが選択されていた場合）
        clearSelectedPin();
        
        // 個別のピンキャッシュを削除
        queryClient.removeQueries({ queryKey: ['audioPin', pinId] });
        
        // ピン一覧のキャッシュを無効化
        queryClient.invalidateQueries({ queryKey: ['audioPins'] });
        
        if (__DEV__) {
          console.log('[DeleteAudioPinMutation] Deleted pin:', pinId);
        }
      }
    },
    onError: (error) => {
      console.error('[DeleteAudioPinMutation] Failed to delete pin:', error);
    },
  });
};