import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedingFeedbackApi, type CreateFeedingFeedbackParams } from '../api/feedingFeedback';

export function useRecentFeedingFeedback(params?: { limit?: number; recipe_id?: string }) {
  return useQuery({
    queryKey: ['feedingFeedback', 'recent', params],
    queryFn: async () => {
      const result: any = await feedingFeedbackApi.recent(params);
      return result?.items || result?.data?.items || [];
    },
    staleTime: 60 * 1000,
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
