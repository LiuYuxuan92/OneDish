import { db, generateUUID } from '../config/database';
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

interface SmartRecommendationInput {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'all-day';
  baby_age_months?: number;
  max_prep_time?: number;
  inventory?: string[];
  exclude_ingredients?: string[];
}

interface RecommendationFeedbackInput {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'all-day';
  selected_option: 'A' | 'B' | 'NONE';
  reject_reason?: string;
  event_time?: string;
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
   * 三餐智能推荐 V2（反馈驱动排序，A/B方案）
   */
  private readonly rankingWeights = {
    time: this.readWeight('REC_RANK_V2_WEIGHT_TIME', 0.30),
    inventory: this.readWeight('REC_RANK_V2_WEIGHT_INVENTORY', 0.25),
    baby: this.readWeight('REC_RANK_V2_WEIGHT_BABY', 0.20),
    feedback: this.readWeight('REC_RANK_V2_WEIGHT_FEEDBACK', 0.25),
  };

  private lastRecommendationSnapshot = new Map<string, { A?: any; B?: any; at: string }>();

  private readWeight(envKey: string, fallback: number): number {
    const raw = process.env[envKey];
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  async getSmartRecommendations(userId: string, input: SmartRecommendationInput) {
    const mealType = input.meal_type || 'all-day';
    const maxPrepTime = input.max_prep_time || 40;
    const babyAgeMonths = input.baby_age_months;
    const excludeIngredients = input.exclude_ingredients || [];

    const inventoryFromDb = await db('ingredient_inventory')
      .where('user_id', userId)
      .where('quantity', '>', 0)
      .select('ingredient_name');

    const inventorySet = new Set<string>([
      ...(input.inventory || []),
      ...inventoryFromDb.map((row: any) => row.ingredient_name),
    ]);

    const targetMealTypes: Array<'breakfast' | 'lunch' | 'dinner'> =
      mealType === 'all-day' ? ['breakfast', 'lunch', 'dinner'] : [mealType];

    const recipes = await db('recipes')
      .where('is_active', true)
      .where('prep_time', '<=', maxPrepTime)
      .whereIn('type', targetMealTypes)
      .select('*');

    const grouped: Record<string, any[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };
    for (const r of recipes) {
      if (grouped[r.type]) grouped[r.type].push(r);
    }

    const recommendations: Record<string, any> = {};

    for (const mt of targetMealTypes) {
      const feedbackStats = await this.getMealFeedbackSignal(userId, mt);
      const pool = grouped[mt] || [];
      const scored = pool
        .map((recipe) => this.buildCandidateMetaV2(recipe, {
          babyAgeMonths,
          inventorySet,
          excludeIngredients,
          maxPrepTime,
          feedbackStats,
        }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score || a.recipe.prep_time - b.recipe.prep_time);

      const pickA = scored[0] || null;
      const pickB = scored.find((x) => x.recipe.id !== pickA?.recipe.id) || null;

      const snapshotKey = `${userId}:${mt}`;
      const lastSnapshot = this.lastRecommendationSnapshot.get(snapshotKey);
      const nextA = pickA ? this.toRecommendationItemV2(pickA, lastSnapshot?.A) : null;
      const nextB = pickB ? this.toRecommendationItemV2(pickB, lastSnapshot?.B || lastSnapshot?.A) : null;

      recommendations[mt] = { A: nextA, B: nextB };
      this.lastRecommendationSnapshot.set(snapshotKey, {
        A: nextA,
        B: nextB,
        at: new Date().toISOString(),
      });
    }

    return {
      meal_type: mealType,
      constraints: {
        baby_age_months: babyAgeMonths || null,
        max_prep_time: maxPrepTime,
        inventory_count: inventorySet.size,
        exclude_ingredients: excludeIngredients,
      },
      ranking_v2: {
        enabled: true,
        feedback_window_days: 7,
        weights: this.rankingWeights,
      },
      recommendations,
    };
  }

  private async getMealFeedbackSignal(userId: string, mealType: 'breakfast' | 'lunch' | 'dinner') {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db('recommendation_feedbacks')
      .where('user_id', userId)
      .andWhere('meal_type', mealType)
      .andWhere('event_time', '>=', since)
      .select('selected_option', 'reject_reason');

    const total = rows.length;
    const accepted = rows.filter((r: any) => r.selected_option === 'A' || r.selected_option === 'B').length;
    const adoptionRate = total > 0 ? accepted / total : 0;

    const reasons = rows
      .filter((r: any) => r.selected_option === 'NONE' && r.reject_reason)
      .map((r: any) => String(r.reject_reason).toLowerCase());

    const hasTimePressure = reasons.some((x) => /耗时|时间|来不及|太久/.test(x));
    const hasInventoryIssue = reasons.some((x) => /没食材|缺食材|库存|买菜|食材不够/.test(x));
    const hasBabyIssue = reasons.some((x) => /宝宝|孩子|太辣|刺激/.test(x));

    return {
      meal_type: mealType,
      total,
      accepted,
      adoptionRate,
      hasTimePressure,
      hasInventoryIssue,
      hasBabyIssue,
    };
  }

  private buildCandidateMetaV2(
    recipe: any,
    opts: {
      babyAgeMonths?: number;
      inventorySet?: Set<string>;
      excludeIngredients?: string[];
      maxPrepTime: number;
      feedbackStats: any;
    }
  ) {
    const { babyAgeMonths, inventorySet, excludeIngredients = [], maxPrepTime, feedbackStats } = opts;
    let ingredients: string[] = [];
    let babySuitable = true;

    try {
      const adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;
      ingredients = (adultVersion?.ingredients || []).map((i: any) => i.name).filter(Boolean);
    } catch {
      ingredients = [];
    }

    for (const ing of ingredients) {
      if (excludeIngredients.some(ex => ing.includes(ex))) {
        return { recipe, score: -1, missingIngredients: [], babySuitable: false, switchHint: '命中忌口食材，已过滤', explain: ['命中忌口食材，已剔除'] };
      }
      if (babyAgeMonths) {
        const suitability = isIngredientSuitable(ing, babyAgeMonths);
        if (!suitability.suitable) babySuitable = false;
      }
    }

    const missingIngredients = ingredients.filter((ing) => {
      if (!inventorySet || inventorySet.size === 0) return false;
      return !Array.from(inventorySet).some((x) => ing.includes(x) || x.includes(ing));
    });

    const normalizedMaxPrep = Math.max(10, maxPrepTime || 40);
    const prep = Number(recipe.prep_time) || normalizedMaxPrep;
    const timeScore = Math.max(0, 1 - prep / normalizedMaxPrep);
    const inventoryScore = inventorySet && inventorySet.size > 0
      ? Math.max(0, 1 - missingIngredients.length / Math.max(1, ingredients.length || 1))
      : 0.6;
    const babyScore = babyAgeMonths ? (babySuitable ? 1 : 0.1) : 0.6;

    const feedbackBase = feedbackStats.adoptionRate;
    let feedbackAdjust = 0;
    if (feedbackStats.hasTimePressure && prep <= 20) feedbackAdjust += 0.15;
    if (feedbackStats.hasInventoryIssue && missingIngredients.length <= 1) feedbackAdjust += 0.15;
    if (feedbackStats.hasBabyIssue && babySuitable) feedbackAdjust += 0.15;
    const feedbackScore = Math.max(0, Math.min(1, feedbackBase + feedbackAdjust));

    const score =
      this.rankingWeights.time * timeScore
      + this.rankingWeights.inventory * inventoryScore
      + this.rankingWeights.baby * babyScore
      + this.rankingWeights.feedback * feedbackScore;

    const explain: string[] = [];
    if (feedbackStats.adoptionRate >= 0.6 && feedbackStats.total >= 3) explain.push('近期同餐次采纳率高');
    if (feedbackStats.hasTimePressure && prep <= 20) explain.push('近期该餐次反馈更偏好快手方案');
    if (prep <= 20) explain.push('准备时间更短');
    if (missingIngredients.length <= 1) explain.push('库存覆盖更好，缺口食材更少');
    if (babyAgeMonths && babySuitable) explain.push('宝宝月龄适配更好');
    if (explain.length === 0) explain.push('综合时间与库存表现稳定');

    const switchHint = missingIngredients.length > 0
      ? `缺少${missingIngredients.slice(0, 2).join('、')}，建议切换B方案降低采购量`
      : '库存覆盖较好，优先推荐此方案';

    return {
      recipe,
      score,
      missingIngredients,
      babySuitable,
      switchHint,
      explain,
    };
  }

  private buildVsLast(current: any, last?: any) {
    if (!last) return '首次推荐，暂无历史对比';

    const nameChanged = current?.name && last?.name && current.name !== last.name;
    const prepDiff = (current?.time_estimate ?? 0) - (last?.time_estimate ?? 0);
    const missingDiff = (current?.missing_ingredients?.length ?? 0) - (last?.missing_ingredients?.length ?? 0);

    const parts: string[] = [];
    if (nameChanged) parts.push(`主推荐由「${last.name}」调整为「${current.name}」`);
    if (prepDiff !== 0) parts.push(`预计耗时 ${prepDiff > 0 ? '+' : ''}${prepDiff} 分钟`);
    if (missingDiff !== 0) parts.push(`库存缺口 ${missingDiff > 0 ? '+' : ''}${missingDiff}`);

    if (parts.length === 0) return '与上次推荐基本一致';
    return `相较上次，${parts.join('；')}`;
  }

  private toRecommendationItemV2(item: any, last?: any) {
    const base = {
      id: item.recipe.id,
      name: item.recipe.name,
      image_url: item.recipe.image_url,
      time_estimate: item.recipe.prep_time,
      missing_ingredients: item.missingIngredients,
      baby_suitable: item.babySuitable,
      switch_hint: item.switchHint,
      explain: item.explain || [],
    };

    return {
      ...base,
      vs_last: this.buildVsLast(base, last),
    };
  }

  async submitRecommendationFeedback(userId: string, input: RecommendationFeedbackInput) {
    const eventTime = input.event_time ? new Date(input.event_time) : new Date();
    if (Number.isNaN(eventTime.getTime())) {
      throw new Error('INVALID_EVENT_TIME');
    }

    const id = generateUUID();
    await db('recommendation_feedbacks').insert({
      id,
      user_id: userId,
      meal_type: input.meal_type,
      selected_option: input.selected_option,
      reject_reason: input.reject_reason || null,
      event_time: eventTime.toISOString(),
    });

    return { accepted: true, id };
  }

  async getRecommendationFeedbackStats(userId: string, days = 7) {
    const safeDays = Math.max(1, Math.min(30, Number(days) || 7));
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await db('recommendation_feedbacks')
      .where('user_id', userId)
      .andWhere('event_time', '>=', since)
      .select('selected_option', 'reject_reason');

    const total = rows.length;
    const accepted = rows.filter((r: any) => r.selected_option === 'A' || r.selected_option === 'B').length;
    const rejected = rows.filter((r: any) => r.selected_option === 'NONE').length;
    const adoptionRate = total > 0 ? Number((accepted / total).toFixed(4)) : 0;

    const reasonCounter = new Map<string, number>();
    rows
      .filter((r: any) => r.selected_option === 'NONE' && r.reject_reason)
      .forEach((r: any) => {
        const key = String(r.reject_reason).trim();
        if (!key) return;
        reasonCounter.set(key, (reasonCounter.get(key) || 0) + 1);
      });

    const rejectReasonTop = Array.from(reasonCounter.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      window_days: safeDays,
      total,
      accepted,
      rejected,
      adoption_rate: adoptionRate,
      reject_reason_top: rejectReasonTop,
    };
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
