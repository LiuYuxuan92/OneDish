import { Request, Response } from 'express';
import { Knex } from 'knex';
import { logger } from '../utils/logger';

export class IngredientInventoryController {
  constructor(private knex: Knex) {}

  // 获取用户的所有食材库存
  async getInventory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const inventory = await this.knex('ingredient_inventory')
        .where({ user_id: userId, is_active: true })
        .orderBy('expiry_date', 'asc');

      // 计算即将过期的食材（3天内）
      const today = new Date();
      const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      const expiringItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        return expiryDate >= today && expiryDate <= threeDaysLater;
      });

      const expiredItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        return new Date(item.expiry_date) < today;
      });

      res.json({
        inventory,
        stats: {
          total: inventory.length,
          expiring: expiringItems.length,
          expired: expiredItems.length,
        },
      });
    } catch (error) {
      logger.error('获取食材库存失败:', error);
      res.status(500).json({ error: '获取食材库存失败' });
    }
  }

  // 添加食材到库存
  async addInventory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const { ingredient_id, ingredient_name, quantity, unit, expiry_date, purchase_date, location, notes } = req.body;

      if (!ingredient_name || !quantity || !unit) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      const [newInventory] = await this.knex('ingredient_inventory')
        .insert({
          user_id: userId,
          ingredient_id: ingredient_id || null,
          ingredient_name,
          quantity,
          unit,
          expiry_date,
          purchase_date,
          location: location || '冷藏',
          notes,
        })
        .returning('*');

      res.status(201).json(newInventory);
    } catch (error) {
      logger.error('添加食材库存失败:', error);
      res.status(500).json({ error: '添加食材库存失败' });
    }
  }

  // 更新食材库存
  async updateInventory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const { id } = req.params;
      const { quantity, unit, expiry_date, location, notes, is_active } = req.body;

      const [updated] = await this.knex('ingredient_inventory')
        .where({ id, user_id: userId })
        .update({
          quantity,
          unit,
          expiry_date,
          location,
          notes,
          is_active,
          updated_at: this.knex.fn.now(),
        })
        .returning('*');

      if (!updated) {
        return res.status(404).json({ error: '食材库存不存在' });
      }

      res.json(updated);
    } catch (error) {
      logger.error('更新食材库存失败:', error);
      res.status(500).json({ error: '更新食材库存失败' });
    }
  }

  // 删除食材库存（软删除）
  async deleteInventory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const { id } = req.params;

      const [deleted] = await this.knex('ingredient_inventory')
        .where({ id, user_id: userId })
        .update({ is_active: false, updated_at: this.knex.fn.now() })
        .returning('*');

      if (!deleted) {
        return res.status(404).json({ error: '食材库存不存在' });
      }

      res.json({ message: '删除成功' });
    } catch (error) {
      logger.error('删除食材库存失败:', error);
      res.status(500).json({ error: '删除食材库存失败' });
    }
  }

  // 批量删除食材库存
  async batchDeleteInventory(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: '缺少食材ID列表' });
      }

      await this.knex('ingredient_inventory')
        .whereIn('id', ids)
        .where({ user_id: userId })
        .update({ is_active: false, updated_at: this.knex.fn.now() });

      res.json({ message: '批量删除成功' });
    } catch (error) {
      logger.error('批量删除食材库存失败:', error);
      res.status(500).json({ error: '批量删除食材库存失败' });
    }
  }

  // 获取即将过期的食材（包含推荐菜谱）
  async getExpiringItems(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      const days = parseInt(req.query.days as string) || 3;

      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const expiringItems = await this.knex('ingredient_inventory')
        .where('user_id', userId)
        .where('is_active', true)
        .whereNotNull('expiry_date')
        .where('expiry_date', '>=', today.toISOString().split('T')[0])
        .where('expiry_date', '<=', futureDate.toISOString().split('T')[0])
        .orderBy('expiry_date', 'asc');

      // 获取推荐菜谱（使用即将过期的食材）
      const expiringIngredientNames = expiringItems.map(item => item.ingredient_name);
      let recommendedRecipes: any[] = [];

      if (expiringIngredientNames.length > 0) {
        // 查找包含即将过期食材的菜谱
        const recipes = await this.knex('recipes')
          .where('is_active', true)
          .select('*');

        // 过滤出包含即将过期食材的菜谱
        const matchedRecipes = recipes.filter(recipe => {
          try {
            const adultVersion = typeof recipe.adult_version === 'string' 
              ? JSON.parse(recipe.adult_version) 
              : recipe.adult_version;
            const ingredients = adultVersion?.ingredients || [];
            return ingredients.some((ing: any) => 
              expiringIngredientNames.some(name => 
                ing.name && name.includes(ing.name)
              )
            );
          } catch {
            return false;
          }
        });

        // 按匹配数量排序，优先推荐使用最多过期食材的菜谱
        matchedRecipes.sort((a, b) => {
          const countA = this.countMatchingIngredients(a, expiringIngredientNames);
          const countB = this.countMatchingIngredients(b, expiringIngredientNames);
          return countB - countA;
        });

        recommendedRecipes = matchedRecipes.slice(0, 6).map(recipe => ({
          id: recipe.id,
          name: recipe.name,
          image_url: recipe.image_url,
          prep_time: recipe.prep_time,
          type: recipe.type,
          matched_ingredients: this.getMatchingIngredients(recipe, expiringIngredientNames),
        }));
      }

      res.json({
        items: expiringItems,
        count: expiringItems.length,
        recommended_recipes: recommendedRecipes,
      });
    } catch (error) {
      logger.error('获取即将过期食材失败:', error);
      res.status(500).json({ error: '获取即将过期食材失败' });
    }
  }

  // 辅助方法：计算匹配食材数量
  private countMatchingIngredients(recipe: any, ingredientNames: string[]): number {
    try {
      const adultVersion = typeof recipe.adult_version === 'string' 
        ? JSON.parse(recipe.adult_version) 
        : recipe.adult_version;
      const ingredients = adultVersion?.ingredients || [];
      return ingredients.filter((ing: any) => 
        ingredientNames.some(name => ing.name && (ing.name.includes(name) || name.includes(ing.name)))
      ).length;
    } catch {
      return 0;
    }
  }

  // 辅助方法：获取匹配的食材
  private getMatchingIngredients(recipe: any, ingredientNames: string[]): string[] {
    try {
      const adultVersion = typeof recipe.adult_version === 'string' 
        ? JSON.parse(recipe.adult_version) 
        : recipe.adult_version;
      const ingredients = adultVersion?.ingredients || [];
      return ingredients
        .filter((ing: any) => 
          ingredientNames.some(name => ing.name && (ing.name.includes(name) || name.includes(ing.name)))
        )
        .map((ing: any) => ing.name);
    } catch {
      return [];
    }
  }
}
