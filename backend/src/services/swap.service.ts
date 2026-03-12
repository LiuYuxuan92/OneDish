/**
 * 智能换菜服务 - 从 frontend/src/screens/home/swapStrategy.ts 移植
 */
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { BabyStageService } from './baby-stage.service';
import { FavoriteService } from './favorite.service';
import { userPreferenceService } from './user-preference.service';

const SWAP_TIME_WINDOW_MINUTES = 10;

const DEFAULT_SWAP_WEIGHTS = {
  preference: 180,
  category: 120,
  time: 80,
  stage: 60,
  prepDiffPenalty: 1,
} as const;

interface SwapParams {
  current_recipe_id: string;
  user_id?: string;
  baby_age_months?: number;
  preferred_categories?: string[];
}

interface SwapResult {
  recipe: any;
  score: number;
  reasons: string[];
  explain?: string[];
  ranking_reasons?: Array<{ code: string; label: string; detail?: string; contribution: number }>;
}

/**
 * 标准化分类数组
 */
const normalizeCategories = (value: unknown): string[] => {
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

/**
 * 获取菜谱时长
 */
const getRecipeMinutes = (recipe: any): number => {
  const total = Number(recipe?.total_time || recipe?.prep_time || 0);
  return total > 0 ? total : 0;
};

/**
 * 解析阶段边界
 */
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

/**
 * 宝宝阶段是否匹配
 */
const isBabyStageMatched = (recipe: any, currentStage: any): boolean => {
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

/**
 * 获取分类集合
 */
const getCategorySet = (recipe: any): Set<string> => {
  return new Set(normalizeCategories(recipe?.category));
};

export class SwapService {
  private babyStageService: BabyStageService;
  private favoriteService: FavoriteService;

  constructor() {
    this.babyStageService = new BabyStageService();
    this.favoriteService = new FavoriteService();
  }

  /**
   * 从收藏构建偏好分类
   */
  private async buildPreferredCategories(userId?: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    try {
      const favorites = await this.favoriteService.getFavorites(userId, 1, 50);
      const categories: string[] = [];

      for (const fav of favorites.items) {
        const recipe = fav.recipe;
        if (recipe) {
          // 直接从 recipe 获取分类
          const cats = normalizeCategories(recipe.category);
          if (cats.length > 0) {
            categories.push(...cats);
          }
        }
      }

      // 去重并返回前3个
      return [...new Set(categories)].slice(0, 3);
    } catch (error) {
      logger.error('[SwapService] buildPreferredCategories error:', error);
      return [];
    }
  }

  /**
   * 智能换菜 - 返回带评分的候选菜谱
   */
  async swapRecipe(params: SwapParams): Promise<SwapResult | null> {
    const { current_recipe_id, user_id, baby_age_months, preferred_categories: inputCategories } = params;

    const userPrefs = await userPreferenceService.getUserPreferences(user_id);
    const effectiveBabyAge = baby_age_months || userPrefs.default_baby_age;
    const effectiveTimeLimit = userPrefs.cooking_time_limit;

    // 获取当前菜谱
    const currentRecipe = await db('recipes').where('id', current_recipe_id).first();
    if (!currentRecipe) {
      logger.error('[SwapService] Current recipe not found:', current_recipe_id);
      return null;
    }

    // 获取所有可用菜谱（排除当前）
    let recipeQuery = db('recipes')
      .where('is_active', true)
      .whereNot('id', current_recipe_id)
      .select(
        'id',
        'name',
        'category',
        'type',
        'prep_time',
        'cook_time',
        'total_time',
        'stage',
        'image_url',
        'adult_version',
        'baby_version',
        'difficulty',
        'calibrated_difficulty'
      );

    if (effectiveTimeLimit) {
      recipeQuery = recipeQuery.where('prep_time', '<=', effectiveTimeLimit) as any;
    }

    const allRecipes = (await recipeQuery.limit(100)).filter((recipe: any) => {
      if (userPreferenceService.recipeContainsExcludedIngredient(recipe, userPrefs.exclude_ingredients)) {
        return false;
      }
      return userPreferenceService.matchesBabyAge(recipe, effectiveBabyAge);
    });

    if (allRecipes.length === 0) {
      return null;
    }

    // 获取偏好分类（优先使用传入参数，否则从收藏构建）
    let preferredCategories: string[] = [];
    if (inputCategories && inputCategories.length > 0) {
      preferredCategories = normalizeCategories(inputCategories);
    } else if (user_id) {
      preferredCategories = await this.buildPreferredCategories(user_id);
    }

    const preferredIngredients = userPrefs.prefer_ingredients;

    // 获取宝宝阶段
    let currentStage: any = null;
    if (effectiveBabyAge) {
      currentStage = await this.babyStageService.getByAge(effectiveBabyAge);
    }

    // 评分计算
    const currentCategory = getCategorySet(currentRecipe);
    const currentMinutes = getRecipeMinutes(currentRecipe);
    const preferredCategorySet = new Set(preferredCategories);

    // 按类型过滤（优先同类型）
    const sameType = allRecipes.filter(
      (item) => item.type && currentRecipe.type && item.type === currentRecipe.type
    );
    const typePool = sameType.length > 0 ? sameType : allRecipes;

    // 评分
    const scored = typePool.map((item) => {
      const itemCategory = getCategorySet(item);
      const categoryOverlap = [...currentCategory].filter((c) => itemCategory.has(c)).length;
      const preferredCategoryHit = [...itemCategory].filter((c) => preferredCategorySet.has(c)).length;

      const itemMinutes = getRecipeMinutes(item);
      const prepDiff = Math.abs(currentMinutes - itemMinutes);
      const inSameTimeWindow =
        currentMinutes > 0 && itemMinutes > 0 && prepDiff <= SWAP_TIME_WINDOW_MINUTES;

      const stageMatched = isBabyStageMatched(item, currentStage);

      const prefScore = userPreferenceService.scoreRecipeByPreferences(item, userPrefs, effectiveTimeLimit || currentMinutes || undefined);
      const preferredIngredientHit = preferredIngredients.filter((target) =>
        userPreferenceService.extractRecipeIngredientNames(item).some((name) => name.includes(target) || target.includes(name))
      ).length;

      let score =
        preferredCategoryHit * DEFAULT_SWAP_WEIGHTS.preference +
        categoryOverlap * DEFAULT_SWAP_WEIGHTS.category +
        (inSameTimeWindow ? DEFAULT_SWAP_WEIGHTS.time : 0) +
        (stageMatched ? DEFAULT_SWAP_WEIGHTS.stage : 0) -
        prepDiff * DEFAULT_SWAP_WEIGHTS.prepDiffPenalty;

      score += prefScore.score + preferredIngredientHit * 18;

      const rankingReasons = [
        {
          code: 'preference',
          label: preferredIngredientHit > 0 ? `命中${preferredIngredientHit}项偏好食材` : '偏好食材命中较少',
          detail: preferredIngredients.slice(0, 3).join('、') || '默认',
          contribution: preferredIngredientHit * 18,
        },
        {
          code: 'category',
          label: preferredCategoryHit > 0 ? '命中常选分类' : '分类接近当前菜谱',
          detail: [...itemCategory].slice(0, 2).join('、') || '默认',
          contribution: preferredCategoryHit * DEFAULT_SWAP_WEIGHTS.preference + categoryOverlap * DEFAULT_SWAP_WEIGHTS.category,
        },
        {
          code: 'time',
          label: inSameTimeWindow ? '做饭时长与当前更接近' : '做饭时长略有变化',
          detail: itemMinutes > 0 ? `约${itemMinutes}分钟` : '时长未知',
          contribution: inSameTimeWindow ? DEFAULT_SWAP_WEIGHTS.time : Math.max(0, DEFAULT_SWAP_WEIGHTS.time - prepDiff),
        },
        {
          code: 'baby',
          label: stageMatched ? '宝宝月龄适配更好' : '宝宝适配一般',
          detail: effectiveBabyAge ? `月龄${effectiveBabyAge}` : '未设置默认月龄',
          contribution: stageMatched ? DEFAULT_SWAP_WEIGHTS.stage : 0,
        },
      ].sort((a, b) => b.contribution - a.contribution || a.code.localeCompare(b.code));

      const explain = [
        ...prefScore.reasons,
        ...rankingReasons.filter((reason) => reason.contribution > 0).slice(0, 2).map((reason) => reason.label),
      ].filter(Boolean).slice(0, 3);

      return {
        item,
        score,
        preferredCategoryHit,
        preferredIngredientHit,
        inSameTimeWindow,
        stageMatched,
        categoryOverlap,
        prefReasons: prefScore.reasons,
        explain,
        ranking_reasons: rankingReasons,
      };
    });

    // 排序
    scored.sort((a, b) => b.score - a.score);

    // 优先级筛选
    const tierPreferred = scored.filter((entry) => entry.preferredCategoryHit > 0);
    if (tierPreferred.length > 0) {
      const winner = tierPreferred[0];
      return this.buildResult(winner, currentRecipe);
    }

    const tierTimeWindow = scored.filter((entry) => entry.inSameTimeWindow);
    if (tierTimeWindow.length > 0) {
      const winner = tierTimeWindow[0];
      return this.buildResult(winner, currentRecipe);
    }

    const tierStageMatched = scored.filter((entry) => entry.stageMatched);
    if (tierStageMatched.length > 0) {
      const winner = tierStageMatched[0];
      return this.buildResult(winner, currentRecipe);
    }

    // 兜底：返回最高分
    if (scored.length > 0) {
      return this.buildResult(scored[0], currentRecipe);
    }

    return null;
  }

  /**
   * 构建返回结果
   */
  private buildResult(scoredEntry: any, currentRecipe: any): SwapResult {
    const { item, score, preferredCategoryHit, preferredIngredientHit, inSameTimeWindow, stageMatched, categoryOverlap, prefReasons, explain, ranking_reasons } = scoredEntry;
    
    // 构建原因列表
    const reasons: string[] = [];
    if (preferredCategoryHit > 0) reasons.push('符合你的偏好分类');
    if (preferredIngredientHit > 0) reasons.push('命中偏好食材');
    if (categoryOverlap > 0) reasons.push(`与当前菜谱分类重叠: ${categoryOverlap}类`);
    if (inSameTimeWindow) reasons.push('烹饪时间相近');
    if (stageMatched) reasons.push('匹配宝宝当前发育阶段');
    if (Array.isArray(prefReasons) && prefReasons.length > 0) reasons.push(...prefReasons.slice(0, 2));
    if (reasons.length === 0) reasons.push('综合评分最高');

    return {
      recipe: {
        ...item,
        // 返回完整的菜谱详情
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type,
        prep_time: item.prep_time,
        cook_time: item.cook_time,
        total_time: item.total_time,
        image_url: item.image_url,
        adult_version: item.adult_version,
        baby_version: item.baby_version,
        stage: item.stage,
        recommendation_explain: explain || reasons.slice(0, 3),
        ranking_reasons: ranking_reasons || [],
      },
      score,
      reasons,
      explain: explain || reasons.slice(0, 3),
      ranking_reasons: ranking_reasons || [],
    };
  }
}
