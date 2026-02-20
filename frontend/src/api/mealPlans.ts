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
};
