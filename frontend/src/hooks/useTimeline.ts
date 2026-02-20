import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { SyncTimeline } from '../types';

export function useTimeline(recipeId: string, babyAgeMonths: number, enabled: boolean = false) {
  return useQuery({
    queryKey: ['timeline', recipeId, babyAgeMonths],
    queryFn: async () => {
      const result = await recipesApi.getTimeline(recipeId, babyAgeMonths);
      const data = (result as any)?.data ?? result;
      return data as SyncTimeline;
    },
    enabled: enabled && !!recipeId && babyAgeMonths >= 6,
    staleTime: 5 * 60 * 1000,
  });
}
