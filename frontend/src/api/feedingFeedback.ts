import { apiClient } from './client';

export type FeedingAcceptedLevel = 'like' | 'ok' | 'reject';

export interface FeedingFeedbackItem {
  id: string;
  user_id: string;
  recipe_id: string;
  meal_plan_id?: string | null;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag: boolean;
  note?: string | null;
  created_at: string;
  updated_at: string;
  recipe_name?: string | null;
  recipe_image_url?: string[] | string | null;
}

export interface CreateFeedingFeedbackParams {
  recipe_id: string;
  meal_plan_id?: string;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag?: boolean;
  note?: string;
}

export const feedingFeedbackApi = {
  create: (params: CreateFeedingFeedbackParams) =>
    apiClient.post<FeedingFeedbackItem>('/feeding-feedbacks', params),

  recent: (params?: { limit?: number; recipe_id?: string }) =>
    apiClient.get<{ items: FeedingFeedbackItem[] }>('/feeding-feedbacks/recent', { params }),
};
