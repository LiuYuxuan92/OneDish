// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { babyStagesApi } from '../api/babyStages';

export function useAllBabyStages() {
  return useQuery({
    queryKey: ['babyStages'],
    queryFn: async () => {
      const res = await babyStagesApi.getAll();
      return res.data.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function useBabyStageByAge(months: number | undefined) {
  return useQuery({
    queryKey: ['babyStage', 'by-age', months],
    queryFn: async () => {
      if (!months) return null;
      const res = await babyStagesApi.getByAge(months);
      return res.data.data;
    },
    enabled: !!months,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useStageRecipes(stage: string, filters?: {
  first_intro?: boolean;
  scene_tag?: string;
  nutrient?: string;
}) {
  return useQuery({
    queryKey: ['stageRecipes', stage, filters],
    queryFn: async () => {
      const res = await babyStagesApi.getRecipesByStage(stage, filters);
      return res.data.data;
    },
    enabled: !!stage,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
