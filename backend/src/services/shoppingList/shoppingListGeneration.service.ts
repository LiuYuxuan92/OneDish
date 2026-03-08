import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { familyService } from '../family.service';

export class ShoppingListGenerationService {
  /**
   * 根据餐食计划生成购物清单
   */
  async generateShoppingList(data: {
    user_id: string;
    date: string;
    meal_types: string[];
    servings: number;
    merge?: boolean;
  }) {
    const { user_id, date, meal_types, servings, merge = false } = data;
    const familyId = await familyService.getFamilyIdForUser(user_id);
    const ownerId = await familyService.getOwnerIdForUser(user_id);

    // 获取指定日期的餐食计划
    let mealPlanQuery = db('meal_plans')
      .join('recipes', 'meal_plans.recipe_id', 'recipes.id');

    mealPlanQuery = familyId
      ? mealPlanQuery.where('meal_plans.family_id', familyId)
      : mealPlanQuery.where('meal_plans.user_id', ownerId);

    const mealPlans = await mealPlanQuery
      .where('meal_plans.plan_date', date)
      .whereIn('meal_plans.meal_type', meal_types)
      .select('recipes.*', 'meal_plans.meal_type as plan_meal_type', 'meal_plans.plan_date as source_date', 'meal_plans.recipe_id as plan_recipe_id');

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

      // 处理大人版食材
      const adultIngredients = new Map<string, any>();
      const babyIngredients = new Map<string, any>();

      // 处理大人版食材
      if (adultVersion?.ingredients) {
        for (const ing of adultVersion.ingredients) {
          this.addIngredientWithSource(adultIngredients, ing, recipe, 'adult', servings, {
            source: 'meal_plan',
            source_date: recipe.source_date,
            source_meal_type: recipe.plan_meal_type,
            source_recipe_id: recipe.plan_recipe_id,
          });
        }
      }

      // 处理宝宝版食材
      if (babyVersion?.ingredients) {
        for (const ing of babyVersion.ingredients) {
          this.addIngredientWithSource(babyIngredients, ing, recipe, 'baby', servings, {
            source: 'meal_plan',
            source_date: recipe.source_date,
            source_meal_type: recipe.plan_meal_type,
            source_recipe_id: recipe.plan_recipe_id,
          });
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

    // 如果启用智能合并，合并相同食材并累加数量
    let mergedIngredientMap = finalIngredientMap;
    if (merge) {
      mergedIngredientMap = this.mergeIngredients(finalIngredientMap);
    }

    // 按区域分组
    const groupedItems = await this.groupByStorageArea(mergedIngredientMap);

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
        user_id: ownerId,
        family_id: familyId,
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

  /**
   * 将单个菜谱加入购物清单
   */
  async addRecipeToShoppingList(data: {
    user_id: string;
    recipe_id: string;
    list_date?: string;
    servings?: number;
  }) {
    const { user_id, recipe_id, list_date, servings = 2 } = data;
    const date = list_date || new Date().toISOString().split('T')[0];
    const familyId = await familyService.getFamilyIdForUser(user_id);
    const ownerId = await familyService.getOwnerIdForUser(user_id);

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
    let listQuery = db('shopping_lists')
      .where('list_date', date)
      .where('is_completed', false);

    listQuery = familyId
      ? listQuery.where('family_id', familyId)
      : listQuery.where('user_id', ownerId);

    let list = await listQuery
      .orderBy('created_at', 'desc')
      .first();

    logger.debug('[Backend Service] Found existing list:', list?.id || 'none');

    // 如果清单不存在，创建新清单
    if (!list) {
      logger.debug('[Backend Service] Creating new shopping list for date:', date);
      [list] = await db('shopping_lists')
        .insert({
          user_id: ownerId,
          family_id: familyId,
          list_date: date,
          items: JSON.stringify(ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE),
          total_estimated_cost: 0,
        })
        .returning('*');
      logger.debug('[Backend Service] Created new list:', list.id);
    }

    // 解析现有清单项，使用安全解析避免corrupted data导致的崩溃
    let existingItems;
    try {
      const rawItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : list.items;
      existingItems = this.normalizeShoppingItems(rawItems);
    } catch (e) {
      logger.error('[Backend] Failed to parse items for list:', list.id, e);
      existingItems = this.normalizeShoppingItems(null);
    }

    // 解析菜谱的 JSON 字段
    const adultVersion = typeof recipe.adult_version === 'string'
      ? JSON.parse(recipe.adult_version)
      : recipe.adult_version;
    const babyVersion = typeof recipe.baby_version === 'string'
      ? JSON.parse(recipe.baby_version)
      : recipe.baby_version;

    // 提取食材并标记来源（大人版/宝宝版/共用）
    const adultIngredients = new Map<string, any>();
    const babyIngredients = new Map<string, any>();

    logger.debug('[Backend Service] Adult ingredients:', adultVersion?.ingredients?.length || 0);
    logger.debug('[Backend Service] Baby ingredients:', babyVersion?.ingredients?.length || 0);

    // 处理大人版食材
    if (adultVersion?.ingredients) {
      for (const ing of adultVersion.ingredients) {
        this.addIngredientWithSource(adultIngredients, ing, recipe, 'adult', servings, {
          source: 'recipe',
          source_date: date,
          source_recipe_id: recipe_id,
        });
      }
    }

    // 处理宝宝版食材（如果有）
    if (babyVersion?.ingredients) {
      for (const ing of babyVersion.ingredients) {
        this.addIngredientWithSource(babyIngredients, ing, recipe, 'baby', servings, {
          source: 'recipe',
          source_date: date,
          source_recipe_id: recipe_id,
        });
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
      const ingredient = await db('ingredients')
        .where('name', name)
        .first();

      const category = this.inferCategoryByIngredient(ingredient, name);
      const estimatedPrice = ingredient?.average_price || 0;
      const existingItemIndex = (existingItems[category] || []).findIndex((i: any) => this.canSafelyMergeItems(i, {
        ...data,
        name,
        category,
      }));

      if (existingItemIndex >= 0) {
        const existingItem = existingItems[category][existingItemIndex];
        existingItem.amount = this.combineAmounts(existingItem.amount, data.amount);
        existingItem.recipes = Array.from(new Set([...(existingItem.recipes || []), ...(data.recipes || []), recipe.name]));
        existingItem.is_merged = true;
        existingItem.from_recipes = Array.from(new Set([...(existingItem.from_recipes || existingItem.recipes || []), ...(data.recipes || [])]));
        if (existingItem.source !== data.source) {
          existingItem.source = existingItem.source === 'manual' ? data.source : existingItem.source;
        }
        existingItem.source_recipe_id = existingItem.source_recipe_id || recipe_id;
        existingItem.source_date = existingItem.source_date || date;
        existingItem.servings = existingItem.servings || servings;
      } else {
        if (!existingItems[category]) {
          existingItems[category] = [];
        }
        existingItems[category].push({
          ...data,
          source: 'recipe',
          source_date: date,
          source_meal_type: null,
          source_recipe_id: recipe_id,
          servings,
          category,
          ingredient_id: ingredient?.id,
          estimated_price: estimatedPrice,
          assignee: data.assignee ?? null,
          status: data.status || 'todo',
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

  // ========== 辅助方法 ==========

  private static readonly DEFAULT_ITEMS_STRUCTURE: Record<string, any[]> = {
    produce: [],
    protein: [],
    staple: [],
    seasoning: [],
    snack_dairy: [],
    household: [],
    other: [],
  };

  /**
   * 添加食材到映射（带来源标记）
   */
  private addIngredientWithSource(
    map: Map<string, any>,
    ingredient: any,
    recipe: any,
    source: 'adult' | 'baby',
    servings: number = 2,
    metadata: {
      source?: 'meal_plan' | 'recipe' | 'manual';
      source_date?: string;
      source_meal_type?: string;
      source_recipe_id?: string;
    } = {}
  ) {
    const key = ingredient.name;
    const recipeName = recipe?.name || '';

    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.recipes.includes(recipeName)) {
        existing.recipes.push(recipeName);
      }
    } else {
      const adjustedAmount = this.adjustAmountByServings(ingredient.amount, servings);
      map.set(key, {
        name: key,
        amount: adjustedAmount,
        note: ingredient.note,
        recipes: [recipeName],
        checked: false,
        source,
        list_source: metadata.source || 'recipe',
        source_date: metadata.source_date || null,
        source_meal_type: metadata.source_meal_type || null,
        source_recipe_id: metadata.source_recipe_id || recipe?.id || null,
        servings,
      });
    }
  }

  /**
   * 智能合并相同食材（累加数量）
   * 标准化食材名称后，合并来自不同菜谱的相同食材
   */
  private mergeIngredients(ingredientMap: Map<string, any>): Map<string, any> {
    const mergedMap = new Map<string, any>();

    for (const [name, data] of ingredientMap) {
      // 标准化食材名称：trim + lowercase
      const normalizedName = this.normalizeIngredientName(name);

      if (mergedMap.has(normalizedName)) {
        // 已存在，合并数量和菜谱来源
        const existing = mergedMap.get(normalizedName);

        // 累加数量
        const existingAmount = existing.amount;
        const newAmount = data.amount;
        existing.amount = this.combineAmounts(existingAmount, newAmount);

        // 合并菜谱列表（去重）
        for (const recipeName of data.recipes) {
          if (!existing.recipes.includes(recipeName)) {
            existing.recipes.push(recipeName);
          }
        }

        // 标记为合并来源
        existing.is_merged = true;
        existing.from_recipes = existing.from_recipes || [...existing.recipes];
        for (const recipeName of data.recipes) {
          if (!existing.from_recipes.includes(recipeName)) {
            existing.from_recipes.push(recipeName);
          }
        }

        // 更新来源标记（如果变为共用）
        if (existing.source !== data.source) {
          existing.source = 'both';
        }
      } else {
        // 新食材
        mergedMap.set(normalizedName, {
          ...data,
          name,
          normalized_name: normalizedName,
          is_merged: false,
          from_recipes: [...data.recipes],
        });
      }
    }

    return mergedMap;
  }

  /**
   * 标准化食材名称
   */
  private normalizeIngredientName(name: string): string {
    return name.trim().toLowerCase();
  }

  private canSafelyMergeItems(existing: any, incoming: any): boolean {
    if (!existing || !incoming) return false;
    if (this.normalizeIngredientName(existing.name || '') !== this.normalizeIngredientName(incoming.name || '')) return false;
    if (this.normalizeArea(existing.category || 'other') !== this.normalizeArea(incoming.category || 'other')) return false;

    const parsedExisting = this.parseAmount(existing.amount || '');
    const parsedIncoming = this.parseAmount(incoming.amount || '');

    if (parsedExisting.unit && parsedIncoming.unit) {
      return parsedExisting.unit === parsedIncoming.unit || this.canConvertUnit(parsedExisting.unit, parsedIncoming.unit);
    }

    return parsedExisting.unit === parsedIncoming.unit;
  }

  /**
   * 合并两个食材数量
   * 例如: "200g" + "300g" = "500g"
   */
  private combineAmounts(amount1: string, amount2: string): string {
    // 解析两个数量的数值和单位
    const parsed1 = this.parseAmount(amount1);
    const parsed2 = this.parseAmount(amount2);

    // 如果无法解析，返回原值
    if (!parsed1.value && !parsed2.value) {
      return amount1;
    }

    // 如果单位相同或可以转换，累加数值
    if (parsed1.unit === parsed2.unit || this.canConvertUnit(parsed1.unit, parsed2.unit)) {
      const converted2 = this.convertUnit(parsed2.value, parsed2.unit, parsed1.unit);
      const totalValue = (parsed1.value || 0) + converted2;
      return `${totalValue}${parsed1.unit}`;
    }

    // 单位不同，尝试找到共同单位或显示两个值
    // 对于不同单位，返回两个值用逗号分隔
    if (parsed1.value && parsed2.value) {
      return `${parsed1.value}${parsed1.unit}, ${parsed2.value}${parsed2.unit}`;
    }

    // 只有一个有值
    return parsed1.value ? `${parsed1.value}${parsed1.unit}` : `${parsed2.value}${parsed2.unit}`;
  }

  /**
   * 解析食材数量字符串
   */
  private parseAmount(amount: string): { value: number; unit: string } {
    if (!amount) {
      return { value: 0, unit: '' };
    }

    // 匹配数字和单位
    const match = amount.match(/^([\d.]+)\s*(.*)$/);
    if (!match) {
      return { value: 0, unit: '' };
    }

    const value = parseFloat(match[1]);
    const unit = (match[2] || '').trim();

    return { value: isNaN(value) ? 0 : value, unit };
  }

  /**
   * 检查单位是否可以转换
   */
  private canConvertUnit(unit1: string, unit2: string): boolean {
    // 质量单位
    const weightUnits = ['g', '克', 'kg', '千克', '斤', '两'];
    // 体积单位
    const volumeUnits = ['ml', '毫升', 'l', '升', '杯', '勺', '汤匙', '茶匙'];
    // 计数单位
    const countUnits = ['个', '只', '枚', '片', '块', '根', '把'];

    const normalizeUnit = (u: string) => {
      const unitMap: Record<string, string> = {
        '克': 'g', '千克': 'kg', '斤': 'jin', '两': 'liang',
        '毫升': 'ml', '升': 'l',
        '汤匙': 'tbsp', '茶匙': 'tsp', '杯': 'cup',
      };
      return unitMap[u] || u;
    };

    const n1 = normalizeUnit(unit1);
    const n2 = normalizeUnit(unit2);

    // 同类单位可以转换
    if (weightUnits.includes(n1) && weightUnits.includes(n2)) return true;
    if (volumeUnits.includes(n1) && volumeUnits.includes(n2)) return true;
    if (countUnits.includes(n1) && countUnits.includes(n2)) return true;

    return false;
  }

  /**
   * 单位转换
   */
  private convertUnit(value: number, fromUnit: string, toUnit: string): number {
    const normalizeUnit = (u: string) => {
      const unitMap: Record<string, string> = {
        '克': 'g', '千克': 'kg', '斤': 'jin', '两': 'liang',
        '毫升': 'ml', '升': 'l',
        '汤匙': 'tbsp', '茶匙': 'tsp', '杯': 'cup',
      };
      return unitMap[u] || u;
    };

    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);

    // 质量转换 (以g为基准)
    const weightToG: Record<string, number> = {
      'g': 1, 'kg': 1000, 'jin': 500, 'liang': 50,
    };

    // 体积转换 (以ml为基准)
    const volumeToMl: Record<string, number> = {
      'ml': 1, 'l': 1000, 'tbsp': 15, 'tsp': 5, 'cup': 240,
    };

    // 质量单位转换
    if (weightToG[from] && weightToG[to]) {
      return (value * weightToG[from]) / weightToG[to];
    }

    // 体积单位转换
    if (volumeToMl[from] && volumeToMl[to]) {
      return (value * volumeToMl[from]) / volumeToMl[to];
    }

    // 无法转换，返回原值
    return value;
  }

  /**
   * 根据份数调整食材数量
   */
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

  /**
   * 按存储区域分组
   */
  private async groupByStorageArea(ingredientMap: Map<string, any>) {
    const grouped: Record<string, any[]> = this.normalizeShoppingItems(null);

    for (const [name, data] of ingredientMap) {
      // 查询食材的存储区域
      const ingredient = await db('ingredients')
        .where('name', name)
        .first();

      const category = this.inferCategoryByIngredient(ingredient, name);
      const estimatedPrice = ingredient?.average_price || 0;

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push({
        ...data,
        source: data.list_source || data.source || 'recipe',
        category,
        ingredient_id: ingredient?.id,
        estimated_price: estimatedPrice,
      });
    }

    return grouped;
  }

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

  /**
   * 规范化区域名称
   */
  private normalizeArea(area?: string): string {
    const key = (area || '').trim().toLowerCase();

    const areaAliasMap: Record<string, string> = {
      produce: 'produce',
      protein: 'protein',
      staple: 'staple',
      seasoning: 'seasoning',
      snack_dairy: 'snack_dairy',
      snackdairy: 'snack_dairy',
      household: 'household',
      other: 'other',
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
  normalizeShoppingItems(items: any): Record<string, any[]> {
    const normalized: Record<string, any[]> = {
      produce: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.produce],
      protein: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.protein],
      staple: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.staple],
      seasoning: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.seasoning],
      snack_dairy: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.snack_dairy],
      household: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.household],
      other: [...ShoppingListGenerationService.DEFAULT_ITEMS_STRUCTURE.other],
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
}
