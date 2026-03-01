const SWAP_TIME_WINDOW_MINUTES = 10;

/**
 * 换菜策略权重（Phase2 可配置入口）
 * - preference: 偏好分类命中
 * - category: 当前菜与候选分类重叠
 * - time: 时长窗口命中
 * - stage: 宝宝阶段匹配
 * - prepDiffPenalty: 与当前时长差异惩罚（每分钟）
 */
export const DEFAULT_SWAP_WEIGHTS = {
  preference: 180,
  category: 120,
  time: 80,
  stage: 60,
  prepDiffPenalty: 1,
} as const;

export const normalizeCategories = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[、,，/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const getRecipeMinutes = (recipe: any): number => {
  const total = Number(recipe?.total_time || 0);
  const prep = Number(recipe?.prep_time || 0);
  if (total > 0) {
    return total;
  }
  if (prep > 0) {
    return prep;
  }
  return 0;
};

const parseStageBoundary = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
};

export const isBabyStageMatched = (recipe: any, currentStage: any): boolean => {
  if (!recipe || !currentStage) {
    return false;
  }

  const recipeStage = String(recipe.stage || recipe.baby_stage || '').toLowerCase();
  const currentStageKey = String(currentStage.stage || currentStage.key || '').toLowerCase();
  if (recipeStage && currentStageKey && recipeStage === currentStageKey) {
    return true;
  }

  const stageMin = parseStageBoundary(recipe.age_min ?? recipe.baby_age_min);
  const stageMax = parseStageBoundary(recipe.age_max ?? recipe.baby_age_max);
  const currentMin = parseStageBoundary(currentStage.age_min);

  if (stageMin !== null && stageMax !== null && currentMin !== null) {
    return currentMin >= stageMin && currentMin <= stageMax;
  }

  return false;
};

const getCategorySet = (recipe: any): Set<string> => new Set(normalizeCategories(recipe?.category));

const toCategoryFromRecipeId = (recipeId: string, allRecipes: any[]): string[] => {
  if (!recipeId || !Array.isArray(allRecipes) || allRecipes.length === 0) {
    return [];
  }
  const recipe = allRecipes.find((item) => String(item?.id) === String(recipeId));
  return normalizeCategories(recipe?.category);
};

export const buildPreferredCategories = (params: {
  favoritesItems?: any[];
  allRecipes?: any[];
  localMemory?: string[];
  limit?: number;
}): string[] => {
  const { favoritesItems = [], allRecipes = [], localMemory = [], limit = 3 } = params;

  // 优先级说明：
  // 1) 真实偏好源（收藏列表）
  // 2) 本地记忆（上次换菜偏好）兜底
  const fromFavorites = favoritesItems.flatMap((fav) => {
    const direct = normalizeCategories(fav?.recipe?.category ?? fav?.category);
    if (direct.length > 0) {
      return direct;
    }
    return toCategoryFromRecipeId(fav?.recipe?.id ?? fav?.recipe_id, allRecipes);
  });

  const ranked = fromFavorites.length > 0 ? fromFavorites : localMemory;
  return [...new Set(ranked)].slice(0, limit);
};

export const getSwapCandidate = (params: {
  currentRecipe: any;
  allRecipesItems?: any[];
  preferredCategories?: string[];
  currentStage?: any;
  timeWindowMinutes?: number;
  weights?: Partial<typeof DEFAULT_SWAP_WEIGHTS>;
}): any | null => {
  const {
    currentRecipe,
    allRecipesItems = [],
    preferredCategories = [],
    currentStage,
    timeWindowMinutes = SWAP_TIME_WINDOW_MINUTES,
    weights,
  } = params;

  const mergedWeights = {
    ...DEFAULT_SWAP_WEIGHTS,
    ...(weights || {}),
  };

  const current = currentRecipe;
  if (!current || allRecipesItems.length === 0) {
    return null;
  }

  const candidates = allRecipesItems.filter((item: any) => item?.id && item.id !== current.id);
  if (candidates.length === 0) {
    return null;
  }

  const currentCategory = getCategorySet(current);
  const currentMinutes = getRecipeMinutes(current);
  const preferredCategorySet = new Set(preferredCategories);

  const sameType = candidates.filter((item: any) => item?.type && item.type === current?.type);
  const typePool = sameType.length > 0 ? sameType : candidates;

  const scored = typePool
    .map((item: any) => {
      const itemCategory = getCategorySet(item);
      const categoryOverlap = [...currentCategory].filter((c) => itemCategory.has(c)).length;
      const preferredCategoryHit = [...itemCategory].filter((c) => preferredCategorySet.has(c)).length;

      const itemMinutes = getRecipeMinutes(item);
      const prepDiff = Math.abs(currentMinutes - itemMinutes);
      const inSameTimeWindow =
        currentMinutes > 0 && itemMinutes > 0 && prepDiff <= timeWindowMinutes;

      const stageMatched = isBabyStageMatched(item, currentStage);

      return {
        item,
        score:
          preferredCategoryHit * mergedWeights.preference +
          categoryOverlap * mergedWeights.category +
          (inSameTimeWindow ? mergedWeights.time : 0) +
          (stageMatched ? mergedWeights.stage : 0) -
          prepDiff * mergedWeights.prepDiffPenalty,
        preferredCategoryHit,
        inSameTimeWindow,
        stageMatched,
      };
    })
    .sort((a, b) => b.score - a.score);

  const tierPreferred = scored.filter((entry) => entry.preferredCategoryHit > 0);
  if (tierPreferred.length > 0) {
    return tierPreferred[0].item;
  }

  const tierTimeWindow = scored.filter((entry) => entry.inSameTimeWindow);
  if (tierTimeWindow.length > 0) {
    return tierTimeWindow[0].item;
  }

  const tierStageMatched = scored.filter((entry) => entry.stageMatched);
  if (tierStageMatched.length > 0) {
    return tierStageMatched[0].item;
  }

  return scored[0]?.item || candidates[0] || null;
};
