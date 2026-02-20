import { db } from '../config/database';
import { isIngredientSuitable } from '../utils/recipe-pairing-engine';

// 菜谱池接口 - 用于存储每个餐别的可用菜谱
interface RecipePool {
  breakfast: any[];
  lunch: any[];
  dinner: any[];
}

// 菜谱项接口
interface RecipeItem {
  id: string;
  name: string;
  image_url: string;
  prep_time: number;
  type: string;
}

export class MealPlanService {
  // 缓存的菜谱池（5分钟更新一次）
  private recipePoolCache: RecipePool | null = null;
  private poolCacheTime: number = 0;
  private readonly POOL_CACHE_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 获取一周计划
   */
  async getWeeklyPlan(userId: string, startDate?: string, endDate?: string) {
    const start = startDate || this.getMonday(new Date());
    const end = endDate || this.getSunday(new Date());

    const plans = await db('meal_plans')
      .join('recipes', 'meal_plans.recipe_id', 'recipes.id')
      .where('meal_plans.user_id', userId)
      .whereBetween('meal_plans.plan_date', [start, end])
      .select(
        'meal_plans.plan_date',
        'meal_plans.meal_type',
        'recipes.id',
        'recipes.name',
        'recipes.image_url',
        'recipes.prep_time'
      )
      .orderBy('meal_plans.plan_date')
      .orderBy('meal_plans.meal_type');

    // 组织数据 - 前端期望格式: { [date]: { [meal_type]: MealPlan } }
    const result: Record<string, any> = {};

    for (const plan of plans) {
      // SQLite 返回的日期可能是字符串，需要处理
      const date = typeof plan.plan_date === 'string'
        ? plan.plan_date.split('T')[0]
        : plan.plan_date.toISOString().split('T')[0];

      if (!result[date]) {
        result[date] = {};
      }

      result[date][plan.meal_type] = {
        id: plan.id,
        name: plan.name,
        image_url: plan.image_url,
        prep_time: plan.prep_time,
      };
    }

    return {
      start_date: start,
      end_date: end,
      plans: result,
    };
  }

  /**
   * 设置餐食计划
   */
  async setMealPlan(data: {
    user_id: string;
    plan_date: string;
    meal_type: string;
    recipe_id: string;
    servings: number;
  }) {
    const { user_id, plan_date, meal_type, recipe_id, servings } = data;

    const [plan] = await db('meal_plans')
      .insert({
        user_id,
        plan_date,
        meal_type,
        recipe_id,
        servings,
      })
      .onConflict(['user_id', 'plan_date', 'meal_type'])
      .merge()
      .returning('*');

    return plan;
  }

  /**
   * 删除餐食计划
   */
  async deleteMealPlan(userId: string, planId: string) {
    await db('meal_plans')
      .where('id', planId)
      .where('user_id', userId)
      .delete();
  }

  /**
   * 生成一周智能计划（重构版）
   * 特性：
   * 1. 使用菜谱池确保高效随机选择
   * 2. 防重复：新菜谱与当前菜谱不同
   * 3. 每餐独立随机，互不影响
   * 4. 尽量避免同一天内菜谱重复
   */
  async generateWeeklyPlan(userId: string, startDate: string, preferences?: any) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const maxPrepTime = preferences?.max_prep_time || 30;
    const babyAgeMonths = preferences?.baby_age_months || null;
    const excludeIngredients: string[] = preferences?.exclude_ingredients || [];

    // 1. 获取当前用户的现有计划（用于防重复）
    const existingPlans = await this.getExistingPlans(userId, start, end);

    // 2. 获取菜谱池（带缓存）
    const recipePool = await this.getRecipePool(maxPrepTime);

    // 3. 如有宝宝月龄，过滤不适宜菜谱
    if (babyAgeMonths) {
      for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
        recipePool[mealType] = recipePool[mealType].filter(recipe => {
          return this.scoreRecipeForBaby(recipe, babyAgeMonths, excludeIngredients) >= 0;
        });
      }
    }

    // 4. 为7天生成计划，跟踪营养均衡
    const plans: Record<string, any> = {};
    const usedRecipeIds = new Set<string>();
    const nutritionTracker = { protein: 0, vegetable: 0, grain: 0, seafood: 0 };

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      plans[dateStr] = {};

      const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];

      for (const mealType of mealTypes) {
        const currentRecipeId = existingPlans[dateStr]?.[mealType];

        // 优先选择食材复用度高的菜谱
        let pool = recipePool[mealType];
        if (i > 0) {
          pool = this.sortByIngredientOverlap(pool, plans, dateStr);
        }

        const recipe = this.selectRandomRecipe(pool, currentRecipeId, usedRecipeIds);

        if (recipe) {
          const isBabySuitable = babyAgeMonths
            ? this.scoreRecipeForBaby(recipe, babyAgeMonths, excludeIngredients) > 0
            : false;

          const nutritionScore = this.calculateNutritionBalance(recipe, nutritionTracker);

          plans[dateStr][mealType] = {
            id: recipe.id,
            name: recipe.name,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time,
            is_baby_suitable: isBabySuitable,
            nutrition_score: nutritionScore,
          };

          usedRecipeIds.add(recipe.id);

          await db('meal_plans')
            .insert({
              user_id: userId,
              plan_date: dateStr,
              meal_type: mealType,
              recipe_id: recipe.id,
              servings: 2,
              baby_age_months: babyAgeMonths,
              is_baby_suitable: isBabySuitable,
              nutrition_score: JSON.stringify(nutritionScore),
            })
            .onConflict(['user_id', 'plan_date', 'meal_type'])
            .merge();
        }
      }
    }

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      plans,
    };
  }

  /**
   * 评估菜谱对宝宝的适宜性
   * 返回 -1 表示不适宜，0 表示中等，1 表示适宜
   */
  private scoreRecipeForBaby(recipe: any, babyAgeMonths: number, excludeIngredients: string[]): number {
    try {
      const adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;

      if (!adultVersion?.ingredients) return 0;

      for (const ing of adultVersion.ingredients) {
        // 检查排除食材
        if (excludeIngredients.some(ex => ing.name.includes(ex))) {
          return -1;
        }
        // 检查月龄适宜性
        const suitability = isIngredientSuitable(ing.name, babyAgeMonths);
        if (!suitability.suitable && suitability.minAge && suitability.minAge > babyAgeMonths + 6) {
          return -1;
        }
      }
      return 1;
    } catch {
      return 0;
    }
  }

  /**
   * 计算营养均衡评分
   */
  private calculateNutritionBalance(
    recipe: any,
    tracker: { protein: number; vegetable: number; grain: number; seafood: number }
  ): { protein: number; vegetable: number; grain: number; seafood: number } {
    try {
      const adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;

      if (!adultVersion?.ingredients) return { ...tracker };

      for (const ing of adultVersion.ingredients) {
        const name = ing.name;
        if (['肉', '鸡', '鸭', '牛', '猪', '羊', '蛋', '豆腐'].some(k => name.includes(k))) {
          tracker.protein++;
        }
        if (['菜', '萝卜', '番茄', '白菜', '青椒', '菠菜', '西兰花'].some(k => name.includes(k))) {
          tracker.vegetable++;
        }
        if (['米', '面', '粉', '饭', '馒头', '面条'].some(k => name.includes(k))) {
          tracker.grain++;
        }
        if (['鱼', '虾', '蟹', '海'].some(k => name.includes(k))) {
          tracker.seafood++;
        }
      }
    } catch {
      // ignore parse errors
    }
    return { ...tracker };
  }

  /**
   * 按食材复用度排序菜谱池
   */
  private sortByIngredientOverlap(
    pool: any[],
    plans: Record<string, any>,
    currentDate: string
  ): any[] {
    // 收集前一天的食材
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevMeals = plans[prevDateStr];
    if (!prevMeals) return pool;

    const prevIngredients = new Set<string>();
    for (const meal of Object.values(prevMeals) as any[]) {
      // 从已选菜谱中提取食材名
      // 由于此处只有 id/name 信息，简单使用名字中的关键词
      if (meal?.name) {
        const chars = meal.name.split('');
        chars.forEach((c: string) => prevIngredients.add(c));
      }
    }

    // 排序：与前一天名字重叠多的排前面（简单启发式）
    return [...pool].sort((a, b) => {
      const overlapA = this.getIngredientOverlap(a.name, prevIngredients);
      const overlapB = this.getIngredientOverlap(b.name, prevIngredients);
      return overlapB - overlapA;
    });
  }

  /**
   * 计算食材名称重叠度
   */
  private getIngredientOverlap(name: string, prevChars: Set<string>): number {
    let overlap = 0;
    for (const c of name) {
      if (prevChars.has(c)) overlap++;
    }
    return overlap;
  }

  /**
   * 获取用户现有的餐食计划（用于防重复）
   * 返回格式: { [date]: { [meal_type]: recipe_id } }
   */
  private async getExistingPlans(
    userId: string,
    start: Date,
    end: Date
  ): Promise<Record<string, Record<string, string>>> {
    const plans = await db('meal_plans')
      .where('user_id', userId)
      .whereBetween('plan_date', [
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0],
      ])
      .select('plan_date', 'meal_type', 'recipe_id');

    const result: Record<string, Record<string, string>> = {};
    for (const plan of plans) {
      const date = typeof plan.plan_date === 'string'
        ? plan.plan_date.split('T')[0]
        : plan.plan_date.toISOString().split('T')[0];

      if (!result[date]) {
        result[date] = {};
      }
      result[date][plan.meal_type] = plan.recipe_id;
    }

    return result;
  }

  /**
   * 获取菜谱池（带缓存）
   * 将菜谱按类型分组，提高随机选择效率
   */
  private async getRecipePool(maxPrepTime: number): Promise<RecipePool> {
    const now = Date.now();

    // 检查缓存是否有效
    if (this.recipePoolCache && (now - this.poolCacheTime) < this.POOL_CACHE_TTL) {
      return this.recipePoolCache;
    }

    // 从数据库获取所有激活的菜谱
    const recipes = await db('recipes')
      .where('is_active', true)
      .where('prep_time', '<=', maxPrepTime)
      .select('*');

    // 按类型分组
    const pool: RecipePool = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    // 如果某个类型的菜谱少于3个，则将该菜谱也放入其他类型池中
    // 这样可以确保即使某类菜谱很少，也能有足够的随机性
    const typeCounts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0 };

    for (const recipe of recipes) {
      if (pool[recipe.type]) {
        pool[recipe.type].push(recipe);
        typeCounts[recipe.type]++;
      }
    }

    // 如果某类型菜谱少于3个，补充其他类型的菜谱
    if (typeCounts.breakfast < 3) {
      pool.breakfast.push(...recipes.filter(r => r.type !== 'breakfast'));
    }
    if (typeCounts.lunch < 3) {
      pool.lunch.push(...recipes.filter(r => r.type !== 'lunch'));
    }
    if (typeCounts.dinner < 3) {
      pool.dinner.push(...recipes.filter(r => r.type !== 'dinner'));
    }

    // 更新缓存
    this.recipePoolCache = pool;
    this.poolCacheTime = now;

    return pool;
  }

  /**
   * 从菜谱池中随机选择一个菜谱
   * @param pool - 该餐别的菜谱池
   * @param excludeId - 要排除的菜谱ID（当前显示的）
   * @param usedIds - 已使用的菜谱ID集合
   * @returns 随机选择的菜谱，如果没有可用菜谱则返回null
   */
  private selectRandomRecipe(
    pool: any[],
    excludeId?: string,
    usedIds?: Set<string>
  ): RecipeItem | null {
    if (pool.length === 0) {
      return null;
    }

    // 过滤掉要排除的菜谱
    let availablePool = pool;

    if (excludeId || (usedIds && usedIds.size > 0)) {
      availablePool = pool.filter(r =>
        r.id !== excludeId && !usedIds?.has(r.id)
      );
    }

    // 如果过滤后没有菜谱了，放宽限制：只排除当前显示的
    if (availablePool.length === 0 && excludeId) {
      availablePool = pool.filter(r => r.id !== excludeId);
    }

    // 如果还是没有菜谱，使用整个池子（总比没有好）
    if (availablePool.length === 0) {
      availablePool = pool;
    }

    // 随机选择
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    return availablePool[randomIndex];
  }

  /**
   * 标记餐食已完成，并按菜谱用量扣减库存（FIFO）
   */
  async markMealCompleted(userId: string, planId: string) {
    // 获取计划
    const plan = await db('meal_plans')
      .where('id', planId)
      .where('user_id', userId)
      .first();

    if (!plan) throw new Error('餐食计划不存在');

    // 标记为已完成
    await db('meal_plans')
      .where('id', planId)
      .update({ is_completed: true });

    // 获取菜谱食材
    const recipe = await db('recipes').where('id', plan.recipe_id).first();
    if (!recipe) return;

    let adultVersion;
    try {
      adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;
    } catch {
      return;
    }

    if (!adultVersion?.ingredients) return;

    // 按食材扣减库存（FIFO：先过期的先扣）
    for (const ing of adultVersion.ingredients) {
      const inventoryItems = await db('ingredient_inventory')
        .where('user_id', userId)
        .where('ingredient_name', ing.name)
        .where('quantity', '>', 0)
        .orderBy('expiry_date', 'asc') // FIFO
        .select('*');

      if (inventoryItems.length > 0) {
        const item = inventoryItems[0];
        const newQty = Math.max(0, item.quantity - 1);
        if (newQty === 0) {
          await db('ingredient_inventory').where('id', item.id).delete();
        } else {
          await db('ingredient_inventory').where('id', item.id).update({ quantity: newQty });
        }
      }
    }
  }

  /**
   * 获取本周一
   */
  private getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * 获取本周日
   */
  private getSunday(date: Date) {
    const monday = new Date(this.getMonday(date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday.toISOString().split('T')[0];
  }
}
