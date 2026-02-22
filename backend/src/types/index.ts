// 通用类型定义

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  family_size: number;
  baby_age?: number;
  preferences: UserPreferences;
  role?: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  max_prep_time?: number;
  favorite_categories?: string[];
  exclude_ingredients?: string[];
}

export interface JwtPayload {
  user_id: string;
  username: string;
  role?: 'user' | 'admin';
}

// 菜谱相关类型
export interface Recipe {
  id: string;
  name: string;
  name_en?: string;
  type: RecipeType;
  category?: string[];
  prep_time: number;
  cook_time?: number;
  total_time?: number;
  difficulty: Difficulty;
  servings: string;
  adult_version: RecipeVersion;
  baby_version?: RecipeVersion;
  cooking_tips?: string[];
  nutrition_info?: Record<string, any>;
  image_url?: string[];
  video_url?: string;
  tags?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type RecipeType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Difficulty = '简单' | '中等' | '困难';

export interface RecipeVersion {
  ingredients: IngredientItem[];
  steps: RecipeStep[];
  seasonings?: SeasoningItem[];
}

export interface IngredientItem {
  name: string;
  amount: string;
  note?: string;
}

export interface RecipeStep {
  step: number;
  action: string;
  time: number;
  tools?: string[];
  note?: string;
}

export interface SeasoningItem {
  name: string;
  amount: string;
  note?: string;
}

// 食材相关类型
export interface Ingredient {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  unit?: string;
  average_price?: number;
  price_unit?: string;
  shelf_life?: number;
  storage_area?: string;
  nutrition_per_100g?: Record<string, any>;
  image_url?: string;
  created_at: Date;
}

// 餐食计划相关类型
export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: Date;
  meal_type: RecipeType;
  recipe_id: string;
  servings: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DailyPlan {
  date: string;
  meals: {
    breakfast?: RecipeSummary;
    lunch?: RecipeSummary;
    dinner?: RecipeSummary;
  };
}

export interface RecipeSummary {
  id: string;
  name: string;
  image_url?: string[];
  prep_time: number;
}

// 购物清单相关类型
export interface ShoppingList {
  id: string;
  user_id: string;
  list_date: Date;
  items: Record<string, ShoppingListItem[]>;
  total_estimated_cost?: number;
  is_completed: boolean;
  created_at: Date;
}

export interface ShoppingListItem {
  ingredient_id?: string;
  name: string;
  amount: string;
  estimated_price?: number;
  checked: boolean;
  note?: string;
  recipes?: string[];
}

// 收藏相关类型
export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: Date;
}

// ============================================
// 宝宝食谱相关类型（6阶段支持）
// ============================================

// 宝宝阶段枚举
export enum BabyStage {
  EARLY = '6-8m',       // 辅食初期
  EARLY_MID = '8-10m',  // 辅食早期
  MID = '10-12m',       // 辅食中期
  LATE = '12-18m',      // 辅食后期
  TODDLER_EARLY = '18-24m', // 幼儿早期
  TODDLER = '24-36m'   // 幼儿期
}

// 宝宝版本特有字段
export interface BabyVersion {
  age_range: string;           // 适用月龄如 "8-10个月"
  stage: BabyStage;             // 阶段枚举
  texture: string;              // 质地描述
  ingredients: IngredientItem[];   // 食材列表
  steps: RecipeStep[];          // 步骤
  seasonings?: SeasoningItem[];    // 调料（通常为空）
  nutrition_tips: string;      // 营养要点
  allergy_alert: string;       // 过敏提醒
  preparation_notes: string;   // 准备要点
  sync_cooking?: SyncCookingInfo; // 同步烹饪
  nutrition_info?: BabyNutritionInfo; // 营养信息
}

// 宝宝营养信息
export interface BabyNutritionInfo {
  daily_percentage: {
    calories: number;    // 占日推荐量百分比
    protein: number;
    vitamin_a: number;
    vitamin_c: number;
    calcium: number;
    iron: number;
    zinc: number;
  };
  nutrients: {
    calories: number;    // kcal
    protein: number;     // g
    carbs: number;       // g
    fat: number;         // g
    fiber: number;       // g
    vitamin_a: number;   // μg
    vitamin_c: number;   // mg
    calcium: number;     // mg
    iron: number;        // mg
    zinc: number;        // mg
  };
  suitability: 'fully_suitable' | 'partial' | 'not_suitable';
  notes: string;
}

// 同步烹饪信息
export interface SyncCookingInfo {
  can_cook_together: boolean;
  shared_steps: number[];
  time_saving: string;
  tips: string;
}

// 转换请求
export interface TransformRequest {
  baby_age_months: number;
  family_size?: number;
  include_nutrition?: boolean;
  include_sync_cooking?: boolean;
}

// 转换结果
export interface TransformResult {
  success: boolean;
  adult_recipe: Recipe;
  baby_version?: BabyVersion;
  nutrition_info?: BabyNutritionInfo;
  sync_cooking?: SyncCookingInfo;
  cached?: boolean;
  error?: string;
}

// 批量转换请求
export interface BatchTransformRequest {
  recipe_ids: string[];
  baby_age_months: number;
  include_nutrition?: boolean;
}

// 食材月龄映射
export interface IngredientAgeMap {
  minAge: number;
  form: string;
  allergen: boolean;
}

// 烹饪方式月龄适配
export interface CookingMethodAgeAdapter {
  preferred: string[];
  avoid: string[];
}

// 调料月龄规则
export interface SeasoningAgeRule {
  allowed: string[];
  maxSodium: number;
}

// ============================================
// 同步烹饪时间线
// ============================================

export interface SyncTimeline {
  recipe_id: string;
  baby_age_months: number;
  total_time: number;
  time_saved: number;
  phases: TimelinePhase[];
}

export type TimelinePhaseType = 'shared' | 'adult' | 'baby' | 'fork';

export interface TimelinePhase {
  order: number;
  type: TimelinePhaseType;
  target: 'both' | 'adult' | 'baby';
  action: string;
  duration: number;
  tools?: string[];
  note?: string;
  parallel_with?: number;
  timer_required?: boolean;
}
