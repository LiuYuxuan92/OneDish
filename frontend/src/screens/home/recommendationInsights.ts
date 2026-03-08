import { getRecipeMinutes, isBabyStageMatched, normalizeCategories } from './swapStrategy';

export type RecommendationReasonStrength = 'high' | 'medium' | 'low';

export interface RecommendationReason {
  key: string;
  title: string;
  detail: string;
  strength: RecommendationReasonStrength;
}

export interface RecommendationQualityDimensions {
  timeFit: number;
  nutritionFit: number;
  preferenceFit: number;
  stageFit: number;
}

export interface RecommendationQualityScore {
  total: number;
  dimensions: RecommendationQualityDimensions;
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const buildRecommendationReasons = (params: {
  recipe: any;
  currentStage?: any;
  preferredCategories?: string[];
  preferenceSummary?: {
    defaultBabyAge?: number;
    preferIngredients?: string[];
    excludeIngredients?: string[];
    cookingTimeLimit?: number;
    difficultyPreference?: string;
  };
  backendExplain?: string[];
  backendReasons?: Array<{ code?: string; label?: string; detail?: string }>;
  limit?: number;
}): RecommendationReason[] => {
  const { recipe, currentStage, preferredCategories = [], preferenceSummary, backendExplain = [], backendReasons = [], limit = 3 } = params;
  if (!recipe) {
    return [];
  }

  const reasons: RecommendationReason[] = [];
  const minutes = getRecipeMinutes(recipe);
  reasons.push({
    key: 'time-fit',
    title: minutes > 0 ? `时长约 ${minutes} 分钟` : '操作流程清晰',
    detail: minutes > 0 ? '适合工作日快速上桌，减少做饭负担' : '步骤明晰，今天可以直接开做',
    strength: minutes > 0 && minutes <= 30 ? 'high' : 'medium',
  });

  const stageNutrients = Array.isArray(currentStage?.key_nutrients) ? currentStage.key_nutrients.slice(0, 2) : [];
  if (stageNutrients.length > 0) {
    reasons.push({
      key: 'nutrition-fit',
      title: '阶段营养覆盖',
      detail: `覆盖宝宝阶段重点营养：${stageNutrients.join('、')}`,
      strength: 'high',
    });
  } else if (recipe?.nutrition_info && Object.keys(recipe.nutrition_info || {}).length > 0) {
    reasons.push({
      key: 'nutrition-info',
      title: '营养信息完整',
      detail: '支持按营养信息做搭配，宝宝饮食更均衡',
      strength: 'medium',
    });
  }

  const recipeCategories = new Set(normalizeCategories(recipe?.category));
  const preferredHit = normalizeCategories(preferredCategories).filter((item) => recipeCategories.has(item));
  if (preferredHit.length > 0) {
    reasons.push({
      key: 'preference-fit',
      title: '命中家庭偏好',
      detail: `匹配你常选的分类：${preferredHit.slice(0, 2).join('、')}`,
      strength: 'high',
    });
  }

  const normalizedPreferredIngredients = Array.isArray(preferenceSummary?.preferIngredients)
    ? preferenceSummary?.preferIngredients.filter(Boolean)
    : [];
  const normalizedExcludedIngredients = Array.isArray(preferenceSummary?.excludeIngredients)
    ? preferenceSummary?.excludeIngredients.filter(Boolean)
    : [];
  const backendExplainReason = backendExplain.find(Boolean);
  if (backendExplainReason) {
    reasons.push({
      key: 'backend-preference-explain',
      title: '已按你的偏好做推荐',
      detail: backendExplainReason,
      strength: 'high',
    });
  } else if (normalizedPreferredIngredients.length > 0 || normalizedExcludedIngredients.length > 0 || preferenceSummary?.cookingTimeLimit || preferenceSummary?.difficultyPreference) {
    const summaryParts: string[] = [];
    if (normalizedPreferredIngredients.length > 0) {
      summaryParts.push(`偏好食材：${normalizedPreferredIngredients.slice(0, 2).join('、')}`);
    }
    if (normalizedExcludedIngredients.length > 0) {
      summaryParts.push(`已避开：${normalizedExcludedIngredients.slice(0, 2).join('、')}`);
    }
    if (preferenceSummary?.cookingTimeLimit) {
      summaryParts.push(`做饭时长控制在 ${preferenceSummary.cookingTimeLimit} 分钟内`);
    }
    if (preferenceSummary?.difficultyPreference) {
      summaryParts.push(`难度偏好：${preferenceSummary.difficultyPreference}`);
    }

    if (summaryParts.length > 0) {
      reasons.push({
        key: 'preference-summary',
        title: '已结合你的口味与做饭习惯',
        detail: summaryParts.slice(0, 2).join('；'),
        strength: 'medium',
      });
    }
  }

  const backendDetailReason = backendReasons.find((item) => item?.detail || item?.label);
  if (backendDetailReason) {
    reasons.push({
      key: 'backend-ranking-reason',
      title: backendDetailReason.label || '推荐匹配点',
      detail: backendDetailReason.detail || '综合偏好与约束更匹配',
      strength: 'medium',
    });
  }

  const ingredientCount = Array.isArray(recipe?.adult_version?.ingredients)
    ? recipe.adult_version.ingredients.length
    : 0;
  reasons.push({
    key: 'prep-efficiency',
    title: ingredientCount >= 3 ? '食材复用效率高' : '食材准备简单',
    detail:
      ingredientCount >= 3
        ? '同一套食材可同时覆盖大人和宝宝两餐'
        : '准备成本低，适合轻负担下厨',
    strength: ingredientCount >= 3 ? 'medium' : 'low',
  });

  return reasons.slice(0, Math.max(2, Math.min(3, limit)));
};

export const scoreRecommendationQuality = (params: {
  recipe: any;
  currentRecipe?: any;
  currentStage?: any;
  preferredCategories?: string[];
  timeWindowMinutes?: number;
}): RecommendationQualityScore => {
  const {
    recipe,
    currentRecipe,
    currentStage,
    preferredCategories = [],
    timeWindowMinutes = 10,
  } = params;

  if (!recipe) {
    return {
      total: 0,
      dimensions: {
        timeFit: 0,
        nutritionFit: 0,
        preferenceFit: 0,
        stageFit: 0,
      },
    };
  }

  const recipeMinutes = getRecipeMinutes(recipe);
  const baselineMinutes = getRecipeMinutes(currentRecipe || recipe);
  const diff = baselineMinutes > 0 && recipeMinutes > 0 ? Math.abs(baselineMinutes - recipeMinutes) : 0;

  const timeFit =
    recipeMinutes <= 0
      ? 60
      : baselineMinutes > 0
        ? clampScore(100 - (diff / Math.max(1, timeWindowMinutes)) * 40)
        : clampScore(100 - Math.max(0, recipeMinutes - 30) * 2);

  const hasNutritionInfo = !!(recipe?.nutrition_info && Object.keys(recipe.nutrition_info || {}).length > 0);
  const nutritionFit = hasNutritionInfo ? 85 : 60;

  const recipeCategories = new Set(normalizeCategories(recipe?.category));
  const preferredHits = normalizeCategories(preferredCategories).filter((item) => recipeCategories.has(item)).length;
  const preferenceFit = preferredCategories.length === 0 ? 65 : clampScore(40 + preferredHits * 30);

  const stageMatched = isBabyStageMatched(recipe, currentStage);
  const stageFit = currentStage ? (stageMatched ? 95 : 55) : 60;

  const total = clampScore(timeFit * 0.3 + nutritionFit * 0.25 + preferenceFit * 0.25 + stageFit * 0.2);

  return {
    total,
    dimensions: {
      timeFit,
      nutritionFit,
      preferenceFit,
      stageFit,
    },
  };
};
