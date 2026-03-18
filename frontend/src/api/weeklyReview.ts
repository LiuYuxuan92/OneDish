import { apiClient } from './client';

export interface WeeklyReviewRecipeMeta {
  recipe_id: string;
  recipe_name: string;
  image_url?: string[] | string | null;
  feedback_count: number;
  accepted_level: 'like' | 'ok' | 'reject';
}

export interface WeeklyReviewSuggestion {
  type: 'retry' | 'continue' | 'explore' | 'cautious';
  recipe_id?: string;
  recipe_name?: string;
  reason: string;
}

export interface WeeklyReviewData {
  total_feedback_count: number;
  feeding_days_count: number;
  unique_recipes_count: number;
  new_recipe_count: number;
  like_count: number;
  ok_count: number;
  reject_count: number;
  allergy_flag_count: number;
  top_accepted_recipes: WeeklyReviewRecipeMeta[];
  cautious_recipes: WeeklyReviewRecipeMeta[];
  trend_signal: 'improving' | 'declining' | 'stable' | null;
  next_week_suggestions: WeeklyReviewSuggestion[];
}

export interface WeeklyReviewResponse {
  week_start?: string;
  week_end?: string;
  review: WeeklyReviewData | null;
  generated_at?: string;
  cached?: boolean;
}

export const weeklyReviewApi = {
  getWeekly: (params?: { week_start?: string; child_id?: string }) =>
    apiClient.get<WeeklyReviewResponse>('/feeding-reviews/weekly', { params }),

  regenerate: (params: { week_start: string; child_id?: string }) =>
    apiClient.post<WeeklyReviewResponse>('/feeding-reviews/weekly/regenerate', params),
};
