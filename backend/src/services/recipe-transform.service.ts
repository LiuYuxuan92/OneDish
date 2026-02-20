/**
 * 智能食谱转换服务
 * 将成人食谱转换为宝宝版本
 * 支持AI动态生成 + 缓存
 */

import { Recipe, BabyVersion, TransformResult, TransformRequest, BabyStage, BabyNutritionInfo, SyncCookingInfo, RecipeVersion } from '../types';
import { RecipePairingEngine, getStageByAge, getStageConfig, getPreferredCookingMethods, isIngredientSuitable, isSeasoningAllowed } from '../utils/recipe-pairing-engine';
import { NutritionCalculator } from '../utils/nutrition-calculator';
import { db } from '../config/database';
import { logger } from '../utils/logger';

// ============================================
// 缓存配置
// ============================================

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

// ============================================
// 转换服务类
// ============================================

export class RecipeTransformService {
  /**
   * 转换成人食谱为宝宝版本
   */
  async transformToBabyVersion(
    adultRecipe: Recipe,
    babyAgeMonths: number,
    options?: {
      familySize?: number;
      includeNutrition?: boolean;
      includeSyncCooking?: boolean;
    }
  ): Promise<TransformResult> {
    const { familySize = 2, includeNutrition = true, includeSyncCooking = true } = options || {};

    try {
      // 1. 检查缓存
      const cacheKey = this.generateCacheKey(adultRecipe.id, babyAgeMonths);
      const cached = await this.getCache(cacheKey);
      if (cached) {
        logger.info('Using cached transformation', { recipeId: adultRecipe.id, babyAgeMonths });
        return { ...cached, cached: true };
      }

      // 2. 使用配对引擎生成宝宝版
      const babyVersion = this.generateBabyVersion(adultRecipe, babyAgeMonths);

      // 3. 计算营养信息
      let nutritionInfo: BabyNutritionInfo | undefined;
      if (includeNutrition) {
        nutritionInfo = NutritionCalculator.calculate(babyVersion.ingredients, babyAgeMonths);
      }

      // 4. 生成同步烹饪建议
      let syncCooking: SyncCookingInfo | undefined;
      if (includeSyncCooking) {
        syncCooking = RecipePairingEngine.generateSyncCookingTips(
          adultRecipe.adult_version.steps,
          babyVersion.steps
        );
      }

      // 5. 组装结果
      const result: TransformResult = {
        success: true,
        adult_recipe: adultRecipe,
        baby_version: babyVersion,
        nutrition_info: nutritionInfo,
        sync_cooking: syncCooking,
        cached: false,
      };

      // 6. 保存缓存
      await this.setCache(cacheKey, result);

      logger.info('Recipe transformed successfully', { recipeId: adultRecipe.id, babyAgeMonths });
      return result;
    } catch (error) {
      logger.error('Failed to transform recipe', { recipeId: adultRecipe.id, error });
      return {
        success: false,
        adult_recipe: adultRecipe,
        error: error instanceof Error ? error.message : '转换失败',
      };
    }
  }

  /**
   * 生成宝宝版本食谱
   */
  private generateBabyVersion(adultRecipe: Recipe, babyAgeMonths: number): BabyVersion {
    const stage = getStageByAge(babyAgeMonths);
    const stageConfig = getStageConfig(babyAgeMonths);
    const adultVersion = adultRecipe.adult_version;

    // 1. 转换食材
    const babyIngredients = this.adaptIngredients(adultVersion.ingredients, babyAgeMonths);

    // 2. 转换步骤
    const babySteps = this.adaptSteps(adultVersion.steps, babyAgeMonths);

    // 3. 转换调料
    const babySeasonings = this.adaptSeasonings(adultVersion.seasonings || [], babyAgeMonths);

    // 4. 生成营养要点
    const nutritionTips = RecipePairingEngine.generateNutritionTips(babyIngredients);

    // 5. 检查过敏原
    const allergyAlert = this.checkAllergens(babyIngredients);

    // 6. 生成准备要点
    const preparationNotes = this.generatePreparationNotes(babyIngredients, babyAgeMonths);

    // 7. 生成同步烹饪信息
    const syncCooking = this.generateSyncCookingInfo(adultRecipe, babySteps);

    return {
      age_range: stageConfig.range,
      stage: stage,
      texture: stageConfig.texture,
      ingredients: babyIngredients,
      steps: babySteps,
      seasonings: babySeasonings,
      nutrition_tips: nutritionTips,
      allergy_alert: allergyAlert,
      preparation_notes: preparationNotes,
      sync_cooking: syncCooking,
    };
  }

  /**
   * 适配食材
   */
  private adaptIngredients(ingredients: RecipeVersion['ingredients'], babyAgeMonths: number): RecipeVersion['ingredients'] {
    return ingredients.map(ing => {
      const suitability = isIngredientSuitable(ing.name, babyAgeMonths);

      // 处理食材名称
      let babyName = ing.name;
      let note = ing.note || '';

      if (suitability.form && !suitability.suitable) {
        // 不适合月龄，需要特殊处理
        note = `${ing.name}需要${suitability.form}后食用`;
      }

      // 添加处理说明
      const form = suitability.form || '碎';
      note = note ? `${note} (${form}化处理)` : `(切碎为${form})`;

      // 减少用量 (约成人的1/4到1/3)
      const reducedAmount = this.reduceAmount(ing.amount, babyAgeMonths);

      return {
        name: babyName,
        amount: reducedAmount,
        note,
      };
    });
  }

  /**
   * 适配步骤
   */
  private adaptSteps(steps: RecipeVersion['steps'], babyAgeMonths: number): RecipeVersion['steps'] {
    const preferred = getPreferredCookingMethods(babyAgeMonths);

    return steps.map((step, index) => {
      let action = step.action;
      let note = step.note || '';

      // 转换烹饪方式
      const adaptedAction = this.adaptCookingMethod(action, preferred);
      action = adaptedAction;

      // 最后一步调整质地
      if (index === steps.length - 1) {
        const stageConfig = getStageConfig(babyAgeMonths);
        note = note ? `${note}；确保${stageConfig.texture}` : `确保${stageConfig.texture}`;
      }

      return {
        ...step,
        action,
        note,
        // 宝宝版可能需要更长的烹饪时间
        time: this.adjustCookingTime(step.time),
      };
    });
  }

  /**
   * 适配调料
   */
  private adaptSeasonings(seasonings: RecipeVersion['seasonings'], babyAgeMonths: number): RecipeVersion['seasonings'] {
    if (!seasonings || seasonings.length === 0) {
      return [{ name: '无', amount: '', note: '1岁以下不加调料' }];
    }

    const adapted: RecipeVersion['seasonings'] = [];

    for (const season of seasonings) {
      const result = isSeasoningAllowed(season.name, babyAgeMonths);

      if (result.allowed) {
        adapted.push({
          name: season.name,
          amount: this.reduceSeasoningAmount(season.amount),
          note: result.替代方案 || season.note || '少量',
        });
      } else {
        // 不允许的调料，用替代方案
        if (result.替代方案 && result.替代方案 !== '不使用') {
          adapted.push({
            name: result.替代方案,
            amount: '极少量',
            note: result.reason || '替代调料',
          });
        }
      }
    }

    return adapted.length > 0 ? adapted : [{ name: '无', amount: '', note: '1岁以下不加调料' }];
  }

  /**
   * 检查过敏原
   */
  private checkAllergens(ingredients: RecipeVersion['ingredients']): string {
    const allergens = ['虾', '蟹', '花生', '核桃', '鸡蛋', '鱼', '牛奶', '大豆', '面粉'];
    const found: string[] = [];

    for (const ing of ingredients) {
      for (const allergen of allergens) {
        if (ing.name.includes(allergen)) {
          found.push(allergen);
        }
      }
    }

    if (found.length === 0) return '';

    return `含有${[...new Set(found)].join('、')}，首次食用需少量尝试，观察有无过敏反应`;
  }

  /**
   * 生成准备要点
   */
  private generatePreparationNotes(ingredients: RecipeVersion['ingredients'], babyAgeMonths: number): string {
    const notes: string[] = [];
    const stageConfig = getStageConfig(babyAgeMonths);

    notes.push(`食材需处理为${stageConfig.texture}`);

    // 检查需要特殊处理的食材
    for (const ing of ingredients) {
      if (ing.name.includes('鱼') || ing.name.includes('虾')) {
        notes.push('注意去骨、去刺、去壳');
      }
      if (ing.name.includes('肉')) {
        notes.push('选择瘦肉，去除筋膜');
      }
    }

    return notes.join('；');
  }

  /**
   * 生成同步烹饪信息
   */
  private generateSyncCookingInfo(adultRecipe: Recipe, babySteps: RecipeVersion['steps']): SyncCookingInfo {
    const adultSteps = adultRecipe.adult_version.steps;

    // 查找可以共用的步骤
    const sharedSteps: number[] = [];
    for (let i = 0; i < Math.min(adultSteps.length, babySteps.length); i++) {
      // 食材准备步骤可以共用
      if (adultSteps[i].action.includes('清洗') || adultSteps[i].action.includes('切')) {
        sharedSteps.push(i + 1); // 步骤从1开始
      }
    }

    const canCookTogether = sharedSteps.length > 0;
    const timeSaving = canCookTogether ? `约${sharedSteps.length * 3}分钟` : '无明显节省';

    let tips = '';
    if (canCookTogether) {
      tips = '可以先处理宝宝食材，再处理大人食材';
    }

    return {
      can_cook_together: canCookTogether,
      shared_steps: sharedSteps,
      time_saving: timeSaving,
      tips,
    };
  }

  /**
   * 转换烹饪方式
   */
  private adaptCookingMethod(action: string, preferred: string[]): string {
    const methodMap: Record<string, string> = {
      '炸': '蒸',
      '煎': '煮',
      '烤': '蒸',
      '爆炒': '水煮',
      '红烧': '清蒸',
      '干锅': '蒸',
      '麻辣': '清淡',
    };

    for (const [adult, baby] of Object.entries(methodMap)) {
      if (action.includes(adult)) {
        return action.replace(adult, baby);
      }
    }

    return action;
  }

  /**
   * 调整烹饪时间（宝宝版可能需要更长）
   */
  private adjustCookingTime(time: number): number {
    return Math.round(time * 1.2); // 增加20%时间确保软烂
  }

  /**
   * 减少用量
   */
  private reduceAmount(amount: string, babyAgeMonths: number): string {
    // 根据月龄调整比例
    let ratio = 0.25;
    if (babyAgeMonths >= 12) ratio = 0.3;
    if (babyAgeMonths >= 18) ratio = 0.35;
    if (babyAgeMonths >= 24) ratio = 0.4;

    const match = amount.match(/[\d.]+/);
    if (!match) return `少量${amount}`;

    const num = parseFloat(match[0]);
    const reduced = Math.round(num * ratio);

    // 保持原单位
    const unit = amount.replace(match[0], '').trim();
    return `${reduced}${unit}`;
  }

  /**
   * 减少调料用量
   */
  private reduceSeasoningAmount(amount: string): string {
    if (!amount) return '极少量';

    if (amount.includes('勺') || amount.includes('匙')) {
      return '少许';
    }
    if (amount.includes('克') || amount.includes('g')) {
      const match = amount.match(/[\d.]+/);
      if (match) {
        const num = parseFloat(match[0]);
        return `${Math.max(1, Math.round(num * 0.2))}g`;
      }
    }

    return '极少量';
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(recipeId: string, babyAgeMonths: number): string {
    return `recipe_transform:${recipeId}:${babyAgeMonths}`;
  }

  /**
   * 获取缓存（从 DB）
   */
  private async getCache(key: string): Promise<TransformResult | null> {
    try {
      const parts = key.split(':');
      const recipeId = parts[1];
      const babyAgeMonths = parseInt(parts[2], 10);

      const cached = await db('transform_cache')
        .where('recipe_id', recipeId)
        .where('baby_age_months', babyAgeMonths)
        .where('expires_at', '>', new Date().toISOString())
        .first();

      if (cached) {
        return JSON.parse(cached.result);
      }
      return null;
    } catch (error) {
      logger.warn('Failed to read transform cache', { error });
      return null;
    }
  }

  /**
   * 设置缓存（写入 DB）
   */
  private async setCache(key: string, data: TransformResult): Promise<void> {
    try {
      const parts = key.split(':');
      const recipeId = parts[1];
      const babyAgeMonths = parseInt(parts[2], 10);
      const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString();

      // upsert: 先删后插（SQLite 兼容）
      await db('transform_cache')
        .where('recipe_id', recipeId)
        .where('baby_age_months', babyAgeMonths)
        .delete();

      await db('transform_cache').insert({
        recipe_id: recipeId,
        baby_age_months: babyAgeMonths,
        result: JSON.stringify(data),
        expires_at: expiresAt,
      });
    } catch (error) {
      logger.warn('Failed to write transform cache', { error });
    }
  }

  /**
   * 清除缓存
   */
  static async clearCache(recipeId?: string): Promise<void> {
    try {
      if (recipeId) {
        await db('transform_cache').where('recipe_id', recipeId).delete();
      } else {
        await db('transform_cache').truncate();
      }
    } catch (error) {
      logger.warn('Failed to clear transform cache', { error });
    }
  }

  /**
   * 清除过期缓存
   */
  static async cleanExpiredCache(): Promise<void> {
    try {
      const deleted = await db('transform_cache')
        .where('expires_at', '<', new Date().toISOString())
        .delete();
      if (deleted > 0) {
        logger.info(`Cleaned ${deleted} expired transform cache entries`);
      }
    } catch (error) {
      logger.warn('Failed to clean expired cache', { error });
    }
  }
}

// 导出单例
export const recipeTransformService = new RecipeTransformService();

export default RecipeTransformService;
