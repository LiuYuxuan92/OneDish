import { Request, Response } from 'express';
import { ShoppingListService } from '../services/shoppingList.service';
import { logger } from '../utils/logger';

export class ShoppingListController {
  private shoppingListService: ShoppingListService;

  constructor() {
    this.shoppingListService = new ShoppingListService();
  }

  // 生成购物清单
  generateShoppingList = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { date, meal_types = ['breakfast', 'lunch', 'dinner'], servings = 2 } = req.body;

      const result = await this.shoppingListService.generateShoppingList({
        user_id: userId,
        date,
        meal_types,
        servings,
      });

      res.json({
        code: 200,
        message: '生成成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to generate shopping list', { error });
      res.status(500).json({
        code: 500,
        message: '生成购物清单失败',
        data: null,
      });
    }
  };

  // 获取历史购物清单
  getShoppingLists = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { start_date, end_date } = req.query;

      const result = await this.shoppingListService.getShoppingLists(
        userId,
        start_date as string,
        end_date as string
      );

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get shopping lists', { error });
      res.status(500).json({
        code: 500,
        message: '获取购物清单失败',
        data: null,
      });
    }
  };

  // 获取单个购物清单详情
  getShoppingListById = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;

      const result = await this.shoppingListService.getShoppingListById(listId, userId);

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get shopping list detail', { error });
      res.status(404).json({
        code: 404,
        message: '购物清单不存在',
        data: null,
      });
    }
  };

  // 更新购物清单项状态
  updateListItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const { area, ingredient_id, checked } = req.body;

      const result = await this.shoppingListService.updateListItem({
        list_id: listId,
        user_id: userId,
        area,
        ingredient_id,
        checked,
      });

      res.json({
        code: 200,
        message: '更新成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to update list item', { error });
      res.status(500).json({
        code: 500,
        message: '更新购物清单项失败',
        data: null,
      });
    }
  };

  // 标记清单为完成
  markComplete = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;

      await this.shoppingListService.markComplete(listId, userId);

      res.json({
        code: 200,
        message: '标记成功',
        data: null,
      });
    } catch (error) {
      logger.error('Failed to mark list complete', { error });
      res.status(500).json({
        code: 500,
        message: '标记完成失败',
        data: null,
      });
    }
  };

  // 将单个菜谱加入购物清单
  addRecipeToShoppingList = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipe_id, list_date, servings = 2 } = req.body;

      console.log('[Backend] addRecipeToShoppingList called:', { userId, recipe_id, list_date, servings });

      const result = await this.shoppingListService.addRecipeToShoppingList({
        user_id: userId,
        recipe_id,
        list_date,
        servings,
      });

      console.log('[Backend] addRecipeToShoppingList success, result:', JSON.stringify(result, null, 2));

      res.json({
        code: 200,
        message: '添加成功',
        data: result,
      });
    } catch (error) {
      console.error('[Backend] addRecipeToShoppingList failed:', error);
      logger.error('Failed to add recipe to shopping list', { error });
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '添加菜谱到购物清单失败',
        data: null,
      });
    }
  };

  // 删除购物清单项
  removeListItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const { area, item_name } = req.body;

      const result = await this.shoppingListService.removeListItem({
        list_id: listId,
        user_id: userId,
        area,
        item_name,
      });

      res.json({
        code: 200,
        message: '删除成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to remove list item', { error });
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '删除购物清单项失败',
        data: null,
      });
    }
  };

  // 手动添加购物清单项
  addListItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const { item_name, amount, area } = req.body;

      const result = await this.shoppingListService.addListItem({
        list_id: listId,
        user_id: userId,
        item_name,
        amount,
        area,
      });

      res.json({
        code: 200,
        message: '添加成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to add list item', { error });
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '添加购物清单项失败',
        data: null,
      });
    }
  };

  // 全选/取消全选
  toggleAllItems = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const { checked } = req.body;

      const result = await this.shoppingListService.toggleAllItems({
        list_id: listId,
        user_id: userId,
        checked,
      });

      res.json({
        code: 200,
        message: checked ? '全选成功' : '取消全选成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to toggle all items', { error });
      res.status(500).json({
        code: 500,
        message: '操作失败',
        data: null,
      });
    }
  };
}
