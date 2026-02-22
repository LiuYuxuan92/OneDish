import { Request, Response } from 'express';
import { Knex } from 'knex';

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
      console.error('获取食材库存失败:', error);
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
      console.error('添加食材库存失败:', error);
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
      console.error('更新食材库存失败:', error);
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
      console.error('删除食材库存失败:', error);
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
      console.error('批量删除食材库存失败:', error);
      res.status(500).json({ error: '批量删除食材库存失败' });
    }
  }

  // 获取即将过期的食材
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

      res.json(expiringItems);
    } catch (error) {
      console.error('获取即将过期食材失败:', error);
      res.status(500).json({ error: '获取即将过期食材失败' });
    }
  }
}
