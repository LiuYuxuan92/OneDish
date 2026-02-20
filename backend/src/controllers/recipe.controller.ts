import { Request, Response } from 'express';
import { RecipeService } from '../services/recipe.service';
import { RecipeTransformService } from '../services/recipe-transform.service';
import { SyncTimelineService } from '../services/sync-timeline.service';
import { logger } from '../utils/logger';

export class RecipeController {
  private recipeService: RecipeService;
  private transformService: RecipeTransformService;
  private timelineService: SyncTimelineService;

  constructor() {
    this.recipeService = new RecipeService();
    this.transformService = new RecipeTransformService();
    this.timelineService = new SyncTimelineService();
  }

  // 获取今日推荐
  getDailyRecommendation = async (req: Request, res: Response) => {
    try {
      const { type, max_time } = req.query;
      const result = await this.recipeService.getDailyRecommendation({
        type: type as string,
        max_time: max_time ? Number(max_time) : undefined,
      });
      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get daily recommendation', { error });
      res.status(500).json({
        code: 500,
        message: '获取今日推荐失败',
        data: null,
      });
    }
  };

  // 获取菜谱详情
  getRecipeDetail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.user_id;
      const result = await this.recipeService.getRecipeDetail(id, userId);
      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get recipe detail', { error });
      res.status(404).json({
        code: 404,
        message: '菜谱不存在',
        data: null,
      });
    }
  };

  // 搜索菜谱
  searchRecipes = async (req: Request, res: Response) => {
    try {
      const {
        keyword,
        type,
        category,
        max_time,
        difficulty,
        page = 1,
        limit = 20,
      } = req.query;

      const result = await this.recipeService.searchRecipes({
        keyword: keyword as string,
        type: type as string,
        category: category as string,
        max_time: max_time ? Number(max_time) : undefined,
        difficulty: difficulty as string,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to search recipes', { error });
      res.status(500).json({
        code: 500,
        message: '搜索菜谱失败',
        data: null,
      });
    }
  };

  // 获取分类
  getCategories = async (req: Request, res: Response) => {
    try {
      const result = await this.recipeService.getCategories();
      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get categories', { error });
      res.status(500).json({
        code: 500,
        message: '获取分类失败',
        data: null,
      });
    }
  };

  // 转换成人食谱为宝宝版
  transformRecipe = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { baby_age_months, family_size, include_nutrition, include_sync_cooking } = req.body;

      // 验证参数
      if (!baby_age_months || baby_age_months < 6 || baby_age_months > 36) {
        res.status(400).json({
          code: 400,
          message: '请提供有效的宝宝月龄（6-36个月）',
          data: null,
        });
        return;
      }

      // 获取成人食谱
      const adultRecipe = await this.recipeService.getRecipeDetail(id);

      // 转换为宝宝版
      const result = await this.transformService.transformToBabyVersion(
        adultRecipe,
        baby_age_months,
        {
          familySize: family_size,
          includeNutrition: include_nutrition !== false,
          includeSyncCooking: include_sync_cooking !== false,
        }
      );

      if (!result.success) {
        res.status(500).json({
          code: 500,
          message: result.error || '转换失败',
          data: null,
        });
        return;
      }

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to transform recipe', { error });
      res.status(500).json({
        code: 500,
        message: '转换食谱失败',
        data: null,
      });
    }
  };

  // 将平铺的搜索结果（AI/联网菜谱）转换为宝宝版
  transformRawRecipe = async (req: Request, res: Response) => {
    try {
      const { name, description, ingredients, steps, baby_age_months } = req.body;

      if (!name) {
        res.status(400).json({ code: 400, message: '请提供菜谱名称', data: null });
        return;
      }
      if (!baby_age_months || baby_age_months < 6 || baby_age_months > 36) {
        res.status(400).json({ code: 400, message: '请提供有效的宝宝月龄（6-36个月）', data: null });
        return;
      }

      // 将 string[] 食材解析为 {name, amount} 结构
      const parsedIngredients = ((ingredients as string[]) || []).map((ing: string) => {
        const trimmed = ing.trim();
        // 尝试按最后一个空格分割，例如 "番茄 2个" → {name:"番茄", amount:"2个"}
        const lastSpace = trimmed.lastIndexOf(' ');
        if (lastSpace > 0) {
          return { name: trimmed.slice(0, lastSpace), amount: trimmed.slice(lastSpace + 1), note: '' };
        }
        return { name: trimmed, amount: '', note: '' };
      });

      // 将 string[] 步骤解析为 {step, action, time, tools, note} 结构
      const parsedSteps = ((steps as string[]) || []).map((step: string, index: number) => ({
        step: index + 1,
        action: step.trim(),
        time: 0,
        tools: [] as string[],
        note: '',
      }));

      // 构建 Recipe-like 对象供转换服务使用
      // 注意：adult_version 必须是对象（而非 JSON 字符串），服务直接访问 .ingredients/.steps
      const rawRecipe = {
        id: `raw_${Date.now()}`,
        name,
        description: description || '',
        prep_time: 30,
        difficulty: '中等',
        servings: '2人份',
        adult_version: {
          ingredients: parsedIngredients,
          steps: parsedSteps,
          seasonings: [],
          prep_time: 30,
        },
        baby_version: null,
        cooking_tips: null,
        image_url: null,
      } as any;

      const result = await this.transformService.transformToBabyVersion(
        rawRecipe,
        baby_age_months,
        { includeNutrition: true, includeSyncCooking: false }
      );

      if (!result.success) {
        res.status(500).json({ code: 500, message: result.error || '转换失败', data: null });
        return;
      }

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to transform raw recipe', { error });
      res.status(500).json({ code: 500, message: '转换食谱失败', data: null });
    }
  };

  // 批量转换食谱
  batchTransformRecipes = async (req: Request, res: Response) => {
    try {
      const { recipe_ids, baby_age_months, include_nutrition } = req.body;

      // 验证参数
      if (!recipe_ids || !Array.isArray(recipe_ids) || recipe_ids.length === 0) {
        res.status(400).json({
          code: 400,
          message: '请提供有效的食谱ID列表',
          data: null,
        });
        return;
      }

      if (!baby_age_months || baby_age_months < 6 || baby_age_months > 36) {
        res.status(400).json({
          code: 400,
          message: '请提供有效的宝宝月龄（6-36个月）',
          data: null,
        });
        return;
      }

      // 批量转换
      const results = [];
      for (const recipeId of recipe_ids) {
        try {
          const adultRecipe = await this.recipeService.getRecipeDetail(recipeId);
          const result = await this.transformService.transformToBabyVersion(
            adultRecipe,
            baby_age_months,
            { includeNutrition: include_nutrition !== false }
          );
          results.push(result);
        } catch (err) {
          logger.error('Failed to transform recipe in batch', { recipeId, error: err });
          results.push({ success: false, recipe_id: recipeId, error: '转换失败' });
        }
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          total: recipe_ids.length,
          results,
        },
      });
    } catch (error) {
      logger.error('Failed to batch transform recipes', { error });
      res.status(500).json({
        code: 500,
        message: '批量转换失败',
        data: null,
      });
    }
  };

  // 根据即将过期食材推荐菜谱
  suggestByInventory = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const result = await this.recipeService.suggestByInventory(userId);
      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to suggest by inventory', { error });
      res.status(500).json({
        code: 500,
        message: '获取推荐失败',
        data: null,
      });
    }
  };

  // 获取同步烹饪时间线
  getTimeline = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { baby_age_months } = req.body;

      if (!baby_age_months || baby_age_months < 6 || baby_age_months > 36) {
        res.status(400).json({
          code: 400,
          message: '请提供有效的宝宝月龄（6-36个月）',
          data: null,
        });
        return;
      }

      // 获取成人食谱
      const adultRecipe = await this.recipeService.getRecipeDetail(id);

      // 先转换为宝宝版
      const transformResult = await this.transformService.transformToBabyVersion(
        adultRecipe,
        baby_age_months,
        { includeNutrition: false, includeSyncCooking: false }
      );

      if (!transformResult.success || !transformResult.baby_version) {
        res.status(500).json({
          code: 500,
          message: '生成宝宝版失败，无法生成时间线',
          data: null,
        });
        return;
      }

      // 生成时间线
      const timeline = this.timelineService.generateTimeline(
        adultRecipe,
        transformResult.baby_version,
        baby_age_months
      );

      res.json({
        code: 200,
        message: 'success',
        data: timeline,
      });
    } catch (error) {
      logger.error('Failed to generate timeline', { error });
      res.status(500).json({
        code: 500,
        message: '生成同步烹饪时间线失败',
        data: null,
      });
    }
  };
}
