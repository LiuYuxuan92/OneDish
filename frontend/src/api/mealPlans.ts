import { apiClient } from './client';

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string;
  servings: number;
  created_at: string;
}

export interface WeeklyPlanResponse {
  start_date: string;
  end_date: string;
  plans: {
    [date: string]: {
      [meal_type: string]: MealPlan;
    };
  };
}

export interface GenerateWeeklyPlanParams {
  start_date?: string;
  baby_age_months?: number;
  exclude_ingredients?: string[];
  preferences?: {
    exclude_recipes?: string[];
    max_prep_time?: number;
    include_baby_meals?: boolean;
  };
}

export interface SmartRecommendationParams {
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'all-day';
  baby_age_months?: number;
  max_prep_time?: number;
  inventory?: string[];
  exclude_ingredients?: string[];
}

export interface SmartRecommendationItem {
  id: string;
  name: string;
  image_url?: string;
  time_estimate: number;
  missing_ingredients: string[];
  baby_suitable: boolean;
  switch_hint: string;
  explain?: string[];
  ranking_reasons?: Array<{ code: string; label: string; contribution: number; detail?: string }>;
  vs_last?: string;
}

export interface SmartRecommendationResponse {
  meal_type: string;
  constraints: Record<string, any>;
  recommendations: Record<string, { A: SmartRecommendationItem | null; B: SmartRecommendationItem | null }>;
}

export interface RecommendationFeedbackParams {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'all-day';
  selected_option: 'A' | 'B' | 'NONE';
  reject_reason?: string;
  event_time?: string;
}

export interface RecommendationFeedbackStats {
  window_days: number;
  total: number;
  accepted: number;
  rejected: number;
  adoption_rate: number;
  reject_reason_top: Array<{ reason: string; count: number }>;
}

export const mealPlansApi = {
  // 获取一周计划
  getWeekly: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get<WeeklyPlanResponse>('/meal-plans/weekly', { params }),

  // 设置餐食计划
  setMealPlan: (data: {
    date: string;
    meal_type: string;
    recipe_id: string;
    servings?: number;
  }) =>
    apiClient.post<{ plan_id: string }>('/meal-plans', {
      plan_date: data.date,
      meal_type: data.meal_type,
      recipe_id: data.recipe_id,
      servings: data.servings || 2,
    }),

  // 生成一周智能计划
  generateWeekly: (params?: GenerateWeeklyPlanParams) =>
    apiClient.post<WeeklyPlanResponse>('/meal-plans/generate', params),

  // 删除餐食计划
  deleteMealPlan: (planId: string) =>
    apiClient.delete(`/meal-plans/${planId}`),

  // 标记餐食为已完成
  markMealComplete: (planId: string) =>
    apiClient.post(`/meal-plans/${planId}/complete`),

  // 三餐智能推荐V1（A/B方案）
  getSmartRecommendations: (params?: SmartRecommendationParams) =>
    apiClient.post<SmartRecommendationResponse>('/meal-plans/recommendations', params),

  // 推荐反馈闭环 V1
  submitRecommendationFeedback: (params: RecommendationFeedbackParams) =>
    apiClient.post<{ accepted: boolean; id: string }>('/meal-plans/recommendations/feedback', params),

  getRecommendationFeedbackStats: (days = 7) =>
    apiClient.get<RecommendationFeedbackStats>(`/meal-plans/recommendations/feedback/stats?days=${days}`),
};
