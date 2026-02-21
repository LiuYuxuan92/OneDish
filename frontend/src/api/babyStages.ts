import { apiClient } from './client';
import type { BabyStageGuide, RecipeSummary } from '../types';

export const babyStagesApi = {
  getAll: () =>
    apiClient.get<BabyStageGuide[]>('/baby-stages'),

  getByStage: (stage: string) =>
    apiClient.get<BabyStageGuide>(`/baby-stages/${stage}`),

  getByAge: (months: number) =>
    apiClient.get<BabyStageGuide | null>(`/baby-stages/by-age/${months}`),

  getRecipesByStage: (stage: string, params?: {
    first_intro?: boolean;
    scene_tag?: string;
    nutrient?: string;
  }) =>
    apiClient.get<RecipeSummary[]>(`/baby-stages/${stage}/recipes`, { params }),
};
