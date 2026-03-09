import { Request, Response } from 'express';
import { ShoppingListService } from '../services/shoppingList.service';
import { shoppingFeedbackService } from '../services/shoppingFeedback.service';
import { idempotencyService } from '../services/idempotency.service';
import { logger } from '../utils/logger';

export class ShoppingListController {
  private shoppingListService: ShoppingListService;

  constructor() {
    this.shoppingListService = new ShoppingListService();
  }

  generateShoppingList = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { date, meal_types = ['breakfast', 'lunch', 'dinner'], servings = 2 } = req.body;
      const merge = req.query.merge === 'true';

      const result = await this.shoppingListService.generateShoppingList({
        user_id: userId,
        date,
        meal_types,
        servings,
        merge,
      });

      res.json({ code: 200, message: '生成成功', data: result });
    } catch (error) {
      logger.error('Failed to generate shopping list', { error });
      res.status(500).json({ code: 500, message: '生成购物清单失败', data: null });
    }
  };

  getShoppingLists = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { start_date, end_date } = req.query;

      const result = await this.shoppingListService.getShoppingLists(
        userId,
        start_date as string,
        end_date as string
      );

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get shopping lists', { error });
      res.status(500).json({ code: 500, message: '获取购物清单失败', data: null });
    }
  };

  getShoppingListById = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;

      const result = await this.shoppingListService.getShoppingListById(listId, userId);

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get shopping list detail', { error });
      res.status(404).json({ code: 404, message: '购物清单不存在', data: null });
    }
  };

  updateListItem = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const {
        area,
        ingredient_id,
        checked,
        assignee,
        status,
        expected_version,
        client_operation_id,
        substitute_ingredient_key,
        substitute_ingredient_name,
        substitute_reason,
      } = req.body;

      const result = await this.shoppingListService.updateListItem({
        list_id: listId,
        user_id: userId,
        area,
        ingredient_id,
        checked,
        assignee,
        status,
        expectedVersion: expected_version,
        clientOperationId: client_operation_id,
        substitute_ingredient_key,
        substitute_ingredient_name,
        substitute_reason,
      });

      res.json({ code: 200, message: '更新成功', data: result });
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('VERSION_CONFLICT')) {
        res.status(409).json({ code: 409, message: errorMessage, data: null });
        return;
      }

      logger.error('Failed to update list item', { error });
      res.status(500).json({ code: 500, message: errorMessage || '更新购物清单项失败', data: null });
    }
  };

  createShareLink = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const result = await this.shoppingListService.createShareLink(listId, userId);

      res.json({ code: 200, message: '生成分享链接成功', data: result });
    } catch (error) {
      logger.error('Failed to create shopping list share link', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '生成分享链接失败', data: null });
    }
  };

  joinByInviteCode = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { invite_code } = req.body || {};
      const result = await this.shoppingListService.joinByInviteCode(String(invite_code || '').trim(), userId);

      res.json({ code: 200, message: '加入共享清单成功', data: result });
    } catch (error) {
      logger.error('Failed to join shopping list by invite code', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '加入共享清单失败', data: null });
    }
  };

  regenerateShareInvite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const result = await this.shoppingListService.regenerateShareInvite(listId, userId);
      res.json({ code: 200, message: '邀请码已更新', data: result });
    } catch (error) {
      logger.error('Failed to regenerate shopping list share invite', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '更新邀请码失败', data: null });
    }
  };

  removeShareMember = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId, memberId } = req.params;
      const result = await this.shoppingListService.removeShareMember(listId, userId, memberId);
      res.json({ code: 200, message: '成员已移除', data: result });
    } catch (error) {
      logger.error('Failed to remove shopping list share member', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '移除成员失败', data: null });
    }
  };

  markComplete = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { listId } = req.params;
      const {
        client_operation_id,
        include_inventory_restock = true,
        expected_version,
      } = req.body;

      if (client_operation_id) {
        const replay = await idempotencyService.replay('shopping_list_complete', client_operation_id);
        if (replay) {
          res.json({ code: 200, message: '标记成功', data: replay });
          return;
        }
      }

      if (expected_version !== undefined) {
        const list = await this.shoppingListService.getShoppingListById(listId, userId);
        if (list.version !== expected_version) {
          res.status(409).json({
            code: 409,
            message: 'VERSION_CONFLICT: 清单已被其他用户修改，请刷新后重试',
            data: null,
          });
          return;
        }
      }

      const result = await this.shoppingListService.markComplete({
        listId,
        userId,
        clientOperationId: client_operation_id,
        includeInventoryRestock: include_inventory_restock,
      });

      res.json({ code: 200, message: '标记成功', data: result });
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('VERSION_CONFLICT')) {
        res.status(409).json({ code: 409, message: errorMessage, data: null });
        return;
      }

      logger.error('Failed to mark list complete', { error });
      res.status(500).json({ code: 500, message: errorMessage || '标记完成失败', data: null });
    }
  };

  addRecipeToShoppingList = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipe_id, list_date, servings = 2 } = req.body;

      logger.info('[Backend] addRecipeToShoppingList called:', { userId, recipe_id, list_date, servings });

      const result = await this.shoppingListService.addRecipeToShoppingList({
        user_id: userId,
        recipe_id,
        list_date,
        servings,
      });

      logger.info('[Backend] addRecipeToShoppingList success, result:', JSON.stringify(result, null, 2));
      res.json({ code: 200, message: '添加成功', data: result });
    } catch (error) {
      logger.error('[Backend] addRecipeToShoppingList failed:', error);
      logger.error('Failed to add recipe to shopping list', { error });
      res.status(500).json({ code: 500, message: error instanceof Error ? error.message : '添加菜谱到购物清单失败', data: null });
    }
  };

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

      res.json({ code: 200, message: '删除成功', data: result });
    } catch (error) {
      logger.error('Failed to remove list item', { error });
      res.status(500).json({ code: 500, message: error instanceof Error ? error.message : '删除购物清单项失败', data: null });
    }
  };

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

      res.json({ code: 200, message: '添加成功', data: result });
    } catch (error) {
      logger.error('Failed to add list item', { error });
      res.status(500).json({ code: 500, message: error instanceof Error ? error.message : '添加购物清单项失败', data: null });
    }
  };

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

      res.json({ code: 200, message: checked ? '全选成功' : '取消全选成功', data: result });
    } catch (error) {
      logger.error('Failed to toggle all items', { error });
      res.status(500).json({ code: 500, message: '操作失败', data: null });
    }
  };

  getFeedbackEvents = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { ingredient_key, event_type, since, limit, cursor } = req.query;

      const result = await shoppingFeedbackService.getFeedbackEvents({
        userId,
        ingredientKey: ingredient_key as string,
        eventType: event_type as any,
        since: since as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        cursor: cursor as string,
      });

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get feedback events', { error });
      res.status(500).json({ code: 500, message: '获取反馈事件失败', data: null });
    }
  };
}
