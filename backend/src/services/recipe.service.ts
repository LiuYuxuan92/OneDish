import { db } from '../config/database';
import { Recipe, RecipeSummary, PaginationResult } from '../types';
import { logger } from '../utils/logger';

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
}

export class RecipeService {
  // 获取今日推荐
  async getDailyRecommendation(params: DailyRecommendationParams) {
    const { type, max_time = 30, user_id } = params;
    const mixUgcEnabled = process.env.RECOMMEND_MIX_UGC_ENABLED !== 'false';

    let profileTags: any = null;
    if (user_id) {
      const user = await db('users').where({ id: user_id }).first();
      profileTags = user?.preferences?.profile_tags || null;
    }

    let query = db('recipes')
      .where('is_active', true)
      .where('prep_time', '<=', max_time);

    if (type) {
      query = query.where('type', type) as any;
    } else if (Array.isArray(profileTags?.meal_slots) && profileTags.meal_slots.length > 0) {
      query = query.whereIn('type', profileTags.meal_slots) as any;
    }

    const recipes = await query.select('*');
    let recipe: any = recipes.length > 0 ? recipes[Math.floor(Math.random() * recipes.length)] : null;

    if (mixUgcEnabled) {
      const ugcQuery = db('user_recipes')
        .where({ is_active: true, status: 'published', in_recommend_pool: true })
        .where('prep_time', '<=', max_time)
        .orderBy('quality_score', 'desc')
        .limit(30);

      if (type) ugcQuery.andWhere('type', type);
      if (!type && Array.isArray(profileTags?.meal_slots) && profileTags.meal_slots.length > 0) {
        ugcQuery.whereIn('type', profileTags.meal_slots);
      }
      if (profileTags?.baby_stage) ugcQuery.andWhere('baby_age_range', 'like', `%${profileTags.baby_stage}%`);

      let ugcCandidates = await ugcQuery.select('*');
      if (Array.isArray(profileTags?.flavors) && profileTags.flavors.length > 0) {
        ugcCandidates = ugcCandidates.filter((r: any) => {
          const tags = Array.isArray(r.tags) ? r.tags : (() => {
            try { return JSON.parse(r.tags || '[]'); } catch { return []; }
          })();
          return tags.some((t: string) => profileTags.flavors.includes(t));
        });
      }
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

    return {
      date: new Date().toISOString().split('T')[0],
      recipe: parsedRecipe,
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

    return {
      ...parsedRecipe,
      is_favorited: isFavorited,
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
    } = params;

    console.log('[searchRecipes] params:', params);

    let query = db('recipes')
      .where('is_active', 1)  // SQLite boolean: 1 = true
      .select('id', 'name', 'type', 'prep_time', 'image_url');

    console.log('[searchRecipes] base query built');

    if (keyword && keyword.trim()) {
      // 使用 LIKE 进行中文搜索（SQLite 对中文支持良好）
      const searchPattern = `%${keyword.trim()}%`;
      console.log('[searchRecipes] keyword:', keyword, 'pattern:', searchPattern);
      query = query.andWhere(function() {
        this.where('name', 'like', searchPattern);
      });
      console.log('[searchRecipes] keyword filter applied');
    }

    if (type) {
      query = query.where('type', type);
    }

    if (max_time) {
      query = query.where('prep_time', '<=', max_time);
    }

    if (difficulty) {
      query = query.where('difficulty', difficulty);
    }

    if (category) {
      query = query.whereRaw('? = ANY(category)', [category]);
    }

    // 获取总数
    const totalResult = await query.clone().count('* as count').first();
    const total = Number(totalResult?.count || 0);
    console.log('[searchRecipes] total count:', total);

    // 获取分页数据
    const items = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      total,
      page,
      limit,
      items,
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
