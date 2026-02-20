import { db } from '../config/database';
import { logger } from '../utils/logger';

export class ShoppingListService {
  // 生成购物清单
  async generateShoppingList(data: {
    user_id: string;
    date: string;
    meal_types: string[];
    servings: number;
  }) {
    const { user_id, date, meal_types, servings } = data;

    // 获取指定日期的餐食计划
    const mealPlans = await db('meal_plans')
      .join('recipes', 'meal_plans.recipe_id', 'recipes.id')
      .where('meal_plans.user_id', user_id)
      .where('meal_plans.plan_date', date)
      .whereIn('meal_plans.meal_type', meal_types)
      .select('recipes.*');

    if (mealPlans.length === 0) {
      throw new Error('该日期没有餐食计划');
    }

    // 提取所有食材并标记来源
    const recipeIngredientMaps: Map<string, any>[] = [];

    for (const recipe of mealPlans) {
      // 解析 JSON 字符串
      const adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;
      const babyVersion = typeof recipe.baby_version === 'string'
        ? JSON.parse(recipe.baby_version)
        : recipe.baby_version;

      // 判断是否为配对菜谱
      const isPaired = recipe.name && recipe.name.includes('/');

      const adultIngredients = new Map<string, any>();
      const babyIngredients = new Map<string, any>();

      // 处理大人版食材
      if (adultVersion?.ingredients) {
        for (const ing of adultVersion.ingredients) {
          this.addIngredientWithSource(adultIngredients, ing, recipe.name, 'adult', servings);
        }
      }

      // 处理宝宝版食材
      if (babyVersion?.ingredients) {
        for (const ing of babyVersion.ingredients) {
          this.addIngredientWithSource(babyIngredients, ing, recipe.name, 'baby', servings);
        }
      }

      // 合并两版食材
      const mergedMap = new Map<string, any>();

      // 先添加大人版食材
      for (const [name, data] of adultIngredients) {
        mergedMap.set(name, { ...data, source: 'adult' });
      }

      // 再处理宝宝版食材
      for (const [name, data] of babyIngredients) {
        if (mergedMap.has(name)) {
          // 共用食材
          const existing = mergedMap.get(name);
          existing.source = 'both';
          existing.amount_adult = existing.amount;
          existing.amount_baby = data.amount;
          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name);
          }
          // 如果数量不同，显示合并后的数量
          if (existing.amount !== data.amount) {
            existing.amount = `大人${existing.amount_adult}/宝宝${data.amount}`;
          }
        } else {
          // 宝宝版独有
          mergedMap.set(name, { ...data, source: 'baby' });
        }
      }

      recipeIngredientMaps.push(mergedMap);
    }

    // 合并所有菜谱的食材
    const finalIngredientMap = new Map<string, any>();
    for (const map of recipeIngredientMaps) {
      for (const [name, data] of map) {
        if (finalIngredientMap.has(name)) {
          // 已存在，合并菜谱列表
          const existing = finalIngredientMap.get(name);
          for (const recipeName of data.recipes) {
            if (!existing.recipes.includes(recipeName)) {
              existing.recipes.push(recipeName);
            }
          }
          // 更新来源标记（如果变为共用）
          if (existing.source !== data.source) {
            existing.source = 'both';
          }
        } else {
          // 新食材
          finalIngredientMap.set(name, { ...data });
        }
      }
    }

    // 按区域分组
    const groupedItems = await this.groupByStorageArea(finalIngredientMap);

    // 计算总价
    let totalCost = 0;
    for (const area in groupedItems) {
      for (const item of groupedItems[area]) {
        if (!item.checked) {
          totalCost += item.estimated_price || 0;
        }
      }
    }

    // 保存购物清单
    const [list] = await db('shopping_lists')
      .insert({
        user_id,
        list_date: date,
        items: groupedItems,
        total_estimated_cost: totalCost,
      })
      .returning('*');

    return {
      ...list,
      total_items: Object.values(groupedItems).reduce(
        (sum: number, items: any) => sum + items.length,
        0
      ),
      unchecked_items: Object.values(groupedItems).reduce(
        (sum: number, items: any) =>
          sum + items.filter((i: any) => !i.checked).length,
        0
      ),
    };
  }

  // 添加食材
  private addIngredient(map: Map<string, any>, ingredient: any, recipeName: string, servings: number = 2) {
    const key = ingredient.name;

    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.recipes.includes(recipeName)) {
        existing.recipes.push(recipeName);
      }
    } else {
      // 根据 servings 调整食材数量
      const adjustedAmount = this.adjustAmountByServings(ingredient.amount, servings);
      map.set(key, {
        name: key,
        amount: adjustedAmount,
        note: ingredient.note,
        recipes: [recipeName],
        checked: false,
      });
    }
  }

  // 按存储区域分组
  private async groupByStorageArea(ingredientMap: Map<string, any>) {
    const grouped: Record<string, any[]> = {
      超市区: [],
      蔬果区: [],
      调料区: [],
      其他: [],
    };

    // 存储区域映射：数据库中的区域名 -> 前端使用的键名
    const areaMapping: Record<string, string> = {
      '超市区': '超市区',  // 数据库 "超市区" -> 前端 "超市区"
      '蔬果区': '蔬果区',  // 数据库 "蔬果区" -> 前端 "蔬果区"
      '调料区': '调料区',  // 数据库 "调料区" -> 前端 "调料区"
      '其他': '其他',
    };

    for (const [name, data] of ingredientMap) {
      // 查询食材的存储区域
      const ingredient = await db('ingredients')
        .where('name', name)
        .first();

      const dbArea = ingredient?.storage_area || '其他';
      const area = areaMapping[dbArea] || '其他';  // 使用映射后的区域名
      const estimatedPrice = ingredient?.average_price || 0;

      if (!grouped[area]) {
        grouped[area] = [];
      }

      grouped[area].push({
        ...data,
        ingredient_id: ingredient?.id,
        estimated_price: estimatedPrice,
      });
    }

    return grouped;
  }

  // 获取历史购物清单
  async getShoppingLists(userId: string, startDate?: string, endDate?: string) {
    let query = db('shopping_lists').where('user_id', userId);

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
      items: items.map((list: any) => {
        // 解析 JSON 字符串，使用安全解析避免corrupted data导致的崩溃
        let parsedItems;
        try {
          parsedItems = typeof list.items === 'string'
            ? JSON.parse(list.items)
            : list.items;
        } catch (e) {
          // 如果解析失败，返回空结构
          logger.error('[Backend] Failed to parse items for list:', list.id, e);
          parsedItems = {
            超市区: [],
            蔬果区: [],
            调料区: [],
            其他: [],
          };
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
        return {
          ...list,
          items: parsedItems,
          total_items: totalItems,
          unchecked_items: uncheckedItems,
        };
      }),
    };
  }

  // 获取单个购物清单详情
  async getShoppingListById(listId: string, userId: string) {
    const list = await db('shopping_lists')
      .where('id', listId)
      .where('user_id', userId)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    // 解析 JSON 字符串，使用安全解析避免corrupted data导致的崩溃
    let parsedItems;
    try {
      parsedItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
    } catch (e) {
      // 如果解析失败，返回空结构
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      parsedItems = {
        超市区: [],
        蔬果区: [],
        调料区: [],
        其他: [],
      };
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

    return {
      ...list,
      items: parsedItems,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
    };
  }

  // 更新购物清单项状态
  async updateListItem(data: {
    list_id: string;
    user_id: string;
    area: string;
    ingredient_id: string;
    checked: boolean;
  }) {
    const { list_id, user_id, area, ingredient_id, checked } = data;

    logger.debug('[Backend] updateListItem called:', { list_id, user_id, area, ingredient_id, checked });

    const list = await db('shopping_lists')
      .where('id', list_id)
      .where('user_id', user_id)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    // Parse items from JSON string to object
    const items = typeof list.items === 'string'
      ? JSON.parse(list.items)
      : list.items;

    logger.debug('[Backend] Items before update:', JSON.stringify(items, null, 2));

    if (items[area]) {
      // 首先尝试通过 ingredient_id 查找
      let item = items[area].find(
        (i) => i.ingredient_id === ingredient_id
      );
      logger.debug('[Backend] Found by ingredient_id:', item);

      // 如果没找到，尝试通过 name 查找（处理手动添加的项）
      if (!item) {
        item = items[area].find(
          (i) => i.name === ingredient_id
        );
        logger.debug('[Backend] Found by name:', item);
      }

      if (item) {
        const oldChecked = item.checked;
        item.checked = checked;
        logger.debug('[Backend] Updated item:', { ingredient_id, oldChecked, newChecked: checked });
      } else {
        logger.debug('[Backend] ERROR: Item not found!');
      }
    } else {
      logger.debug('[Backend] ERROR: Area not found in items:', area);
    }

    logger.debug('[Backend] Items after update:', JSON.stringify(items, null, 2));

    const [updated] = await db('shopping_lists')
      .where('id', list_id)
      .update({ items: JSON.stringify(items) })
      .returning('*');

    logger.debug('[Backend] Updated from DB:', updated);

    // 解析 items 字段从 JSON 字符串转换为对象
    if (updated && typeof updated.items === 'string') {
      updated.items = JSON.parse(updated.items);
    }

    logger.debug('[Backend] Final result:', updated);
    return updated;
  }

  // 标记清单为完成，并将已勾选食材自动入库
  async markComplete(listId: string, userId: string) {
    const list = await db('shopping_lists')
      .where('id', listId)
      .where('user_id', userId)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    // 解析清单项
    let items;
    try {
      items = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
    } catch {
      items = {};
    }

    // 将已勾选食材添加到库存
    for (const area in items) {
      for (const item of items[area]) {
        if (item.checked) {
          try {
            // 检查是否已存在
            const existing = await db('ingredient_inventory')
              .where('user_id', userId)
              .where('ingredient_name', item.name)
              .first();

            if (!existing) {
              // 查询食材的默认保质期
              const ingredient = await db('ingredients')
                .where('name', item.name)
                .first();

              const shelfLifeDays = ingredient?.shelf_life || 7;
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

              await db('ingredient_inventory').insert({
                user_id: userId,
                ingredient_name: item.name,
                quantity: 1,
                unit: '份',
                location: ingredient?.storage_area === '冷藏' ? '冷藏' : '常温',
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: expiryDate.toISOString().split('T')[0],
              });
            }
          } catch (err) {
            // 忽略单个食材入库失败，继续处理其余
            logger.error('Failed to auto-stock ingredient', { name: item.name, error: err });
          }
        }
      }
    }

    await db('shopping_lists')
      .where('id', listId)
      .where('user_id', userId)
      .update({ is_completed: true });
  }

  // 将单个菜谱加入购物清单
  async addRecipeToShoppingList(data: {
    user_id: string;
    recipe_id: string;
    list_date?: string;
    servings?: number;
  }) {
    const { user_id, recipe_id, list_date, servings = 2 } = data;
    const date = list_date || new Date().toISOString().split('T')[0];

    logger.debug('[Backend Service] addRecipeToShoppingList called:', { user_id, recipe_id, date, servings });

    // 获取菜谱信息
    const recipe = await db('recipes')
      .where('id', recipe_id)
      .where('is_active', true)
      .first();

    if (!recipe) {
      logger.error('[Backend Service] Recipe not found:', recipe_id);
      throw new Error('菜谱不存在');
    }

    logger.debug('[Backend Service] Recipe found:', recipe.name);

    // 获取或创建今日购物清单（排除已完成的，按创建时间倒序取最新）
    let list = await db('shopping_lists')
      .where('user_id', user_id)
      .where('list_date', date)
      .where('is_completed', false)
      .orderBy('created_at', 'desc')
      .first();

    logger.debug('[Backend Service] Found existing list:', list?.id || 'none');

    // 如果清单不存在，创建新清单
    if (!list) {
      logger.debug('[Backend Service] Creating new shopping list for date:', date);
      [list] = await db('shopping_lists')
        .insert({
          user_id,
          list_date: date,
          items: JSON.stringify({ 超市区: [], 蔬果区: [], 调料区: [], 其他: [] }),
          total_estimated_cost: 0,
        })
        .returning('*');
      logger.debug('[Backend Service] Created new list:', list.id);
    }

    // 解析现有清单项，使用安全解析避免corrupted data导致的崩溃
    let existingItems;
    try {
      existingItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      existingItems = {
        超市区: [],
        蔬果区: [],
        调料区: [],
        其他: [],
      };
    }

    // 解析菜谱的 JSON 字段
    const adultVersion = typeof recipe.adult_version === 'string'
      ? JSON.parse(recipe.adult_version)
      : recipe.adult_version;
    const babyVersion = typeof recipe.baby_version === 'string'
      ? JSON.parse(recipe.baby_version)
      : recipe.baby_version;

    // 判断是否为配对菜谱
    const isPaired = recipe.name && recipe.name.includes('/');

    // 提取食材并标记来源（大人版/宝宝版/共用）
    const adultIngredients = new Map<string, any>();
    const babyIngredients = new Map<string, any>();

    logger.debug('[Backend Service] Adult ingredients:', adultVersion?.ingredients?.length || 0);
    logger.debug('[Backend Service] Baby ingredients:', babyVersion?.ingredients?.length || 0);
    logger.debug('[Backend Service] Is paired recipe:', isPaired);

    // 处理大人版食材
    if (adultVersion?.ingredients) {
      for (const ing of adultVersion.ingredients) {
        this.addIngredientWithSource(adultIngredients, ing, recipe.name, 'adult', servings);
      }
    }

    // 处理宝宝版食材（如果有）
    if (babyVersion?.ingredients) {
      for (const ing of babyVersion.ingredients) {
        this.addIngredientWithSource(babyIngredients, ing, recipe.name, 'baby', servings);
      }
    }

    // 合并两版食材，标记共用食材
    const ingredientMap = new Map<string, any>();

    // 先添加大人版食材
    for (const [name, data] of adultIngredients) {
      ingredientMap.set(name, { ...data, source: 'adult' });
    }

    // 再处理宝宝版食材
    for (const [name, data] of babyIngredients) {
      if (ingredientMap.has(name)) {
        // 共用食材：两个版本都有
        const existing = ingredientMap.get(name);
        existing.source = 'both';
        existing.amount_adult = existing.amount;
        existing.amount_baby = data.amount;
        // 合并菜谱列表
        if (!existing.recipes.includes(recipe.name)) {
          existing.recipes.push(recipe.name);
        }
        // 如果数量不同，显示合并后的数量
        if (existing.amount !== data.amount) {
          existing.amount = `大人${existing.amount_adult}/宝宝${data.amount}`;
        }
      } else {
        // 宝宝版独有
        ingredientMap.set(name, { ...data, source: 'baby' });
      }
    }

    logger.debug('[Backend Service] Total unique ingredients:', ingredientMap.size);
    logger.debug('[Backend Service] Ingredient names:', Array.from(ingredientMap.keys()));

    // 合并到现有清单
    for (const [name, data] of ingredientMap) {
      // 查询存储区域
      const ingredient = await db('ingredients')
        .where('name', name)
        .first();

      const area = ingredient?.storage_area || '其他';
      const estimatedPrice = ingredient?.average_price || 0;

      // 检查是否已存在
      const existingItem = existingItems[area]?.find((i: any) => i.name === name);

      if (existingItem) {
        // 已存在，更新菜谱列表和来源标记
        if (!existingItem.recipes.includes(recipe.name)) {
          existingItem.recipes.push(recipe.name);
        }
        // 更新来源标记（如果变为共用）
        if (existingItem.source !== data.source) {
          existingItem.source = 'both';
        }
      } else {
        // 不存在，添加新项
        if (!existingItems[area]) {
          existingItems[area] = [];
        }
        existingItems[area].push({
          ...data,
          ingredient_id: ingredient?.id,
          estimated_price: estimatedPrice,
        });
      }
    }

    // 重新计算总价
    let totalCost = 0;
    for (const area in existingItems) {
      for (const item of existingItems[area]) {
        if (!item.checked) {
          totalCost += item.estimated_price || 0;
        }
      }
    }

    logger.debug('[Backend Service] Updating shopping list, totalCost:', totalCost);

    // 更新购物清单
    const [updated] = await db('shopping_lists')
      .where('id', list.id)
      .update({
        items: JSON.stringify(existingItems),
        total_estimated_cost: totalCost,
      })
      .returning('*');

    logger.debug('[Backend Service] Shopping list updated, id:', updated?.id);

    // 计算统计信息
    const totalItems = Object.values(existingItems).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );
    const uncheckedItems = Object.values(existingItems).reduce(
      (sum: number, items: any) =>
        sum + items.filter((i: any) => !i.checked).length,
      0
    );

    const result = {
      ...updated,
      items: existingItems,
      total_items: totalItems,
      unchecked_items: uncheckedItems,
    };

    logger.debug('[Backend Service] Returning result:', { totalItems, uncheckedItems });
    return result;
  }

  // 辅助方法：添加食材到映射（带来源标记）
  private addIngredientWithSource(
    map: Map<string, any>,
    ingredient: any,
    recipeName: string,
    source: 'adult' | 'baby',
    servings: number = 2
  ) {
    const key = ingredient.name;

    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.recipes.includes(recipeName)) {
        existing.recipes.push(recipeName);
      }
    } else {
      // 根据 servings 调整食材数量
      const adjustedAmount = this.adjustAmountByServings(ingredient.amount, servings);
      map.set(key, {
        name: key,
        amount: adjustedAmount,
        note: ingredient.note,
        recipes: [recipeName],
        checked: false,
        source, // 'adult' 或 'baby'
      });
    }
  }

  // 辅助方法：添加食材到映射（向后兼容）
  private addIngredientToMap(map: Map<string, any>, ingredient: any, recipeName: string, servings: number = 2) {
    this.addIngredientWithSource(map, ingredient, recipeName, 'adult', servings);
  }

  // 根据份数调整食材数量
  private adjustAmountByServings(amount: string, servings: number): string {
    if (!amount || servings === 2) return amount;

    // 尝试解析数字部分
    const match = amount.match(/^([\d.]+)(.*)$/);
    if (!match) return amount;

    const originalValue = parseFloat(match[1]);
    const unit = match[2].trim();

    if (isNaN(originalValue)) return amount;

    // 默认份数是2，按比例调整
    const adjustedValue = (originalValue * servings) / 2;

    // 格式化：如果是整数则显示整数，否则保留最多2位小数
    const formattedValue = Number.isInteger(adjustedValue)
      ? adjustedValue
      : parseFloat(adjustedValue.toFixed(2));

    return unit ? `${formattedValue}${unit}` : `${formattedValue}`;
  }

  // 删除购物清单项
  async removeListItem(data: {
    list_id: string;
    user_id: string;
    area: string;
    item_name: string;
  }) {
    const { list_id, user_id, area, item_name } = data;

    logger.debug('[Backend] removeListItem called:', { list_id, user_id, area, item_name });

    const list = await db('shopping_lists')
      .where('id', list_id)
      .where('user_id', user_id)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    logger.debug('[Backend] Items before delete:', JSON.stringify(list.items, null, 2).substring(0, 200));

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      items = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = {
        超市区: [],
        蔬果区: [],
        调料区: [],
        其他: [],
      };
    }

    // 确保所有区域都存在
    const defaultAreas = ['超市区', '蔬果区', '调料区', '其他'];
    for (const defaultArea of defaultAreas) {
      if (!items[defaultArea]) {
        items[defaultArea] = [];
      }
    }

    if (!items[area]) {
      throw new Error(`区域不存在: ${area}`);
    }

    if (!Array.isArray(items[area])) {
      throw new Error(`区域不是数组: ${area}, type: ${typeof items[area]}`);
    }

    logger.debug('[Backend] Area items before delete:', items[area].map(i => i.name));

    // 删除指定项
    const originalLength = items[area].length;
    items[area] = items[area].filter((i: any) => i.name !== item_name);

    if (items[area].length === originalLength) {
      logger.error('[Backend] Item not found:', item_name, 'in area:', area);
      throw new Error('项目不存在');
    }

    logger.debug('[Backend] Area items after delete:', items[area].map(i => i.name));

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

  // 手动添加购物清单项
  async addListItem(data: {
    list_id: string;
    user_id: string;
    item_name: string;
    amount: string;
    area?: string;
  }) {
    const { list_id, user_id, item_name, amount, area } = data;

    const list = await db('shopping_lists')
      .where('id', list_id)
      .where('user_id', user_id)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      items = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = {
        超市区: [],
        蔬果区: [],
        调料区: [],
        其他: [],
      };
    }

    // 查询食材信息确定区域
    const ingredient = await db('ingredients')
      .where('name', item_name)
      .first();

    const storageArea = area || ingredient?.storage_area || '其他';
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
      ingredient_id: ingredient?.id,
      estimated_price: estimatedPrice,
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

  // 全选/取消全选
  async toggleAllItems(data: {
    list_id: string;
    user_id: string;
    checked: boolean;
  }) {
    const { list_id, user_id, checked } = data;

    const list = await db('shopping_lists')
      .where('id', list_id)
      .where('user_id', user_id)
      .first();

    if (!list) {
      throw new Error('购物清单不存在');
    }

    // 解析清单项，使用安全解析避免corrupted data导致的崩溃
    let items;
    try {
      items = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      items = {
        超市区: [],
        蔬果区: [],
        调料区: [],
        其他: [],
      };
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
}
