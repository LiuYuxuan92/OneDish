import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { weeklyReviewApi } from '../api/weeklyReview';

export function useWeeklyReview(params?: { week_start?: string; child_id?: string }) {
  return useQuery({
    queryKey: ['weeklyReview', params],
    queryFn: async () => {
      const result = await weeklyReviewApi.getWeekly(params);
      return result?.data || result || null;
    },
    staleTime: 60 * 1000,
  });
}

export function useRegenerateWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { week_start: string; child_id?: string }) => {
      const result = await weeklyReviewApi.regenerate(params);
      return result?.data || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyReview'] });
    },
  });
}
