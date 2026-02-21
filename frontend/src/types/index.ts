// API 响应类型
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

// 用户类型
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  family_size: number;
  baby_age?: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  max_prep_time?: number;
  favorite_categories?: string[];
  exclude_ingredients?: string[];
}

// 菜谱类型
export type RecipeType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Difficulty = '简单' | '中等' | '困难';

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
  is_favorited?: boolean;
}

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
}

export interface RecipeSummary {
  id: string;
  name: string;
  image_url?: string[];
  prep_time: number;
  source?: 'local' | 'tianxing' | 'ai';
  stage?: string;
  first_intro?: boolean;
  key_nutrients?: string[];
  scene_tags?: string[];
  texture_level?: string;
}

// 餐食计划类型
export interface DailyPlan {
  date: string;
  meals: {
    breakfast?: RecipeSummary;
    lunch?: RecipeSummary;
    dinner?: RecipeSummary;
  };
}

export interface WeeklyPlan {
  start_date: string;
  end_date: string;
  plans: Record<string, DailyPlan>;
}

// 购物清单类型
export interface ShoppingList {
  id: string;
  date: string;
  items: Record<string, ShoppingListItem[]>;
  total_estimated_cost?: number;
  total_items?: number;
  unchecked_items?: number;
  is_completed?: boolean;
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

// ============================================
// 宝宝食谱类型（6阶段支持）
// ============================================

export type BabyStage =
  | '6-8m'      // 辅食初期
  | '8-10m'     // 辅食早期
  | '10-12m'    // 辅食中期
  | '12-18m'    // 辅食后期
  | '18-24m'    // 幼儿早期
  | '24-36m';   // 幼儿期

export interface BabyVersion {
  age_range: string;
  stage: BabyStage;
  texture: string;
  ingredients: IngredientItem[];
  steps: RecipeStep[];
  seasonings?: SeasoningItem[];
  nutrition_tips: string;
  allergy_alert: string;
  preparation_notes: string;
  sync_cooking?: SyncCookingInfo;
  nutrition_info?: BabyNutritionInfo;
}

export interface BabyNutritionInfo {
  daily_percentage: {
    calories: number;
    protein: number;
    vitamin_a: number;
    vitamin_c: number;
    calcium: number;
    iron: number;
    zinc: number;
  };
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
  suitability: 'fully_suitable' | 'partial' | 'not_suitable';
  notes: string;
}

export interface SyncCookingInfo {
  can_cook_together: boolean;
  shared_steps: number[];
  time_saving: string;
  tips: string;
}

// ============================================
// 同步烹饪时间线
// ============================================

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

export interface SyncTimeline {
  recipe_id: string;
  baby_age_months: number;
  total_time: number;
  time_saved: number;
  phases: TimelinePhase[];
}

// 导航类型
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Recipes: undefined;
  Plan: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string; babyAgeMonths: number };
};

export type RecipeStackParamList = {
  RecipeList: { ingredient?: string; type?: string; difficulty?: string } | undefined;
  RecipeDetail: { recipeId: string; babyAgeMonths?: number };
  Search: undefined;
  CookingMode: { recipeId: string; babyAgeMonths: number };
  BabyStages: undefined;
  StageDetail: { stage: BabyStageKey; stageName: string };
};

export type PlanStackParamList = {
  WeeklyPlan: undefined;
  ShoppingList: undefined;
  ShoppingListDetail: { listId: string };
  ShoppingListHistory: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string; babyAgeMonths: number };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Favorites: undefined;
  EditProfile: undefined;
  Inventory: undefined;
  MyRecipes: undefined;
};

// ============================================
// 宝宝阶段类型
// ============================================

export type BabyStageKey = '6-8m' | '8-10m' | '10-12m' | '12-18m' | '18-24m' | '24-36m';

export interface BabyStageGuide {
  stage: BabyStageKey;
  name: string;
  age_range: string;
  age_min: number;
  age_max: number;
  can_eat: string[];
  cannot_eat: string[];
  texture_desc: string;
  meal_frequency: string;
  key_nutrients: string[];
  guide_tips: string[];
}
