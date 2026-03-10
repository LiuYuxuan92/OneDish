import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { feedingFeedbackApi, type CreateFeedingFeedbackParams } from '../api/feedingFeedback';
import { buildMockFeedingFeedback, shouldUseWebMockFallback } from '../mock/webFallback';

export function useRecentFeedingFeedback(params?: { limit?: number; recipe_id?: string }) {
  return useQuery({
    queryKey: ['feedingFeedback', 'recent', params],
    queryFn: async () => {
      try {
        const result: any = await feedingFeedbackApi.recent(params);
        return result?.items || result?.data?.items || [];
      } catch (error) {
        if (Platform.OS === 'web' && shouldUseWebMockFallback(error)) {
          const items = buildMockFeedingFeedback().items;
          return params?.recipe_id
            ? items.filter((item) => item.recipe_id === params.recipe_id)
            : items;
        }
        throw error;
      }
    },
    staleTime: 60 * 1000,
    retry: Platform.OS === 'web' ? 0 : 1,
  });
}

export function useCreateFeedingFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateFeedingFeedbackParams) => {
      const result = await feedingFeedbackApi.create(params);
      return result?.data || result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedingFeedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedingFeedback', 'recent', { recipe_id: variables.recipe_id }] });
    },
  });
}
