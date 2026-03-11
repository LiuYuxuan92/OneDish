import type { Recipe, RecipeSummary, RecipeVersion, SyncTimeline, User } from '../types';
import type { FeedingFeedbackItem } from '../api/feedingFeedback';
import type { AIBabyVersionResult } from '../api/pairing';
import type { MealPlan, WeeklyPlanResponse, SmartRecommendationItem } from '../api/mealPlans';
import type { ShoppingList, ShoppingListItem } from '../api/shoppingLists';

export type DualType = 'dual' | 'baby-friendly' | 'baby-only' | 'family-only';
export type StatusTagType =
  | 'in-plan'
  | 'on-shopping-list'
  | 'needs-adaptation'
  | 'previously-rejected'
  | 'retry-suggested'
  | 'low-confidence'
  | 'pantry-covered'
  | 'few-missing'
  | 'updated-by-other';

export type FeedbackAcceptance = 'loved' | 'okay' | 'cautious' | 'rejected';
export type ExtraPrepLevel = 'none' | 'minimal' | 'moderate' | 'heavy';
export type MealReadiness = 'ready' | 'partial' | 'needs-shopping' | 'unknown';

export interface BabySuitabilityChipModel {
  key: string;
  label: string;
  tone: 'success' | 'warning' | 'neutral' | 'accent';
}

export interface AdaptationSummaryModel {
  method?: string;
  texture?: string;
  splitStep?: number;
  extraPrep?: ExtraPrepLevel;
  allergenNotes?: string[];
  babySteps?: string[];
  summary?: string;
}

export interface RecipeDisplayModel {
  id: string;
  title: string;
  image?: string;
  cookTimeText: string;
  difficultyLabel: string;
  servingsLabel: string;
  dualType: DualType;
  whyItFits?: string;
  recommendationReasons: string[];
  statusTags: Array<{ type: StatusTagType; detail?: string }>;
  babySuitability: {
    minAgeMonths?: number;
    currentAgeSuitable?: boolean;
    texture?: string;
    extraPrep?: ExtraPrepLevel;
    sharedMeal?: boolean;
    chips: BabySuitabilityChipModel[];
  };
  adaptation?: AdaptationSummaryModel;
  feedback?: {
    latest?: FeedbackAcceptance;
    count?: number;
  };
  source?: 'local' | 'tianxing' | 'ai';
}

export interface RecommendationCardViewModel {
  recipe: RecipeDisplayModel;
  tags: string[];
}

export interface PlannedMealCardViewModel {
  planId?: string;
  slotKey: string;
  slotLabel: string;
  recipe?: RecipeDisplayModel;
  completionStatus: 'planned' | 'completed' | 'empty';
  acceptance?: FeedbackAcceptance;
  isBabyFriendly?: boolean;
  prepMinutes?: number;
  readiness: MealReadiness;
  readinessLabel: string;
  adaptation?: AdaptationSummaryModel;
}

export interface WeeklyPlanDayViewModel {
  date: string;
  meals: PlannedMealCardViewModel[];
}

export interface ShoppingListSummaryViewModel {
  listId: string;
  totalItems: number;
  uncheckedItems: number;
  coveredCount: number;
  missingCount: number;
  pantryCoverageRatio: number;
  readinessPercent: number;
  itemStatuses: Array<{ name: string; status: StatusTagType; detail?: string }>;
}

export interface WeeklyPlanSummaryViewModel {
  totalMeals: number;
  completedMeals: number;
  babyFriendlyMeals: number;
  totalPrepTime: number;
  todayCount: number;
  completionPercent: number;
}

export interface WeeklyPlanPageViewModel {
  days: WeeklyPlanDayViewModel[];
  today?: WeeklyPlanDayViewModel;
  summary: WeeklyPlanSummaryViewModel;
  shoppingSummary: ShoppingListSummaryViewModel | null;
  hasPlans: boolean;
}

export interface RecipeAdapterContext {
  babyAgeMonths?: number;
  inPlan?: boolean;
  onShoppingList?: boolean;
  latestFeedback?: FeedingFeedbackItem | null;
  shoppingReadiness?: MealReadiness;
  aiBabyVersion?: AIBabyVersionResult | null;
  timeline?: SyncTimeline | null;
}

export interface RecommendationAdapterContext extends RecipeAdapterContext {
  recommendationReason?: string;
  recommendationTags?: string[];
}

export interface MealPlanAdapterContext {
  recipesById?: Record<string, Recipe | RecipeSummary>;
  shoppingList?: ShoppingList | null;
  feedbackByRecipeId?: Record<string, FeedingFeedbackItem | undefined>;
  babyAgeMonths?: number;
}

export interface HomeDashboardViewModel {
  plannedCount: number;
  completedCount: number;
  undecidedCount: number;
  shoppingUncheckedCount: number;
  shoppingProgress: number;
  retrySuggestedCount: number;
}

export interface RecipeDetailViewModel {
  recipe?: RecipeDisplayModel;
  adultVersion?: RecipeVersion;
  babyVersion?: RecipeVersion;
  aiBabyVersion?: AIBabyVersionResult | null;
  timeline?: SyncTimeline | null;
  inPlan: boolean;
  onShoppingList: boolean;
  latestFeedback?: FeedbackAcceptance;
}

export interface HomeRecommendationSource {
  recipe?: RecipeSummary | Recipe | null;
  reason?: string;
  reasons?: string[];
  tags?: string[];
}

export interface SearchResultSource {
  id: string;
  name: string;
  description?: string;
  image_url?: string[];
  prep_time?: number;
  difficulty?: string;
  servings?: string;
  source?: 'local' | 'tianxing' | 'ai';
  ranking_reasons?: Array<{ label?: string; detail?: string }>;
  recommendation_explain?: string[];
  stage?: string;
  texture_level?: string;
  baby_version?: unknown;
}

export interface SearchPreferenceSource {
  defaultBabyAge?: number | null;
  preferIngredients?: string[] | string | null;
  excludeIngredients?: string[] | null;
  cookingTimeLimit?: number | null;
  difficultyPreference?: string | null;
}

export type SearchTaskTab = 'keyword' | 'dual' | 'inventory' | 'scenario' | 'age';

export interface SearchTaskTabViewModel {
  key: SearchTaskTab;
  label: string;
}

export interface SearchExploreViewModel {
  popularSearches: string[];
  scenarioHints: string[];
  ageFilters: string[];
}

export interface SearchResultCardViewModel {
  id: string;
  resultKey: string;
  recommendation: RecommendationCardViewModel;
  sourceLabel: string;
  description?: string;
  preferenceHint?: string;
}

export interface SearchResultSummaryViewModel {
  total: number;
  routeSourceLabel: string;
  preferenceLeadText: string;
}

export interface SearchPageViewModel {
  taskTabs: SearchTaskTabViewModel[];
  explore: SearchExploreViewModel;
  activeContext: {
    selectedScenario: string;
    inventoryFirstEnabled: boolean;
    inventoryCount: number;
  };
  cards: SearchResultCardViewModel[];
  resultSummary: SearchResultSummaryViewModel;
}

export interface SearchExperienceViewModel {
  items: RecommendationCardViewModel[];
  total: number;
}

export interface FamilyContextViewModel {
  members: Array<{ id: string; name: string; avatarUrl?: string }>;
  babyAgeMonths?: number;
  sharedSpaces: Array<'weekly-plan' | 'shopping-list' | 'feeding-tracker' | 'one-dish-two-ways'>;
}

export type WeeklyPlanSource = WeeklyPlanResponse | null;
export type MealPlanSource = MealPlan;
export type ShoppingListSource = ShoppingList | null;
export type RecommendationSource = SmartRecommendationItem;
export type UserSource = User | null;
export type ShoppingItemSource = ShoppingListItem;
