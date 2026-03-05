import { db } from '../config/database';
import { logger } from '../utils/logger';

/**
 * 食谱难度校准服务
 * 
 * 根据用户实际完成率数据自动调整难度标签
 * 
 * 校准规则：
 * - completion_count > 10 时才进行校准
 * - completion_rate > 0.9 且 difficulty = '困难' → 降级为 '中等'
 * - completion_rate < 0.5 且 difficulty = '简单' → 升级为 '中等'
 * - 其他情况保持原难度
 */
export class RecipeCalibrationService {
  // 最小完成次数阈值
  private readonly MIN_COMPLETION_COUNT = 10;
  
  // 高完成率阈值（用于降级）
  private readonly HIGH_COMPLETION_RATE = 0.9;
  
  // 低完成率阈值（用于升级）
  private readonly LOW_COMPLETION_RATE = 0.5;
  
  // 默认校准间隔（24小时）
  private readonly DEFAULT_CALIBRATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

  /**
   * 校准所有符合条件的食谱
   */
  async calibrateAllRecipes(): Promise<CalibrationResult> {
    logger.info('[RecipeCalibration] Starting calibration for all recipes');
    
    // 获取所有活跃食谱
    const recipes = await db('recipes')
      .where('is_active', true)
      .select('id', 'name', 'difficulty', 'completion_count', 'completion_rate');
    
    let calibrated = 0;
    let skipped = 0;
    const changes: RecipeCalibrationChange[] = [];
    
    for (const recipe of recipes as any[]) {
      const result = await this.calibrateRecipe(recipe);
      if (result.changed) {
        calibrated++;
        changes.push({
          recipe_id: result.recipe_id,
          recipe_name: result.recipe_name,
          old_difficulty: result.old_difficulty!,
          new_difficulty: result.new_difficulty!,
          completion_rate: result.completion_rate!,
          completion_count: result.completion_count!,
        });
      } else if (result.reason === 'insufficient_data') {
        skipped++;
      }
    }
    
    logger.info(`[RecipeCalibration] Calibration complete: ${calibrated} calibrated, ${skipped} skipped`);
    
    return {
      total_recipes: recipes.length,
      calibrated,
      skipped,
      changes,
    };
  }

  /**
   * 校准单个食谱
   */
  async calibrateRecipe(recipe: {
    id: string;
    name: string;
    difficulty: string;
    completion_count?: number;
    completion_rate?: number;
  }): Promise<CalibrateRecipeResult> {
    const completionCount = recipe.completion_count || 0;
    const completionRate = recipe.completion_rate;
    
    // 数据不足，跳过校准
    if (completionCount < this.MIN_COMPLETION_COUNT || completionRate === null || completionRate === undefined) {
      return {
        changed: false,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        reason: 'insufficient_data',
      };
    }
    
    // 计算应该的难度
    const recommendedDifficulty = this.calculateRecommendedDifficulty(
      recipe.difficulty,
      completionRate
    );
    
    // 如果推荐难度与当前校准难度相同，无需更新
    const currentCalibrated = await db('recipes')
      .where('id', recipe.id)
      .pluck('calibrated_difficulty');
    
    if (recommendedDifficulty === recipe.difficulty) {
      // 难度已经是合适的，无需校准
      return {
        changed: false,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        reason: 'already_optimal',
        current_difficulty: recipe.difficulty,
      };
    }
    
    // 更新校准难度
    const now = new Date().toISOString();
    await db('recipes')
      .where('id', recipe.id)
      .update({
        calibrated_difficulty: recommendedDifficulty,
        last_calibrated_at: now,
      });
    
    return {
      changed: true,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      reason: 'calibrated',
      old_difficulty: recipe.difficulty,
      new_difficulty: recommendedDifficulty,
      completion_rate: completionRate,
      completion_count: completionCount,
    };
  }

  /**
   * 根据完成率计算推荐的难度
   */
  private calculateRecommendedDifficulty(
    currentDifficulty: string,
    completionRate: number
  ): string {
    // 规则：
    // 1. 困难食谱完成率 > 90% → 降级为 中等
    // 2. 简单食谱完成率 < 50% → 升级为 中等
    // 3. 中等食谱根据完成率微调（可选）
    
    if (currentDifficulty === '困难' && completionRate > this.HIGH_COMPLETION_RATE) {
      return '中等';
    }
    
    if (currentDifficulty === '简单' && completionRate < this.LOW_COMPLETION_RATE) {
      return '中等';
    }
    
    // 其他情况保持原难度
    return currentDifficulty;
  }

  /**
   * 更新食谱的完成统计
   * 每次用户标记餐食完时调用
   */
  async updateCompletionStats(recipeId: string): Promise<void> {
    try {
      // 获取该食谱的所有完成记录
      const completedCount = await db('meal_plans')
        .where('recipe_id', recipeId)
        .where('is_completed', true)
        .count('* as count')
        .first();
      
      // 获取该食谱的总计划数
      const totalCount = await db('meal_plans')
        .where('recipe_id', recipeId)
        .count('* as count')
        .first();
      
      const completed = Number(completedCount?.count || 0);
      const total = Number(totalCount?.count || 0);
      
      // 计算完成率
      const completionRate = total > 0 ? completed / total : null;
      
      // 更新食谱统计
      await db('recipes')
        .where('id', recipeId)
        .update({
          completion_count: completed,
          completion_rate: completionRate,
        });
      
      logger.info(`[RecipeCalibration] Updated stats for recipe ${recipeId}: ${completed}/${total} = ${completionRate}`);
    } catch (error) {
      logger.error(`[RecipeCalibration] Failed to update completion stats for recipe ${recipeId}`, { error });
    }
  }

  /**
   * 批量更新多个食谱的完成统计
   */
  async batchUpdateCompletionStats(recipeIds: string[]): Promise<void> {
    for (const recipeId of recipeIds) {
      await this.updateCompletionStats(recipeId);
    }
  }

  /**
   * 获取校准后的难度（用于API返回）
   * 优先返回校准后的难度，如果没有则返回原始难度
   */
  async getEffectiveDifficulty(recipeId: string): Promise<string> {
    const recipe = await db('recipes')
      .where('id', recipeId)
      .select('difficulty', 'calibrated_difficulty')
      .first();
    
    if (!recipe) {
      return '中等'; // 默认值
    }
    
    // 优先使用校准后的难度
    return recipe.calibrated_difficulty || recipe.difficulty;
  }

  /**
   * 获取校准状态信息
   */
  async getCalibrationInfo(recipeId: string): Promise<RecipeCalibrationInfo | null> {
    const recipe = await db('recipes')
      .where('id', recipeId)
      .select(
        'difficulty',
        'calibrated_difficulty',
        'completion_count',
        'completion_rate',
        'last_calibrated_at'
      )
      .first();
    
    if (!recipe) {
      return null;
    }
    
    return {
      original_difficulty: recipe.difficulty,
      calibrated_difficulty: recipe.calibrated_difficulty,
      has_calibration: recipe.calibrated_difficulty !== null,
      completion_count: recipe.completion_count || 0,
      completion_rate: recipe.completion_rate,
      last_calibrated_at: recipe.last_calibrated_at,
      effective_difficulty: recipe.calibrated_difficulty || recipe.difficulty,
    };
  }

  /**
   * 启动定时校准任务
   */
  static startCalibrationScheduler(): void {
    const service = new RecipeCalibrationService();
    const intervalMs = Math.max(
      60 * 60 * 1000, // 最小1小时
      Number(process.env.RECIPE_CALIBRATION_INTERVAL_MS || 24 * 60 * 60 * 1000) // 默认24小时
    );
    
    // 启动后立即执行一次
    setTimeout(() => {
      service.calibrateAllRecipes().catch((err) => {
        logger.error('[RecipeCalibration] Initial calibration failed', { error: err });
      });
    }, 30 * 1000); // 30秒后开始
    
    // 定期执行
    setInterval(() => {
      service.calibrateAllRecipes().catch((err) => {
        logger.error('[RecipeCalibration] Scheduled calibration failed', { error: err });
      });
    }, intervalMs);
    
    logger.info(`[RecipeCalibration] Scheduler started with interval: ${intervalMs}ms`);
  }
}

// 类型定义
interface CalibrationResult {
  total_recipes: number;
  calibrated: number;
  skipped: number;
  changes: RecipeCalibrationChange[];
}

interface RecipeCalibrationChange {
  recipe_id: string;
  recipe_name: string;
  old_difficulty: string;
  new_difficulty: string;
  completion_rate: number;
  completion_count: number;
}

interface CalibrateRecipeResult {
  changed: boolean;
  recipe_id: string;
  recipe_name: string;
  reason: 'insufficient_data' | 'already_optimal' | 'calibrated';
  current_difficulty?: string;
  old_difficulty?: string;
  new_difficulty?: string;
  completion_rate?: number;
  completion_count?: number;
}

interface RecipeCalibrationInfo {
  original_difficulty: string;
  calibrated_difficulty: string | null;
  has_calibration: boolean;
  completion_count: number;
  completion_rate: number | null;
  last_calibrated_at: string | null;
  effective_difficulty: string;
}
