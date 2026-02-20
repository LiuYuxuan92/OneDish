import { Request, Response } from 'express';
import { MealPlanService } from '../services/mealPlan.service';
import { logger } from '../utils/logger';

export class MealPlanController {
  private mealPlanService: MealPlanService;

  constructor() {
    this.mealPlanService = new MealPlanService();
  }

  // 获取一周计划
  getWeeklyPlan = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { start_date, end_date } = req.query;

      const result = await this.mealPlanService.getWeeklyPlan(
        userId,
        start_date as string,
        end_date as string
      );

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get weekly plan', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        code: 500,
        message: '获取一周计划失败',
        data: null,
      });
    }
  };

  // 设置餐食计划
  setMealPlan = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { date, meal_type, recipe_id, servings = 2 } = req.body;

      const result = await this.mealPlanService.setMealPlan({
        user_id: userId,
        plan_date: date,
        meal_type,
        recipe_id,
        servings,
      });

      res.json({
        code: 200,
        message: '设置成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to set meal plan', { error });
      res.status(500).json({
        code: 500,
        message: '设置餐食计划失败',
        data: null,
      });
    }
  };

  // 删除餐食计划
  deleteMealPlan = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { planId } = req.params;

      await this.mealPlanService.deleteMealPlan(userId, planId);

      res.json({
        code: 200,
        message: '删除成功',
        data: null,
      });
    } catch (error) {
      logger.error('Failed to delete meal plan', { error });
      res.status(500).json({
        code: 500,
        message: '删除餐食计划失败',
        data: null,
      });
    }
  };

  // 标记餐食已完成
  markMealComplete = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { planId } = req.params;

      await this.mealPlanService.markMealCompleted(userId, planId);

      res.json({
        code: 200,
        message: '标记成功，库存已更新',
        data: null,
      });
    } catch (error) {
      logger.error('Failed to mark meal complete', { error });
      res.status(500).json({
        code: 500,
        message: '标记失败',
        data: null,
      });
    }
  };

  // 生成一周智能计划
  generateWeeklyPlan = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { start_date, preferences, baby_age_months, exclude_ingredients } = req.body;

      // 合并新参数到 preferences
      const mergedPrefs = {
        ...preferences,
        baby_age_months: baby_age_months || preferences?.baby_age_months,
        exclude_ingredients: exclude_ingredients || preferences?.exclude_ingredients,
      };

      const result = await this.mealPlanService.generateWeeklyPlan(
        userId,
        start_date,
        mergedPrefs
      );

      res.json({
        code: 200,
        message: '生成成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to generate weekly plan', { error });
      res.status(500).json({
        code: 500,
        message: '生成一周计划失败',
        data: null,
      });
    }
  };
}
