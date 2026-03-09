import { db } from '../config/database';
import { logger } from '../utils/logger';
import { familyService } from './family.service';
import { ShoppingListShareService } from './shoppingList/share/shoppingListShare.service';
import { ShoppingListGenerationService } from './shoppingList/shoppingListGeneration.service';
import { ShoppingListInventoryService } from './shoppingList/shoppingListInventory.service';
import { shoppingFeedbackService, ShoppingFeedbackEvent } from './shoppingFeedback.service';
import { idempotencyService } from './idempotency.service';

export class ShoppingListService {
  private static readonly DEFAULT_ITEMS_STRUCTURE: Record<string, any[]> = {
    produce: [],
    protein: [],
    staple: [],
    seasoning: [],
    snack_dairy: [],
    household: [],
    other: [],
  };

  // 共享服务实例
  private shareService: ShoppingListShareService;
  // 生成服务实例
  private generationService: ShoppingListGenerationService;
  private inventoryService: ShoppingListInventoryService;

  constructor() {
    this.shareService = new ShoppingListShareService();
    this.generationService = new ShoppingListGenerationService();
    this.inventoryService = new ShoppingListInventoryService();
  }

  /**
   * 获取共享服务实例（用于获取分享上下文等）
   */
  getShareService(): ShoppingListShareService {
    return this.shareService;
  }

  /**
   * 规范化区域名称
   */
  private normalizeArea(area?: string): string {
    const key = (area || '').trim().toLowerCase();

    const areaAliasMap: Record<string, string> = {
      // v2
      produce: 'produce',
      protein: 'protein',
      staple: 'staple',
      seasoning: 'seasoning',
      snack_dairy: 'snack_dairy',
      snackdairy: 'snack_dairy',
      household: 'household',
      other: 'other',

      // legacy
      '蔬果区': 'produce',
      '调料区': 'seasoning',
      '超市区': 'other',
      '其他': 'other',
      supermarket: 'other',
      market: 'other',
      grocery: 'other',
      vegetable: 'produce',
      fruit: 'produce',
      spice: 'seasoning',
      condiment: 'seasoning',
      others: 'other',
      misc: 'other',
      miscellaneous: 'other',
    };

    return areaAliasMap[key] || areaAliasMap[area || ''] || 'other';
  }

  /**
   * 规范化购物清单项结构
   */
  private normalizeShoppingItems(items: any): Record<string, any[]> {
    const normalized: Record<string, any[]> = {
      produce: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.produce],
      protein: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.protein],
      staple: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.staple],
      seasoning: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.seasoning],
      snack_dairy: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.snack_dairy],
      household: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.household],
      other: [...ShoppingListService.DEFAULT_ITEMS_STRUCTURE.other],
    };

    if (!items || typeof items !== 'object') {
      return normalized;
    }

    for (const [areaKey, areaItems] of Object.entries(items)) {
      const area = this.normalizeArea(areaKey);
      const list = Array.isArray(areaItems) ? areaItems : [];
      normalized[area].push(...list.map((item: any) => ({
        ...item,
        category: area,
        source: item?.source || 'manual',
        source_date: item?.source_date || null,
        source_meal_type: item?.source_meal_type || null,
        source_recipe_id: item?.source_recipe_id || null,
        servings: typeof item?.servings === 'number' ? item.servings : null,
        assignee: typeof item?.assignee === 'undefined' ? null : item.assignee,
        status: item?.status || (item?.checked ? 'done' : 'todo'),
      })));
    }

    return normalized;
  }

  // ========== 核心 CRUD 方法 ==========

  /**
   * 获取历史购物清单
   */
  async getShoppingLists(userId: string, startDate?: string, endDate?: string) {
    const familyId = await familyService.getFamilyIdForUser(userId);
    let query = familyId
      ? db('shopping_lists').where('family_id', familyId)
      : db('shopping_lists').where('user_id', userId);

    if (startDate) {
      query = query.where('list_date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('list_date', '<=', endDate);
    }

    const items = await query
      .select(
        'id',
        'list_date',
        'items',
        'total_estimated_cost',
        'is_completed',
        'created_at'
      )
      .orderBy('list_date', 'desc')
      .orderBy('created_at', 'desc');  // 同一天按创建时间降序

    // 为每个列表计算统计信息
    return {
      items: await Promise.all(items.map(async (list: any) => {
        // 解析 JSON 字符串，使用安全解析避免corrupted data导致的崩溃
        let parsedItems;
        try {
          const rawItems = typeof list.items === 'string'
            ? JSON.parse(list.items)
            : list.items;
          parsedItems = this.normalizeShoppingItems(rawItems);
        } catch (e) {
          // 如果解析失败，返回空结构
          logger.error('[Backend] Failed to parse items for list:', list.id, e);
          parsedItems = this.normalizeShoppingItems(null);
        }

        const totalItems = Object.values(parsedItems || {}).reduce(
          (sum: number, items: any) => sum + items.length,
          0
        );
        const uncheckedItems = Object.values(parsedItems || {}).reduce(
          (sum: number, items: any) =>
            sum + items.filter((i: any) => !i.checked).length,
          0
        );
        const inventory_summary = await this.inventoryService.buildCoverageSummary(userId, parsedItems);
        return {
          ...list,
          items: parsedItems,
          total_items: totalItems,
          unchecked_items: uncheckedItems,
          inventory_summary,
        };
      })),
    };
  }

  /**
   * 获取单个购物清单详情
   */
  async getShoppingListById(listId: string, userId: string) {
    const list = await this.shareService.getAccessibleListOrThrow(listId, userId);

    // 解析 JSON 字符串，使用安全解析避免corrupted data导致的崩溃
    let parsedItems;
    try {
      const rawItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
      parsedItems = this.normalizeShoppingItems(rawItems);
    } catch (e) {
      // 如果解析失败，返回空结构
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      parsedItems = this.normalizeShoppingItems(null);
    }

    // 计算统计信息
    const totalItems = Object.values(parsedItems || {}).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );
    const uncheckedItems = Object.values(parsedItems || {}).reduce(
      (sum: number, items: any) =>
        sum + items.filter((i: any) => !i.checked).length,
      0
    );

    const shareContext = await this.shareService.getShareContextByListId(listId, userId);
    const inventory_summary = await this.inventoryService.buildCoverageSummary(userId, parsedItems);

    return {
      ...list,
      items: parsedItems,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
      inventory_summary,
      share: shareContext,
    };
  }

  /**
   * 更新购物清单项状态（带乐观锁支持）
   */
  async updateListItem(data: {
    list_id: string;
    user_id: string;
    area: string;
    ingredient_id: string;
    checked?: boolean;
    assignee?: string | null;
    status?: 'todo' | 'doing' | 'done' | 'out_of_stock' | 'substituted' | 'skipped' | null;
    expectedVersion?: number;
    clientOperationId?: string;
    substitute_ingredient_key?: string;
    substitute_ingredient_name?: string;
    substitute_reason?: 'out_of_stock' | 'personal_preference' | 'price' | 'other';
  }) {
    const { 
      list_id, user_id, area, ingredient_id, checked, assignee, status, 
      expectedVersion, clientOperationId, substitute_ingredient_key, 
      substitute_ingredient_name, substitute_reason 
    } = data;

    // 幂等检查
    if (clientOperationId) {
      const replay = await idempotencyService.replay('shopping_item_update', clientOperationId);
      if (replay) {
        logger.info('[Backend] updateListItem idempotent replay:', { list_id, clientOperationId });
        return replay;
      }
    }

    logger.debug('[Backend] updateListItem called:', { list_id, user_id, area, ingredient_id, checked, status });

    const list = await this.shareService.getAccessibleListOrThrow(list_id, user_id);
    const canWrite = await this.shareService.canWriteList(list_id, user_id);
    if (!canWrite) {
      throw new Error('无权限修改该购物清单');
    }

    // Parse items from JSON string to object
    const rawItems = typeof list.items === 'string'
      ? JSON.parse(list.items)
      : list.items;
    const items = this.normalizeShoppingItems(rawItems);
    const normalizedArea = this.normalizeArea(area);

    logger.debug('[Backend] Items before update:', JSON.stringify(items, null, 2));

    let itemUpdated = false;
    let oldStatus = null;
    let ingredientKey = '';

    if (items[normalizedArea]) {
      // 首先尝试通过 ingredient_id 查找
      let item = items[normalizedArea].find(
        (i) => i.ingredient_id === ingredient_id
      );
      logger.debug('[Backend] Found by ingredient_id:', item);

      // 如果没找到，尝试通过 name 查找（处理手动添加的项）
      if (!item) {
        item = items[normalizedArea].find(
          (i) => i.name === ingredient_id
        );
        logger.debug('[Backend] Found by name:', item);
      }

      if (item) {
        ingredientKey = item.ingredient_id || item.name;
        oldStatus = item.status || (item.checked ? 'done' : 'todo');
        
        if (typeof checked === 'boolean') item.checked = checked;
        if (typeof assignee !== 'undefined') item.assignee = assignee;
        if (typeof status === 'string') {
          item.status = status;
          // 记录替代品信息
          if (status === 'substituted') {
            item.substitute_ingredient_key = substitute_ingredient_key;
            item.substitute_ingredient_name = substitute_ingredient_name;
            item.substitute_reason = substitute_reason;
          }
        }
        item.last_operated_by = user_id;
        item.last_operated_at = new Date().toISOString();
        
        itemUpdated = true;
        logger.debug('[Backend] Updated item:', { ingredient_id, oldStatus, newStatus: status, checked, assignee });
      } else {
        logger.debug('[Backend] ERROR: Item not found!');
      }
    } else {
      logger.debug('[Backend] ERROR: Area not found in items:', normalizedArea);
    }

    if (!itemUpdated) {
      throw new Error('项目不存在');
    }

    logger.debug('[Backend] Items after update:', JSON.stringify(items, null, 2));

    const currentVersion = list.version || 1;

    // 乐观锁检查
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error('VERSION_CONFLICT: 清单已被其他用户修改，请刷新后重试');
    }

    const [updated] = await db('shopping_lists')
      .where('id', list_id)
      .where('version', currentVersion)
      .update({ 
        items: JSON.stringify(items),
        version: currentVersion + 1,
        updated_at: new Date(),
      })
      .returning('*');

    if (!updated) {
      throw new Error('VERSION_CONFLICT: 清单已被其他用户修改，请刷新后重试');
    }

    logger.debug('[Backend] Updated from DB:', updated);

    // 解析 items 字段从 JSON 字符串转换为对象
    if (updated && typeof updated.items === 'string') {
      updated.items = this.normalizeShoppingItems(JSON.parse(updated.items));
    }

    // 记录反馈事件（仅对于需要记录的状态变更）
    const newStatus = status || (checked ? 'doing' : 'todo');
    if (oldStatus !== newStatus && (newStatus === 'out_of_stock' || newStatus === 'substituted' || newStatus === 'skipped')) {
      // 映射状态到事件类型
      const eventTypeMap: Record<string, 'out_of_stock' | 'substitute' | 'skip'> = {
        out_of_stock: 'out_of_stock',
        substituted: 'substitute',
        skipped: 'skip',
      };
      
      await shoppingFeedbackService.recordFeedbackEvent({
        user_id: user_id,
        list_id: list_id,
        item_id: itemUpdated ? (items[normalizedArea]?.find((i: any) => i.ingredient_id === ingredient_id || i.name === ingredient_id)?.id || ingredientKey) : ingredientKey,
        event_type: eventTypeMap[newStatus] || newStatus as any,
        ingredient_key: ingredientKey,
        substitute_key: substitute_ingredient_key,
        substitute_name: substitute_ingredient_name,
        reason: substitute_reason,
        actor_user_id: user_id,
      });
    }

    logger.debug('[Backend] Final result:', updated);

    // 记录幂等结果
    const response = { 
      item: updated,
      triggered_events: {
        feedback_recorded: oldStatus !== newStatus && (newStatus === 'out_of_stock' || newStatus === 'substituted' || newStatus === 'skipped'),
      },
      version: updated.version,
    };
    
    if (clientOperationId) {
      await idempotencyService.complete('shopping_item_update', clientOperationId, data, response, 86400);
    }

    return response;
  }

  /**
   * 标记清单为完成（带乐观锁和幂等支持）
   */
  async markComplete(data: {
    listId: string;
    userId: string;
    clientOperationId?: string;
    includeInventoryRestock?: boolean;
  }) {
    const { listId, userId, clientOperationId, includeInventoryRestock = true } = data;

    // 幂等检查：如果 clientOperationId 已存在且已完成，直接返回
    if (clientOperationId) {
      const replay = await idempotencyService.replay('shopping_list_complete', clientOperationId);
      if (replay) {
        logger.info('[Backend] markComplete idempotent replay:', { listId, clientOperationId });
        return replay;
      }
    }

    const list = await this.shareService.getAccessibleListOrThrow(listId, userId);
    const canWrite = await this.shareService.canWriteList(listId, userId);
    if (!canWrite) {
      throw new Error('无权限修改该购物清单');
    }

    // 状态检查：只有 open/in_progress 可以完成
    if (list.status === 'completed') {
      throw new Error('清单已完成');
    }
    if (list.status === 'archived') {
      throw new Error('清单已归档');
    }

    let items;
    try {
      const rawItems = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
      items = this.normalizeShoppingItems(rawItems);
    } catch {
      items = this.normalizeShoppingItems(null);
    }

    // 统计各类状态
    let purchasedCount = 0;
    let outOfStockCount = 0;
    let substitutedCount = 0;
    let skippedCount = 0;
    const feedbackEvents: Omit<ShoppingFeedbackEvent, 'id' | 'created_at'>[] = [];

    for (const area in items) {
      for (const item of items[area]) {
        const itemStatus = item.status || (item.checked ? 'done' : 'todo');
        const ingredientKey = item.ingredient_id || item.name;

        if (itemStatus === 'done' || item.checked) {
          purchasedCount++;
          // 记录购买事件
          feedbackEvents.push({
            user_id: userId,
            list_id: listId,
            item_id: item.id || ingredientKey,
            event_type: 'purchase',
            ingredient_key: ingredientKey,
            actor_user_id: userId,
            source_meal_plan_id: item.source_meal_plan_id || null,
            source_recipe_ids: item.source_recipe_id ? [item.source_recipe_id] : null,
          });
        } else if (item.status === 'out_of_stock') {
          outOfStockCount++;
          feedbackEvents.push({
            user_id: userId,
            list_id: listId,
            item_id: item.id || ingredientKey,
            event_type: 'out_of_stock',
            ingredient_key: ingredientKey,
            reason: item.out_of_stock_reason || null,
            actor_user_id: userId,
          });
        } else if (item.status === 'substituted') {
          substitutedCount++;
          feedbackEvents.push({
            user_id: userId,
            list_id: listId,
            item_id: item.id || ingredientKey,
            event_type: 'substitute',
            ingredient_key: ingredientKey,
            substitute_key: item.substitute_ingredient_key || null,
            substitute_name: item.substitute_ingredient_name || null,
            reason: item.substitute_reason || null,
            actor_user_id: userId,
          });
        } else if (item.status === 'skipped') {
          skippedCount++;
          feedbackEvents.push({
            user_id: userId,
            list_id: listId,
            item_id: item.id || ingredientKey,
            event_type: 'skip',
            ingredient_key: ingredientKey,
            actor_user_id: userId,
          });
        }
      }
    }

    const currentVersion = list.version || 1;

    // 使用事务确保原子性
    const result = await db.transaction(async (trx) => {
      // 乐观锁更新
      const updated = await trx('shopping_lists')
        .where('id', listId)
        .where('version', currentVersion)
        .update({
          is_completed: true,
          status: 'completed',
          completed_at: new Date(),
          completed_by: userId,
          version: currentVersion + 1,
          updated_at: new Date(),
        })
        .returning('*');

      if (updated.length === 0) {
        throw new Error('VERSION_CONFLICT: 清单已被其他用户修改，请刷新后重试');
      }

      // 入库（如果包含入库）
      if (includeInventoryRestock) {
        await this.inventoryService.restockCheckedShoppingItems(userId, items, trx);
      }

      // 记录反馈事件
      if (feedbackEvents.length > 0) {
        await shoppingFeedbackService.batchRecordFeedbackEvents(feedbackEvents);
      }

      return updated[0];
    });

    // 记录幂等结果
    if (clientOperationId) {
      const response = {
        list: {
          id: listId,
          status: 'completed',
          completed_at: result.completed_at,
          completed_by: userId,
          version: result.version,
        },
        restocked_items: includeInventoryRestock ? this.extractRestockedItems(items) : [],
        feedback_summary: {
          purchased_count: purchasedCount,
          out_of_stock_count: outOfStockCount,
          substituted_count: substitutedCount,
          skipped_count: skippedCount,
        },
      };
      
      await idempotencyService.complete('shopping_list_complete', clientOperationId, {}, response, 86400);
      return response;
    }

    return this.getShoppingListById(listId, userId);
  }

  /**
   * 从已购项目中提取入库信息
   */
  private extractRestockedItems(items: Record<string, any[]>): { ingredient_key: string; quantity: number; unit: string }[] {
    const restocked: { ingredient_key: string; quantity: number; unit: string }[] = [];
    
    for (const area in items) {
      for (const item of items[area]) {
        if (item.status === 'done' || item.checked) {
          restocked.push({
            ingredient_key: item.ingredient_id || item.name,
            quantity: parseFloat(item.amount) || 1,
            unit: item.unit || '个',
          });
        }
      }
    }
    
    return restocked;
  }

  /**
   * 删除购物清单项
   */
  async removeListItem(data: {
    list_id: string;
    user_id: string;
    area: string;
    item_name: string;
  }) {
    const { list_id, user_id, area, item_name } = data;

    logger.debug('[Backend] removeListItem called:', { list_id, user_id, area, item_name });

    const list = await this.shareService.getAccessibleListOrThrow(list_id, user_id);
    const canWrite = await this.shareService.canWriteList(list_id, user_id);
    if (!canWrite) {
      throw new Error('无权限修改该购物清单');
    }

    logger.debug('[Backend] Items before delete:', JSON.stringify(list.items, null, 2).substring(0, 200));

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      const rawItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
      items = this.normalizeShoppingItems(rawItems);
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = this.normalizeShoppingItems(null);
    }

    const normalizedArea = this.normalizeArea(area);

    if (!items[normalizedArea]) {
      throw new Error(`区域不存在: ${normalizedArea}`);
    }

    if (!Array.isArray(items[normalizedArea])) {
      throw new Error(`区域不是数组: ${normalizedArea}, type: ${typeof items[normalizedArea]}`);
    }

    logger.debug('[Backend] Area items before delete:', items[normalizedArea].map(i => i.name));

    // 删除指定项
    const originalLength = items[normalizedArea].length;
    items[normalizedArea] = items[normalizedArea].filter((i: any) => i.name !== item_name);

    if (items[normalizedArea].length === originalLength) {
      logger.error('[Backend] Item not found:', item_name, 'in area:', normalizedArea);
      throw new Error('项目不存在');
    }

    logger.debug('[Backend] Area items after delete:', items[normalizedArea].map(i => i.name));

    // 重新计算总价
    let totalCost = 0;
    for (const a in items) {
      for (const item of items[a]) {
        if (!item.checked) {
          totalCost += item.estimated_price || 0;
        }
      }
    }

    // 更新
    const [updated] = await db('shopping_lists')
      .where('id', list_id)
      .update({
        items: JSON.stringify(items),
        total_estimated_cost: totalCost,
      })
      .returning('*');

    // 计算统计信息
    const totalItems = Object.values(items).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );
    const uncheckedItems = Object.values(items).reduce(
      (sum: number, items: any) =>
        sum + items.filter((i: any) => !i.checked).length,
      0
    );

    return {
      ...updated,
      items: items,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
    };
  }

  /**
   * 手动添加购物清单项
   */
  async addListItem(data: {
    list_id: string;
    user_id: string;
    item_name: string;
    amount: string;
    area?: string;
  }) {
    const { list_id, user_id, item_name, amount, area } = data;

    const list = await this.shareService.getAccessibleListOrThrow(list_id, user_id);
    const canWrite = await this.shareService.canWriteList(list_id, user_id);
    if (!canWrite) {
      throw new Error('无权限修改该购物清单');
    }

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      const rawItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
      items = this.normalizeShoppingItems(rawItems);
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = this.normalizeShoppingItems(null);
    }

    // 查询食材信息确定区域
    const ingredient = await db('ingredients')
      .where('name', item_name)
      .first();

    const storageArea = this.normalizeArea(area || this.inferCategoryByIngredient(ingredient, item_name));
    const estimatedPrice = ingredient?.average_price || 0;

    // 检查是否已存在
    const existingItem = items[storageArea]?.find((i: any) => i.name === item_name);

    if (existingItem) {
      throw new Error('该项目已存在');
    }

    // 添加新项
    if (!items[storageArea]) {
      items[storageArea] = [];
    }

    items[storageArea].push({
      name: item_name,
      amount: amount,
      note: '',
      recipes: ['手动添加'],
      checked: false,
      assignee: null,
      status: 'todo',
      category: storageArea,
      ingredient_id: ingredient?.id,
      estimated_price: estimatedPrice,
      source: 'manual',
      source_date: list.list_date,
      source_meal_type: null,
      source_recipe_id: null,
      servings: null,
    });

    // 重新计算总价
    let totalCost = 0;
    for (const a in items) {
      for (const item of items[a]) {
        if (!item.checked) {
          totalCost += item.estimated_price || 0;
        }
      }
    }

    // 更新
    const [updated] = await db('shopping_lists')
      .where('id', list_id)
      .update({
        items: JSON.stringify(items),
        total_estimated_cost: totalCost,
      })
      .returning('*');

    // 计算统计信息
    const totalItems = Object.values(items).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );
    const uncheckedItems = Object.values(items).reduce(
      (sum: number, items: any) =>
        sum + items.filter((i: any) => !i.checked).length,
      0
    );

    return {
      ...updated,
      items: items,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
    };
  }

  /**
   * 全选/取消全选
   */
  async toggleAllItems(data: {
    list_id: string;
    user_id: string;
    checked: boolean;
  }) {
    const { list_id, user_id, checked } = data;

    const list = await this.shareService.getAccessibleListOrThrow(list_id, user_id);
    const canWrite = await this.shareService.canWriteList(list_id, user_id);
    if (!canWrite) {
      throw new Error('无权限修改该购物清单');
    }

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      const rawItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
      items = this.normalizeShoppingItems(rawItems);
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = this.normalizeShoppingItems(null);
    }

    // 更新所有项的勾选状态
    for (const area in items) {
      for (const item of items[area]) {
        item.checked = checked;
      }
    }

    // 重新计算总价
    let totalCost = 0;
    for (const area in items) {
      for (const item of items[area]) {
        if (!item.checked) {
          totalCost += item.estimated_price || 0;
        }
      }
    }

    // 更新
    const [updated] = await db('shopping_lists')
      .where('id', list_id)
      .update({
        items: JSON.stringify(items),
        total_estimated_cost: totalCost,
      })
      .returning('*');

    // 计算统计信息
    const totalItems = Object.values(items).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );
    const uncheckedItems = Object.values(items).reduce(
      (sum: number, items: any) =>
        sum + items.filter((i: any) => !i.checked).length,
      0
    );

    return {
      ...updated,
      items: items,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
    };
  }

  // ========== 转发到生成服务的方法 ==========

  /**
   * 生成购物清单（从餐食计划）
   */
  async generateShoppingList(data: {
    user_id: string;
    date: string;
    meal_types: string[];
    servings: number;
    merge?: boolean;
  }) {
    return this.generationService.generateShoppingList(data);
  }

  /**
   * 将菜谱添加到购物清单
   */
  async addRecipeToShoppingList(data: {
    user_id: string;
    recipe_id: string;
    list_date?: string;
    servings?: number;
  }) {
    return this.generationService.addRecipeToShoppingList(data);
  }

  // ========== 转发到共享服务的方法 ==========

  /**
   * 创建分享链接
   */
  async createShareLink(listId: string, ownerId: string) {
    return this.shareService.createShareLink(listId, ownerId);
  }

  /**
   * 重新生成分享邀请码
   */
  async regenerateShareInvite(listId: string, ownerId: string) {
    return this.shareService.regenerateShareInvite(listId, ownerId);
  }

  /**
   * 移除分享成员
   */
  async removeShareMember(listId: string, ownerId: string, targetMemberId: string) {
    return this.shareService.removeShareMember(listId, ownerId, targetMemberId);
  }

  /**
   * 通过邀请码加入
   */
  async joinByInviteCode(inviteCode: string, userId: string) {
    return this.shareService.joinByInviteCode(inviteCode, userId);
  }

  // ========== 私有辅助方法 ==========

  /**
   * 根据食材推断分类
   */
  private inferCategoryByIngredient(ingredient: any, ingredientName?: string): string {
    const name = (ingredientName || ingredient?.name || '').toLowerCase();
    const category = (ingredient?.category || '').toLowerCase();
    const storageArea = (ingredient?.storage_area || '').toLowerCase();

    if (storageArea.includes('蔬果') || /菜|瓜|果|葱|姜|蒜|椒|茄|豆苗|土豆|红薯|玉米|番茄/.test(name)) return 'produce';
    if (storageArea.includes('调料') || /油|盐|酱|醋|糖|料酒|胡椒|孜然|蚝油|芝麻酱/.test(name)) return 'seasoning';
    if (/肉|鸡|鸭|鱼|虾|牛|猪|蛋|豆腐|豆干|丸/.test(name) || /肉|蛋|豆|海鲜/.test(category)) return 'protein';
    if (/米|面|粉|馒头|面包|饺子|馄饨|挂面|燕麦/.test(name) || /主食/.test(category)) return 'staple';
    if (/奶|酸奶|芝士|黄油|零食|饼干|薯片|坚果|巧克力/.test(name)) return 'snack_dairy';
    if (/纸|洗洁精|清洁|保鲜膜|垃圾袋|湿巾|手套|牙膏/.test(name)) return 'household';

    return this.normalizeArea(storageArea || category || 'other');
  }
}
