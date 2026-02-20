import { db } from '../config/database';
import { RecipeSummary } from '../types';

export class FavoriteService {
  // 添加收藏
  async addFavorite(userId: string, recipeId: string) {
    // 检查是否已收藏
    const existing = await db('favorites')
      .where('user_id', userId)
      .where('recipe_id', recipeId)
      .first();

    if (existing) {
      throw new Error('已经收藏过了');
    }

    const [favorite] = await db('favorites')
      .insert({
        user_id: userId,
        recipe_id: recipeId,
      })
      .returning('*');

    return favorite;
  }

  // 取消收藏
  async removeFavorite(userId: string, recipeId: string) {
    await db('favorites')
      .where('user_id', userId)
      .where('recipe_id', recipeId)
      .delete();
  }

  // 获取收藏列表
  async getFavorites(userId: string, page: number, limit: number) {
    // 获取总数
    const totalResult = await db('favorites')
      .where('user_id', userId)
      .count('* as count')
      .first();
    const total = Number(totalResult?.count || 0);

    // 获取分页数据
    const items = await db('favorites')
      .join('recipes', 'favorites.recipe_id', 'recipes.id')
      .where('favorites.user_id', userId)
      .select(
        'favorites.id',
        'favorites.created_at',
        'recipes.id as recipe_id',
        'recipes.name',
        'recipes.prep_time',
        'recipes.image_url'
      )
      .orderBy('favorites.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      total,
      page,
      limit,
      items: items.map((item: any) => ({
        id: item.id,
        recipe: {
          id: item.recipe_id,
          name: item.name,
          prep_time: item.prep_time,
          image_url: item.image_url,
        },
        created_at: item.created_at,
      })),
    };
  }

  // 检查是否已收藏
  async checkFavorite(userId: string, recipeId: string): Promise<boolean> {
    const favorite = await db('favorites')
      .where('user_id', userId)
      .where('recipe_id', recipeId)
      .first();

    return !!favorite;
  }
}
