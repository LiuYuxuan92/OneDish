import { db, generateUUID } from '../config/database';
import { isIngredientSuitable } from '../utils/recipe-pairing-engine';

interface RecipePool {
  breakfast: any[];
  lunch: any[];
  dinner: any[];
}

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

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface RankingWeights {
  time: number;
  inventory: number;
  baby: number;
  feedback: number;
}

export class MealPlanService {
  private recipePoolCache: RecipePool | null = null;

  private genInviteCode(prefix = 'MP'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
  private poolCacheTime = 0;
  private readonly POOL_CACHE_TTL = 5 * 60 * 1000;

  private readonly defaultRankingWeights: RankingWeights = {
    time: this.readWeight('REC_RANK_V2_WEIGHT_TIME', 0.30),
    inventory: this.readWeight('REC_RANK_V2_WEIGHT_INVENTORY', 0.25),
    baby: this.readWeight('REC_RANK_V2_WEIGHT_BABY', 0.20),
    feedback: this.readWeight('REC_RANK_V2_WEIGHT_FEEDBACK', 0.25),
  };

  private readonly mealWeightConfig: Record<MealType, RankingWeights> = {
    breakfast: this.readMealWeights('breakfast'),
    lunch: this.readMealWeights('lunch'),
    dinner: this.readMealWeights('dinner'),
  };

  private lastRecommendationSnapshot = new Map<string, { A?: any; B?: any; at: string }>();

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

    const result: Record<string, any> = {};

    for (const plan of plans) {
      const date = typeof plan.plan_date === 'string'
        ? plan.plan_date.split('T')[0]
        : plan.plan_date.toISOString().split('T')[0];

      if (!result[date]) result[date] = {};

      result[date][plan.meal_type] = {
        id: plan.id,
        name: plan.name,
        image_url: plan.image_url,
        prep_time: plan.prep_time,
      };
    }

    return { start_date: start, end_date: end, plans: result };
  }

  async setMealPlan(data: {
    user_id: string;
    plan_date: string;
    meal_type: string;
    recipe_id: string;
    servings: number;
  }) {
    const { user_id, plan_date, meal_type, recipe_id, servings } = data;

    const [plan] = await db('meal_plans')
      .insert({ user_id, plan_date, meal_type, recipe_id, servings })
      .onConflict(['user_id', 'plan_date', 'meal_type'])
      .merge()
      .returning('*');

    return plan;
  }

  async deleteMealPlan(userId: string, planId: string) {
    await db('meal_plans').where('id', planId).where('user_id', userId).delete();
  }

  async generateWeeklyPlan(userId: string, startDate: string, preferences?: any) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const maxPrepTime = preferences?.max_prep_time || 30;
    const babyAgeMonths = preferences?.baby_age_months || null;
    const excludeIngredients: string[] = preferences?.exclude_ingredients || [];

    const existingPlans = await this.getExistingPlans(userId, start, end);
    const recipePool = await this.getRecipePool(maxPrepTime);

    if (babyAgeMonths) {
      for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
        recipePool[mealType] = recipePool[mealType].filter(recipe => (
          this.scoreRecipeForBaby(recipe, babyAgeMonths, excludeIngredients) >= 0
        ));
      }
    }

    const plans: Record<string, any> = {};
    const usedRecipeIds = new Set<string>();
    const nutritionTracker = { protein: 0, vegetable: 0, grain: 0, seafood: 0 };

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      plans[dateStr] = {};

      for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
        const currentRecipeId = existingPlans[dateStr]?.[mealType];
        let pool = recipePool[mealType];
        if (i > 0) pool = this.sortByIngredientOverlap(pool, plans, dateStr);

        const recipe = this.selectRandomRecipe(pool, currentRecipeId, usedRecipeIds);
        if (!recipe) continue;

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

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      plans,
    };
  }

  private scoreRecipeForBaby(recipe: any, babyAgeMonths: number, excludeIngredients: string[]): number {
    try {
      const adultVersion = typeof recipe.adult_version === 'string'
        ? JSON.parse(recipe.adult_version)
        : recipe.adult_version;

      if (!adultVersion?.ingredients) return 0;

      for (const ing of adultVersion.ingredients) {
        if (excludeIngredients.some(ex => ing.name.includes(ex))) return -1;
        const suitability = isIngredientSuitable(ing.name, babyAgeMonths);
        if (!suitability.suitable && suitability.minAge && suitability.minAge > babyAgeMonths + 6) return -1;
      }
      return 1;
    } catch {
      return 0;
    }
  }

  private calculateNutritionBalance(
    recipe: any,
    tracker: { protein: number; vegetable: number; grain: number; seafood: number }
  ) {
    try {
      const adultVersion = typeof recipe.adult_version === 'string' ? JSON.parse(recipe.adult_version) : recipe.adult_version;
      if (!adultVersion?.ingredients) return { ...tracker };

      for (const ing of adultVersion.ingredients) {
        const name = ing.name;
        if (['肉', '鸡', '鸭', '牛', '猪', '羊', '蛋', '豆腐'].some(k => name.includes(k))) tracker.protein++;
        if (['菜', '萝卜', '番茄', '白菜', '青椒', '菠菜', '西兰花'].some(k => name.includes(k))) tracker.vegetable++;
        if (['米', '面', '粉', '饭', '馒头', '面条'].some(k => name.includes(k))) tracker.grain++;
        if (['鱼', '虾', '蟹', '海'].some(k => name.includes(k))) tracker.seafood++;
      }
    } catch {
      // ignore
    }
    return { ...tracker };
  }

  private sortByIngredientOverlap(pool: any[], plans: Record<string, any>, currentDate: string): any[] {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevMeals = plans[prevDateStr];
    if (!prevMeals) return pool;

    const prevIngredients = new Set<string>();
    for (const meal of Object.values(prevMeals) as any[]) {
      if (!meal?.name) continue;
      meal.name.split('').forEach((c: string) => prevIngredients.add(c));
    }

    return [...pool].sort((a, b) => {
      const overlapA = this.getIngredientOverlap(a.name, prevIngredients);
      const overlapB = this.getIngredientOverlap(b.name, prevIngredients);
      return overlapB - overlapA;
    });
  }

  private getIngredientOverlap(name: string, prevChars: Set<string>): number {
    let overlap = 0;
    for (const c of name) if (prevChars.has(c)) overlap++;
    return overlap;
  }

  private async getExistingPlans(userId: string, start: Date, end: Date) {
    const plans = await db('meal_plans')
      .where('user_id', userId)
      .whereBetween('plan_date', [start.toISOString().split('T')[0], end.toISOString().split('T')[0]])
      .select('plan_date', 'meal_type', 'recipe_id');

    const result: Record<string, Record<string, string>> = {};
    for (const plan of plans) {
      const date = typeof plan.plan_date === 'string' ? plan.plan_date.split('T')[0] : plan.plan_date.toISOString().split('T')[0];
      if (!result[date]) result[date] = {};
      result[date][plan.meal_type] = plan.recipe_id;
    }
    return result;
  }

  private async getRecipePool(maxPrepTime: number): Promise<RecipePool> {
    const now = Date.now();
    if (this.recipePoolCache && (now - this.poolCacheTime) < this.POOL_CACHE_TTL) return this.recipePoolCache;

    const recipes = await db('recipes').where('is_active', true).where('prep_time', '<=', maxPrepTime).select('*');
    const pool: RecipePool = { breakfast: [], lunch: [], dinner: [] };
    const typeCounts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0 };

    for (const recipe of recipes) {
      if (!pool[recipe.type as MealType]) continue;
      pool[recipe.type as MealType].push(recipe);
      typeCounts[recipe.type]++;
    }

    if (typeCounts.breakfast < 3) pool.breakfast.push(...recipes.filter(r => r.type !== 'breakfast'));
    if (typeCounts.lunch < 3) pool.lunch.push(...recipes.filter(r => r.type !== 'lunch'));
    if (typeCounts.dinner < 3) pool.dinner.push(...recipes.filter(r => r.type !== 'dinner'));

    this.recipePoolCache = pool;
    this.poolCacheTime = now;
    return pool;
  }

  private selectRandomRecipe(pool: any[], excludeId?: string, usedIds?: Set<string>): RecipeItem | null {
    if (pool.length === 0) return null;
    let availablePool = pool;

    if (excludeId || (usedIds && usedIds.size > 0)) {
      availablePool = pool.filter(r => r.id !== excludeId && !usedIds?.has(r.id));
    }
    if (availablePool.length === 0 && excludeId) availablePool = pool.filter(r => r.id !== excludeId);
    if (availablePool.length === 0) availablePool = pool;

    const randomIndex = Math.floor(Math.random() * availablePool.length);
    return availablePool[randomIndex];
  }

  async markMealCompleted(userId: string, planId: string) {
    const plan = await db('meal_plans').where('id', planId).where('user_id', userId).first();
    if (!plan) throw new Error('餐食计划不存在');

    await db('meal_plans').where('id', planId).update({ is_completed: true });

    const recipe = await db('recipes').where('id', plan.recipe_id).first();
    if (!recipe) return;

    let adultVersion;
    try {
      adultVersion = typeof recipe.adult_version === 'string' ? JSON.parse(recipe.adult_version) : recipe.adult_version;
    } catch {
      return;
    }
    if (!adultVersion?.ingredients) return;

    for (const ing of adultVersion.ingredients) {
      const inventoryItems = await db('ingredient_inventory')
        .where('user_id', userId)
        .where('ingredient_name', ing.name)
        .where('quantity', '>', 0)
        .orderBy('expiry_date', 'asc')
        .select('*');

      if (inventoryItems.length === 0) continue;
      const item = inventoryItems[0];
      const newQty = Math.max(0, item.quantity - 1);
      if (newQty === 0) {
        await db('ingredient_inventory').where('id', item.id).delete();
      } else {
        await db('ingredient_inventory').where('id', item.id).update({ quantity: newQty });
      }
    }
  }

  private readWeight(envKey: string, fallback: number): number {
    const raw = process.env[envKey];
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  private normalizeWeights(raw: RankingWeights): RankingWeights {
    const total = raw.time + raw.inventory + raw.baby + raw.feedback;
    if (total <= 0) return { ...this.defaultRankingWeights };
    return {
      time: Number((raw.time / total).toFixed(4)),
      inventory: Number((raw.inventory / total).toFixed(4)),
      baby: Number((raw.baby / total).toFixed(4)),
      feedback: Number((raw.feedback / total).toFixed(4)),
    };
  }

  private readMealWeights(mealType: MealType): RankingWeights {
    const p = `REC_RANK_V2_${mealType.toUpperCase()}_WEIGHT_`;
    const base = this.defaultRankingWeights;
    return this.normalizeWeights({
      time: this.readWeight(`${p}TIME`, base.time),
      inventory: this.readWeight(`${p}INVENTORY`, base.inventory),
      baby: this.readWeight(`${p}BABY`, base.baby),
      feedback: this.readWeight(`${p}FEEDBACK`, base.feedback),
    });
  }

  private getWeightsForMeal(mealType: MealType): RankingWeights {
    return this.mealWeightConfig[mealType] || this.defaultRankingWeights;
  }

  async getSmartRecommendations(userId: string, input: SmartRecommendationInput) {
    const mealType = input.meal_type || 'all-day';
    const maxPrepTime = input.max_prep_time || 40;
    const babyAgeMonths = input.baby_age_months;
    const excludeIngredients = input.exclude_ingredients || [];

    const inventoryFromDb = await db('ingredient_inventory').where('user_id', userId).where('quantity', '>', 0).select('ingredient_name');
    const inventorySet = new Set<string>([
      ...(input.inventory || []),
      ...inventoryFromDb.map((row: any) => row.ingredient_name),
    ]);

    const targetMealTypes: MealType[] = mealType === 'all-day' ? ['breakfast', 'lunch', 'dinner'] : [mealType as MealType];

    const recipes = await db('recipes')
      .where('is_active', true)
      .where('prep_time', '<=', maxPrepTime)
      .whereIn('type', targetMealTypes)
      .select('*');

    const grouped: Record<MealType, any[]> = { breakfast: [], lunch: [], dinner: [] };
    for (const r of recipes) {
      if (grouped[r.type as MealType]) grouped[r.type as MealType].push(r);
    }

    const recommendations: Record<string, any> = {};

    for (const mt of targetMealTypes) {
      const feedbackProfile = await this.getMealFeedbackSignal(userId, mt);
      const mealWeights = this.getWeightsForMeal(mt);
      const pool = grouped[mt] || [];
      const scored = pool
        .map((recipe) => this.buildCandidateMetaV2(recipe, {
          babyAgeMonths,
          inventorySet,
          excludeIngredients,
          maxPrepTime,
          feedbackProfile,
          mealWeights,
        }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score || a.recipe.prep_time - b.recipe.prep_time || a.recipe.id.localeCompare(b.recipe.id));

      const pickA = scored[0] || null;
      const pickB = scored.find((x) => x.recipe.id !== pickA?.recipe.id) || null;

      const snapshotKey = `${userId}:${mt}`;
      const lastSnapshot = this.lastRecommendationSnapshot.get(snapshotKey);
      const nextA = pickA ? this.toRecommendationItemV2(pickA, lastSnapshot?.A) : null;
      const nextB = pickB ? this.toRecommendationItemV2(pickB, lastSnapshot?.B || lastSnapshot?.A) : null;

      recommendations[mt] = { A: nextA, B: nextB };
      this.lastRecommendationSnapshot.set(snapshotKey, { A: nextA, B: nextB, at: new Date().toISOString() });
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
        feedback_window_days: { near: 7, long: 30 },
        weights: {
          default: this.defaultRankingWeights,
          by_meal: this.mealWeightConfig,
        },
      },
      recommendations,
    };
  }

  private async getMealFeedbackSignal(userId: string, mealType: MealType) {
    const profile = await db('recommendation_learning_profiles')
      .where({ user_id: userId, meal_type: mealType })
      .first();

    if (profile?.signal_snapshot) {
      try {
        const signal = typeof profile.signal_snapshot === 'string'
          ? JSON.parse(profile.signal_snapshot)
          : profile.signal_snapshot;
        return {
          ...signal,
          meal_type: mealType,
          source: 'profile',
        };
      } catch {
        // fallback below
      }
    }

    return this.computeFeedbackSignalFromRows(userId, mealType);
  }

  private async computeFeedbackSignalFromRows(userId: string, mealType: MealType) {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db('recommendation_feedbacks')
      .where('user_id', userId)
      .andWhere('meal_type', mealType)
      .andWhere('event_time', '>=', since30d)
      .select('selected_option', 'reject_reason', 'event_time');

    const now = Date.now();
    let nearWeightTotal = 0;
    let nearAcceptWeight = 0;
    let longWeightTotal = 0;
    let longAcceptWeight = 0;
    const reasonScores = { time: 0, inventory: 0, baby: 0 };

    for (const row of rows as any[]) {
      const ts = new Date(row.event_time).getTime();
      const ageDays = Number.isNaN(ts) ? 999 : Math.max(0, (now - ts) / (24 * 60 * 60 * 1000));
      if (ageDays > 30) continue;

      const decayNear = ageDays <= 7 ? 1 : 0;
      const decayLong = ageDays <= 7 ? 1 : 0.35;
      const accepted = row.selected_option === 'A' || row.selected_option === 'B';

      nearWeightTotal += decayNear;
      longWeightTotal += decayLong;
      if (accepted) {
        nearAcceptWeight += decayNear;
        longAcceptWeight += decayLong;
      }

      if (row.selected_option === 'NONE' && row.reject_reason) {
        const text = String(row.reject_reason).toLowerCase();
        if (/耗时|时间|来不及|太久/.test(text)) reasonScores.time += decayLong;
        if (/没食材|缺食材|库存|买菜|食材不够/.test(text)) reasonScores.inventory += decayLong;
        if (/宝宝|孩子|太辣|刺激/.test(text)) reasonScores.baby += decayLong;
      }
    }

    const adoptionRate7d = nearWeightTotal > 0 ? nearAcceptWeight / nearWeightTotal : 0;
    const adoptionRate30d = longWeightTotal > 0 ? longAcceptWeight / longWeightTotal : 0;
    const feedbackScore = Math.min(1, Math.max(0, adoptionRate7d * 0.7 + adoptionRate30d * 0.3));

    return {
      meal_type: mealType,
      window_7d: { total_weight: Number(nearWeightTotal.toFixed(4)), adoption_rate: Number(adoptionRate7d.toFixed(4)) },
      window_30d: { total_weight: Number(longWeightTotal.toFixed(4)), adoption_rate: Number(adoptionRate30d.toFixed(4)) },
      reason_scores: {
        time: Number(reasonScores.time.toFixed(4)),
        inventory: Number(reasonScores.inventory.toFixed(4)),
        baby: Number(reasonScores.baby.toFixed(4)),
      },
      feedback_score: Number(feedbackScore.toFixed(4)),
      total_feedbacks: rows.length,
      source: 'realtime',
    };
  }

  private buildCandidateMetaV2(
    recipe: any,
    opts: {
      babyAgeMonths?: number;
      inventorySet?: Set<string>;
      excludeIngredients?: string[];
      maxPrepTime: number;
      feedbackProfile: any;
      mealWeights: RankingWeights;
    }
  ) {
    const { babyAgeMonths, inventorySet, excludeIngredients = [], maxPrepTime, feedbackProfile, mealWeights } = opts;
    let ingredients: string[] = [];
    let babySuitable = true;

    try {
      const adultVersion = typeof recipe.adult_version === 'string' ? JSON.parse(recipe.adult_version) : recipe.adult_version;
      ingredients = (adultVersion?.ingredients || []).map((i: any) => i.name).filter(Boolean);
    } catch {
      ingredients = [];
    }

    for (const ing of ingredients) {
      if (excludeIngredients.some(ex => ing.includes(ex))) {
        return { recipe, score: -1, missingIngredients: [], babySuitable: false, switchHint: '命中忌口食材，已过滤', explain: ['命中忌口食材，已剔除'], ranking_reasons: [] };
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

    const feedbackBase = Number(feedbackProfile.feedback_score || 0);
    const reasonScores = feedbackProfile.reason_scores || { time: 0, inventory: 0, baby: 0 };
    let feedbackAdjust = 0;
    if (reasonScores.time > 0 && prep <= 20) feedbackAdjust += 0.12;
    if (reasonScores.inventory > 0 && missingIngredients.length <= 1) feedbackAdjust += 0.12;
    if (reasonScores.baby > 0 && babySuitable) feedbackAdjust += 0.12;
    const feedbackScore = Math.max(0, Math.min(1, feedbackBase + feedbackAdjust));

    const scoreParts = {
      time: mealWeights.time * timeScore,
      inventory: mealWeights.inventory * inventoryScore,
      baby: mealWeights.baby * babyScore,
      feedback: mealWeights.feedback * feedbackScore,
    };

    const score = scoreParts.time + scoreParts.inventory + scoreParts.baby + scoreParts.feedback;

    const rankingReasons = [
      { code: 'time', label: prep <= 20 ? '准备时间更短' : '准备耗时可接受', contribution: scoreParts.time, detail: `约${prep}分钟` },
      { code: 'inventory', label: missingIngredients.length <= 1 ? '库存覆盖更好，缺口食材更少' : '库存缺口较大', contribution: scoreParts.inventory, detail: `缺口${missingIngredients.length}项` },
      { code: 'baby', label: babyAgeMonths ? (babySuitable ? '宝宝月龄适配更好' : '宝宝适配一般') : '未启用宝宝筛选', contribution: scoreParts.baby, detail: babyAgeMonths ? `月龄${babyAgeMonths}` : '默认' },
      { code: 'feedback', label: '历史反馈衰减学习加权', contribution: scoreParts.feedback, detail: `7天${Math.round((feedbackProfile.window_7d?.adoption_rate || 0) * 100)}%/30天${Math.round((feedbackProfile.window_30d?.adoption_rate || 0) * 100)}%` },
    ].sort((a, b) => b.contribution - a.contribution || a.code.localeCompare(b.code));

    const explain = rankingReasons.filter(x => x.contribution > 0.03).slice(0, 3).map(x => x.label);
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
      ranking_reasons: rankingReasons,
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
      ranking_reasons: item.ranking_reasons || [],
    };

    return {
      ...base,
      vs_last: this.buildVsLast(base, last),
    };
  }

  async submitRecommendationFeedback(userId: string, input: RecommendationFeedbackInput) {
    const eventTime = input.event_time ? new Date(input.event_time) : new Date();
    if (Number.isNaN(eventTime.getTime())) throw new Error('INVALID_EVENT_TIME');

    const id = generateUUID();
    await db('recommendation_feedbacks').insert({
      id,
      user_id: userId,
      meal_type: input.meal_type,
      selected_option: input.selected_option,
      reject_reason: input.reject_reason || null,
      event_time: eventTime.toISOString(),
    });

    if (input.meal_type !== 'all-day') {
      await this.recomputeRecommendationLearning({ userIds: [userId], mealTypes: [input.meal_type as MealType] });
    }

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

  async recomputeRecommendationLearning(input?: { userIds?: string[]; mealTypes?: MealType[] }) {
    const mealTypes: MealType[] = (input?.mealTypes && input.mealTypes.length > 0)
      ? input.mealTypes
      : ['breakfast', 'lunch', 'dinner'];

    let userIds = input?.userIds;
    if (!userIds || userIds.length === 0) {
      const users = await db('recommendation_feedbacks').distinct('user_id');
      userIds = users.map((u: any) => u.user_id).filter(Boolean);
    }

    let affected = 0;
    for (const uid of userIds) {
      for (const mt of mealTypes) {
        const signal = await this.computeFeedbackSignalFromRows(uid, mt);
        const id = `${uid}:${mt}`;
        await db('recommendation_learning_profiles')
          .insert({
            id,
            user_id: uid,
            meal_type: mt,
            weight_config: JSON.stringify(this.getWeightsForMeal(mt)),
            signal_snapshot: JSON.stringify(signal),
            computed_at: new Date().toISOString(),
          })
          .onConflict(['user_id', 'meal_type'])
          .merge({
            weight_config: JSON.stringify(this.getWeightsForMeal(mt)),
            signal_snapshot: JSON.stringify(signal),
            computed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        affected++;
      }
    }

    return { affected_users: userIds.length, affected_profiles: affected, meal_types: mealTypes };
  }

  static startRecommendationLearningScheduler() {
    const service = new MealPlanService();
    const intervalMs = Math.max(5 * 60 * 1000, Number(process.env.REC_RECOMPUTE_INTERVAL_MS || 6 * 60 * 60 * 1000));
    setTimeout(() => {
      service.recomputeRecommendationLearning().catch(() => null);
    }, 15 * 1000);
    setInterval(() => {
      service.recomputeRecommendationLearning().catch(() => null);
    }, intervalMs);
  }

  async createWeeklyShare(ownerId: string) {
    const existed = await db('meal_plan_shares').where('owner_id', ownerId).first();
    if (existed) return existed;

    const inviteCode = this.genInviteCode('MP');
    const shareLink = `onedish://meal-plan/share/${inviteCode}`;

    const [share] = await db('meal_plan_shares')
      .insert({
        owner_id: ownerId,
        invite_code: inviteCode,
        share_link: shareLink,
      })
      .returning('*');

    return share;
  }

  async regenerateWeeklyShareInvite(shareId: string, ownerId: string) {
    const share = await db('meal_plan_shares').where('id', shareId).first();
    if (!share) throw new Error('共享计划不存在');
    if (share.owner_id !== ownerId) throw new Error('仅 owner 可操作邀请码');

    const oldInviteCode = share.invite_code;
    const inviteCode = this.genInviteCode('MP');
    const shareLink = `onedish://meal-plan/share/${inviteCode}`;

    const revokedAt = new Date();
    const ttlDays = Math.max(1, Number(process.env.SHARE_INVITE_REVOCATION_TTL_DAYS || 30));
    const expiresAt = new Date(revokedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    await db('share_invite_revocations').insert({
      share_type: 'meal_plan',
      share_id: shareId,
      invite_code: oldInviteCode,
      revoked_by: ownerId,
      revoked_at: revokedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    const [updated] = await db('meal_plan_shares')
      .where('id', shareId)
      .update({ invite_code: inviteCode, share_link: shareLink })
      .returning('*');

    return { ...updated, old_invite_code: oldInviteCode };
  }

  async joinWeeklyShare(inviteCode: string, userId: string) {
    const share = await db('meal_plan_shares').where('invite_code', inviteCode).first();
    if (!share) {
      const revoked = await db('share_invite_revocations').where('invite_code', inviteCode).where('share_type', 'meal_plan').first();
      if (revoked) throw new Error('邀请码已失效，请向 owner 获取最新邀请码');
      throw new Error('邀请码无效');
    }
    if (share.owner_id === userId) {
      return { share_id: share.id, owner_id: share.owner_id, role: 'owner' };
    }

    const existing = await db('meal_plan_shares').where('owner_id', share.owner_id).andWhereNot('id', share.id).first();
    if (existing) {
      throw new Error('该计划共享已变更，请让 owner 重新发送邀请');
    }

    await db('meal_plan_shares').where('id', share.id).update({ member_id: userId });
    return { share_id: share.id, owner_id: share.owner_id, role: 'member' };
  }

  async removeWeeklyShareMember(shareId: string, ownerId: string, targetMemberId: string) {
    const share = await db('meal_plan_shares').where('id', shareId).first();
    if (!share) throw new Error('共享计划不存在');
    if (share.owner_id !== ownerId) throw new Error('仅 owner 可移除成员');
    if (!share.member_id || share.member_id !== targetMemberId) throw new Error('成员不存在或已移除');

    await db('meal_plan_shares').where('id', shareId).update({ member_id: null });
    return { share_id: shareId, removed_member_id: targetMemberId };
  }

  async getSharedWeeklyPlan(shareId: string, userId: string, startDate?: string, endDate?: string) {
    const share = await db('meal_plan_shares').where('id', shareId).first();
    if (!share) throw new Error('共享计划不存在');

    const isOwner = share.owner_id === userId;
    const isMember = share.member_id === userId;
    if (!isOwner && !isMember) throw new Error('你已无权访问该共享周计划，可能已被移除');

    const base = await this.getWeeklyPlan(share.owner_id, startDate, endDate);
    const members = isOwner && share.member_id ? await this.resolveUserProfiles([share.member_id]) : [];
    return { ...base, share_id: shareId, owner_id: share.owner_id, role: isOwner ? 'owner' : 'member', members };
  }

  private async resolveUserProfiles(userIds: string[]) {
    if (!userIds.length) return [];

    const users = await db('users').whereIn('id', userIds).select('id', 'username', 'avatar_url');
    const profileMap = new Map(users.map((u: any) => [u.id, u]));

    return userIds.map((userId) => {
      const profile = profileMap.get(userId);
      const displayName = profile?.username || userId;
      return {
        user_id: userId,
        display_name: displayName,
        avatar_url: profile?.avatar_url || null,
      };
    });
  }

  async markSharedMealCompleted(shareId: string, userId: string, planId: string) {
    const share = await db('meal_plan_shares').where('id', shareId).first();
    if (!share) throw new Error('共享计划不存在');

    const isOwner = share.owner_id === userId;
    const isMember = share.member_id === userId;
    if (!isOwner && !isMember) throw new Error('你已无权访问该共享周计划，可能已被移除');

    const plan = await db('meal_plans').where('id', planId).where('user_id', share.owner_id).first();
    if (!plan) throw new Error('餐食计划不存在');

    await db('meal_plans').where('id', planId).update({ is_completed: true });
    return { plan_id: planId, share_id: shareId, completed: true };
  }

  private getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  private getSunday(date: Date) {
    const monday = new Date(this.getMonday(date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday.toISOString().split('T')[0];
  }
}
