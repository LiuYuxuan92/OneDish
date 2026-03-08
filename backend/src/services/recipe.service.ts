import { db } from '../config/database';
import { Recipe, RecipeSummary, PaginationResult } from '../types';
import { logger } from '../utils/logger';
import { RecipeCalibrationService } from './recipe-calibration.service';
import { userPreferenceService } from './user-preference.service';

interface DailyRecommendationParams {
  type?: string;
  max_time?: number;
  user_id?: string;
}

interface SearchRecipesParams {
  keyword?: string;
  type?: string;
  category?: string;
  max_time?: number;
  difficulty?: string;
  page: number;
  limit: number;
  user_id?: string;
}

export class RecipeService {
  // 获取今日推荐
  async getDailyRecommendation(params: DailyRecommendationParams) {
    const { type, max_time = 30, user_id } = params;
    const mixUgcEnabled = process.env.RECOMMEND_MIX_UGC_ENABLED !== 'false';

    const userPrefs = await userPreferenceService.getUserPreferences(user_id);
    const effectiveMaxTime = userPrefs.cooking_time_limit || max_time;

    let profileTags: any = null;
    if (user_id) {
      const user = await db('users').where({ id: user_id }).first();
      const normalizedPrefs = userPreferenceService.normalizePreferences(user?.preferences);
      profileTags = user?.preferences?.profile_tags || null;
      if (!profileTags && normalizedPrefs.default_baby_age) {
        profileTags = { baby_age_months: normalizedPrefs.default_baby_age };
      }
    }

    let query = db('recipes')
      .where('is_active', true)
      .where('prep_time', '<=', effectiveMaxTime);

    if (type) {
      query = query.where('type', type) as any;
    } else if (Array.isArray(profileTags?.meal_slots) && profileTags.meal_slots.length > 0) {
      query = query.whereIn('type', profileTags.meal_slots) as any;
    }

    const recipes = (await query.select('*')).filter((item: any) => {
      if (userPreferenceService.recipeContainsExcludedIngredient(item, userPrefs.exclude_ingredients)) {
        return false;
      }
      return userPreferenceService.matchesBabyAge(item, userPrefs.default_baby_age || profileTags?.baby_age_months);
    });

    const scoredRecipes = recipes
      .map((item: any) => ({
        recipe: item,
        pref: userPreferenceService.scoreRecipeByPreferences(item, userPrefs, effectiveMaxTime),
      }))
      .sort((a, b) => b.pref.score - a.pref.score || a.recipe.prep_time - b.recipe.prep_time || a.recipe.id.localeCompare(b.recipe.id));

    let recipe: any = scoredRecipes.length > 0
      ? scoredRecipes[Math.floor(Math.random() * Math.min(3, scoredRecipes.length))].recipe
      : null;

    if (mixUgcEnabled) {
      const ugcQuery = db('user_recipes')
        .where({ is_active: true, status: 'published', in_recommend_pool: true })
        .where('prep_time', '<=', effectiveMaxTime)
        .orderBy('quality_score', 'desc')
        .limit(30);

      if (type) ugcQuery.andWhere('type', type);
      if (!type && Array.isArray(profileTags?.meal_slots) && profileTags.meal_slots.length > 0) {
        ugcQuery.whereIn('type', profileTags.meal_slots);
      }
      if (profileTags?.baby_stage) ugcQuery.andWhere('baby_age_range', 'like', `%${profileTags.baby_stage}%`);

      let ugcCandidates = await ugcQuery.select('*');
      ugcCandidates = ugcCandidates.filter((r: any) => {
        if (userPreferenceService.recipeContainsExcludedIngredient(r, userPrefs.exclude_ingredients)) {
          return false;
        }
        return userPreferenceService.matchesBabyAge(r, userPrefs.default_baby_age || profileTags?.baby_age_months);
      });
      if (Array.isArray(profileTags?.flavors) && profileTags.flavors.length > 0) {
        ugcCandidates = ugcCandidates.filter((r: any) => {
          const tags = Array.isArray(r.tags) ? r.tags : (() => {
            try { return JSON.parse(r.tags || '[]'); } catch { return []; }
          })();
          return tags.some((t: string) => profileTags.flavors.includes(t));
        });
      }
      ugcCandidates = ugcCandidates
        .map((r: any) => ({ recipe: r, pref: userPreferenceService.scoreRecipeByPreferences(r, userPrefs, effectiveMaxTime) }))
        .sort((a: any, b: any) => b.pref.score - a.pref.score || (b.recipe.quality_score || 0) - (a.recipe.quality_score || 0))
        .map((entry: any) => entry.recipe);
      if (ugcCandidates.length > 0 && Math.random() < 0.3) {
        const picked = ugcCandidates[Math.floor(Math.random() * ugcCandidates.length)];
        recipe = {
          ...picked,
          is_ugc: true,
          recommendation_source: 'ugc_pool',
        };
      }
    }

    const parsedRecipe = this.parseRecipeJsonFields(recipe as any);
    const selectedPrefScore = recipe
      ? scoredRecipes.find((entry) => entry.recipe.id === recipe.id)?.pref
      : null;
    const recommendationExplain = selectedPrefScore?.reasons?.slice(0, 3) || [];
    const rankingReasons = recommendationExplain.map((label: string, index: number) => ({
      code: `preference_${index + 1}`,
      label,
      contribution: Math.max(0.1, 1 - index * 0.2),
    }));

    return {
      date: new Date().toISOString().split('T')[0],
      recipe: parsedRecipe
        ? {
            ...parsedRecipe,
            recommendation_explain: recommendationExplain,
            ranking_reasons: rankingReasons,
          }
        : parsedRecipe,
    };
  }

  // 获取菜谱详情
  async getRecipeDetail(recipeId: string, userId?: string) {
    const recipe = await db('recipes')
      .where('id', recipeId)
      .where('is_active', true)
      .first();

    if (!recipe) {
      throw new Error('菜谱不存在');
    }

    // 检查是否已收藏
    let isFavorited = false;
    if (userId) {
      const favorite = await db('favorites')
        .where('user_id', userId)
        .where('recipe_id', recipeId)
        .first();
      isFavorited = !!favorite;
    }

    // 解析 JSON 字段
    const parsedRecipe = this.parseRecipeJsonFields(recipe);

    // 获取校准后的难度（如果有）
    const calibrationService = new RecipeCalibrationService();
    const effectiveDifficulty = await calibrationService.getEffectiveDifficulty(recipeId);

    return {
      ...parsedRecipe,
      is_favorited: isFavorited,
      // 返回实际使用的难度（校准后的难度，如果没有则用原始难度）
      difficulty: effectiveDifficulty,
      // 同时返回原始难度和校准难度，方便前端区分
      original_difficulty: recipe.difficulty,
      calibrated_difficulty: recipe.calibrated_difficulty,
      // 返回校准统计信息
      calibration_info: {
        completion_count: recipe.completion_count || 0,
        completion_rate: recipe.completion_rate,
        last_calibrated_at: recipe.last_calibrated_at,
      },
    };
  }

  // 解析 JSON 字段
  private parseRecipeJsonFields(recipe: Partial<Recipe> | null) {
    if (!recipe) return recipe;

    const jsonFields = [
      'category',
      'adult_version',
      'baby_version',
      'cooking_tips',
      'nutrition_info',
      'tags',
    ];

    const parsed = { ...recipe };

    for (const field of jsonFields) {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // 如果解析失败，保持原值
          logger.warn(`Failed to parse ${field}:`, e);
        }
      }
    }

    return parsed;
  }

  // 搜索菜谱
  async searchRecipes(params: SearchRecipesParams): Promise<PaginationResult<RecipeSummary>> {
    const {
      keyword,
      type,
      category,
      max_time,
      difficulty,
      page = 1,
      limit = 20,
      user_id,
    } = params;

    logger.info('[searchRecipes] params:', params);

    const userPrefs = await userPreferenceService.getUserPreferences(user_id);
    const effectiveMaxTime = max_time || userPrefs.cooking_time_limit;
    const explicitDifficulty = difficulty ? userPreferenceService.normalizePreferences({ difficulty_preference: difficulty }).difficulty_preference : undefined;
    const preferenceDifficulty = explicitDifficulty || userPrefs.difficulty_preference;
    const effectiveBabyAge = userPrefs.default_baby_age;

    let query = db('recipes')
      .where('is_active', 1)
      .select(
        'id',
        'name',
        'type',
        'prep_time',
        'image_url',
        'difficulty',
        'calibrated_difficulty',
        'adult_version',
        'baby_version',
        'baby_age_range',
        'suitable_baby_age',
        'age_min',
        'age_max',
        'baby_age_min',
        'baby_age_max',
        'stage',
        'created_at'
      );

    logger.info('[searchRecipes] base query built');

    if (keyword && keyword.trim()) {
      const searchPattern = `%${keyword.trim()}%`;
      logger.info('[searchRecipes] keyword:', keyword, 'pattern:', searchPattern);
      query = query.andWhere(function() {
        this.where('name', 'like', searchPattern);
      });
      logger.info('[searchRecipes] keyword filter applied');
    }

    if (type) {
      query = query.where('type', type);
    }

    if (effectiveMaxTime) {
      query = query.where('prep_time', '<=', effectiveMaxTime);
    }

    if (category) {
      query = query.whereRaw('? = ANY(category)', [category]);
    }

    const rawItems = await query;

    const filteredItems = (rawItems as any[]).filter((item) => {
      if (userPreferenceService.recipeContainsExcludedIngredient(item, userPrefs.exclude_ingredients)) {
        return false;
      }
      return userPreferenceService.matchesBabyAge(item, effectiveBabyAge);
    });

    const scoredItems = filteredItems
      .map((item) => ({
        item,
        pref: userPreferenceService.scoreRecipeByPreferences(item, {
          ...userPrefs,
          cooking_time_limit: effectiveMaxTime,
          difficulty_preference: preferenceDifficulty,
        }, effectiveMaxTime),
      }))
      .sort((a, b) => {
        const scoreDiff = b.pref.score - a.pref.score;
        if (scoreDiff !== 0) return scoreDiff;
        const timeDiff = (a.item.prep_time || 0) - (b.item.prep_time || 0);
        if (timeDiff !== 0) return timeDiff;
        return String(a.item.id).localeCompare(String(b.item.id));
      });

    const total = scoredItems.length;
    logger.info('[searchRecipes] total count:', total);

    const pagedItems = scoredItems
      .slice((page - 1) * limit, page * limit)
      .map(({ item, pref }) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        prep_time: item.prep_time,
        image_url: item.image_url,
        difficulty: item.calibrated_difficulty || item.difficulty,
        preference_match_score: pref.score,
        preference_match_reasons: pref.reasons,
      }));

    return {
      total,
      page,
      limit,
      items: pagedItems as any,
    };
  }

  // 根据即将过期食材推荐菜谱
  async suggestByInventory(userId: string) {
    // 获取3天内即将过期的食材
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringItems = await db('ingredient_inventory')
      .where('user_id', userId)
      .where('quantity', '>', 0)
      .whereNotNull('expiry_date')
      .where('expiry_date', '<=', threeDaysLater.toISOString().split('T')[0])
      .where('expiry_date', '>=', now.toISOString().split('T')[0])
      .select('ingredient_name', 'quantity', 'unit', 'expiry_date');

    if (expiringItems.length === 0) {
      return { expiring_ingredients: [], suggestions: [] };
    }

    const ingredientNames = expiringItems.map((item: any) => item.ingredient_name);

    // 搜索包含这些食材的菜谱
    const allRecipes = await db('recipes')
      .where('is_active', 1)
      .select('id', 'name', 'type', 'prep_time', 'image_url', 'adult_version');

    const suggestions: any[] = [];
    for (const recipe of allRecipes) {
      let adultVersion = recipe.adult_version;
      if (typeof adultVersion === 'string') {
        try { adultVersion = JSON.parse(adultVersion); } catch { continue; }
      }
      if (!adultVersion?.ingredients) continue;

      const recipeIngredientNames = adultVersion.ingredients.map((ing: any) => ing.name);
      const matchedIngredients = ingredientNames.filter((name: string) =>
        recipeIngredientNames.some((rName: string) => rName.includes(name) || name.includes(rName))
      );

      if (matchedIngredients.length > 0) {
        suggestions.push({
          id: recipe.id,
          name: recipe.name,
          type: recipe.type,
          prep_time: recipe.prep_time,
          image_url: recipe.image_url,
          matched_ingredients: matchedIngredients,
          match_count: matchedIngredients.length,
        });
      }
    }

    // 按匹配食材数量降序排序
    suggestions.sort((a, b) => b.match_count - a.match_count);

    return {
      expiring_ingredients: expiringItems,
      suggestions: suggestions.slice(0, 10),
    };
  }

  // 获取分类
  async getCategories() {
    const types = await db('recipes')
      .where('is_active', true)
      .distinct('type')
      .pluck('type');

    const allCategories = await db('recipes')
      .where('is_active', true)
      .select('category');

    const categorySet = new Set<string>();
    allCategories.forEach((item: any) => {
      if (Array.isArray(item.category)) {
        item.category.forEach((c: string) => categorySet.add(c));
      }
    });

    const difficulties = await db('recipes')
      .where('is_active', true)
      .distinct('difficulty')
      .pluck('difficulty');

    return {
      types,
      categories: Array.from(categorySet),
      difficulties,
    };
  }
}
