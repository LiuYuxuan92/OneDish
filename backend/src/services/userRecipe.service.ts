import { db } from '../config/database';
import { logger } from '../utils/logger';

export class UserRecipeService {
  /**
   * 从搜索结果保存到用户菜谱库
   */
  async saveFromSearch(userId: string, searchResult: any) {
    const {
      name, source, type, prep_time, difficulty, servings,
      ingredients, steps, description,
      cooking_tips, image_url, tags, category,
      adult_version, baby_version,
    } = searchResult;

    // 构建 adult_version：如果原始数据有 adult_version 直接用，否则从 ingredients/steps 构建
    let adultVersion = adult_version;
    if (!adultVersion && (ingredients || steps)) {
      adultVersion = {
        ingredients: (ingredients || []).map((ing: string) => {
          const trimmed = ing.trim();
          const lastSpace = trimmed.lastIndexOf(' ');
          if (lastSpace > 0) {
            return { name: trimmed.slice(0, lastSpace), amount: trimmed.slice(lastSpace + 1) };
          }
          return { name: trimmed, amount: '' };
        }),
        steps: (steps || []).map((step: string, i: number) => ({
          step: i + 1,
          action: step.trim(),
          time: 0,
        })),
        seasonings: [],
      };
    }

    const [recipe] = await db('user_recipes')
      .insert({
        user_id: userId,
        source: source || 'search',
        original_data: JSON.stringify(searchResult),
        name,
        type: type || null,
        prep_time: prep_time || null,
        difficulty: difficulty || null,
        servings: servings || null,
        adult_version: adultVersion ? JSON.stringify(adultVersion) : null,
        baby_version: baby_version ? JSON.stringify(baby_version) : null,
        cooking_tips: cooking_tips ? JSON.stringify(cooking_tips) : null,
        image_url: image_url ? JSON.stringify(image_url) : null,
        tags: tags ? JSON.stringify(tags) : null,
        category: category ? JSON.stringify(category) : null,
      })
      .returning('*');

    return this.parseRecipe(recipe);
  }

  /**
   * 获取用户菜谱列表
   */
  async getUserRecipes(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [countResult] = await db('user_recipes')
      .where('user_id', userId)
      .where('is_active', true)
      .count('id as total');

    const total = Number(countResult.total);

    const recipes = await db('user_recipes')
      .where('user_id', userId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);

    return {
      total,
      page,
      limit,
      items: recipes.map((r: any) => this.parseRecipe(r)),
    };
  }

  /**
   * 获取用户菜谱详情
   */
  async getUserRecipeDetail(userId: string, recipeId: string) {
    const recipe = await db('user_recipes')
      .where('id', recipeId)
      .where('user_id', userId)
      .where('is_active', true)
      .first();

    if (!recipe) {
      throw new Error('菜谱不存在');
    }

    return this.parseRecipe(recipe);
  }

  /**
   * 删除用户菜谱（软删除）
   */
  async deleteUserRecipe(userId: string, recipeId: string) {
    const affected = await db('user_recipes')
      .where('id', recipeId)
      .where('user_id', userId)
      .update({ is_active: false });

    if (affected === 0) {
      throw new Error('菜谱不存在');
    }
  }

  /**
   * 解析 JSON 字段
   */
  private parseRecipe(recipe: any) {
    if (!recipe) return recipe;
    const jsonFields = ['original_data', 'adult_version', 'baby_version', 'cooking_tips', 'image_url', 'tags', 'category'];
    for (const field of jsonFields) {
      if (recipe[field] && typeof recipe[field] === 'string') {
        try {
          recipe[field] = JSON.parse(recipe[field]);
        } catch {
          // keep as-is
        }
      }
    }
    return recipe;
  }
}
