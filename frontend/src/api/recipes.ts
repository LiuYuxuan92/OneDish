import { apiClient } from './client';
import { Recipe, RecipeSummary, PaginationParams, PaginationResult, SyncTimeline } from '../types';

// 转换请求参数
export interface TransformRecipeParams {
  baby_age_months: number;
  family_size?: number;
  include_nutrition?: boolean;
  include_sync_cooking?: boolean;
}

// 转换结果
export interface TransformResult {
  success: boolean;
  adult_recipe: Recipe;
  baby_version?: {
    age_range: string;
    stage: string;
    texture: string;
    ingredients: Array<{ name: string; amount: string; note?: string }>;
    steps: Array<{ step: number; action: string; time: number; note?: string }>;
    seasonings?: Array<{ name: string; amount: string; note?: string }>;
    nutrition_tips: string;
    allergy_alert: string;
    preparation_notes: string;
    sync_cooking?: {
      can_cook_together: boolean;
      shared_steps: number[];
      time_saving: string;
      tips: string;
    };
  };
  nutrition_info?: {
    nutrients: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      vitamin_a: number;
      vitamin_c: number;
      calcium: number;
      iron: number;
      zinc: number;
    };
    daily_percentage: {
      calories: number;
      protein: number;
      vitamin_a: number;
      vitamin_c: number;
      calcium: number;
      iron: number;
      zinc: number;
    };
    suitability: 'fully_suitable' | 'partial' | 'not_suitable';
    notes: string;
  };
  sync_cooking?: {
    can_cook_together: boolean;
    shared_steps: number[];
    time_saving: string;
    tips: string;
  };
  cached?: boolean;
  error?: string;
}

// 平铺搜索结果转换请求（AI/联网菜谱）
export interface TransformRawParams {
  name: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  baby_age_months: number;
}

// 批量转换请求
export interface BatchTransformParams {
  recipe_ids: string[];
  baby_age_months: number;
  include_nutrition?: boolean;
}

export const recipesApi = {
  // 获取所有菜谱
  getAll: () =>
    apiClient.get<PaginationResult<RecipeSummary>>('/recipes'),

  // 获取今日推荐
  getDaily: (params?: { type?: string; max_time?: number }) =>
    apiClient.get<{ date: string; recipe: Recipe }>('/recipes/daily', { params }),

  // 获取菜谱详情
  getDetail: (recipeId: string) =>
    apiClient.get<Recipe>(`/recipes/${recipeId}`),

  // 搜索菜谱
  search: (params: PaginationParams & {
    keyword?: string;
    type?: string;
    category?: string;
    max_time?: number;
    difficulty?: string;
  }) =>
    apiClient.get<PaginationResult<RecipeSummary>>('/recipes', { params }),

  // 获取分类
  getCategories: () =>
    apiClient.get<{
      types: string[];
      categories: string[];
      difficulties: string[];
    }>('/recipes/categories'),

  // 转换成人食谱为宝宝版
  transform: (recipeId: string, params: TransformRecipeParams) =>
    apiClient.post<TransformResult>(`/recipes/${recipeId}/transform`, params),

  // 将平铺搜索结果转换为宝宝版
  transformRaw: (params: TransformRawParams) =>
    apiClient.post<TransformResult>('/recipes/transform/raw', params),

  // 批量转换食谱
  batchTransform: (params: BatchTransformParams) =>
    apiClient.post<{
      total: number;
      results: TransformResult[];
    }>('/recipes/transform/batch', params),

  // 获取同步烹饪时间线
  getTimeline: (recipeId: string, babyAgeMonths: number) =>
    apiClient.post<SyncTimeline>(`/recipes/${recipeId}/timeline`, {
      baby_age_months: babyAgeMonths,
    }),

  // 根据即将过期食材推荐菜谱
  suggestByInventory: () =>
    apiClient.get<{
      expiring_ingredients: Array<{ ingredient_name: string; quantity: number; unit: string; expiry_date: string }>;
      suggestions: Array<{ id: string; name: string; type: string; prep_time: number; image_url: string; matched_ingredients: string[]; match_count: number }>;
    }>('/recipes/suggest-by-inventory'),
};
