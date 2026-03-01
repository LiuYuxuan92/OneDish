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

  createWeeklyShare = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const result = await this.mealPlanService.createWeeklyShare(userId);
      res.json({ code: 200, message: '生成周计划共享链接成功', data: result });
    } catch (error) {
      logger.error('Failed to create weekly share', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '生成周计划共享链接失败', data: null });
    }
  };

  joinWeeklyShare = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { invite_code } = req.body || {};
      const result = await this.mealPlanService.joinWeeklyShare(String(invite_code || '').trim(), userId);
      res.json({ code: 200, message: '加入共享周计划成功', data: result });
    } catch (error) {
      logger.error('Failed to join weekly share', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '加入共享周计划失败', data: null });
    }
  };

  getSharedWeeklyPlan = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { shareId } = req.params;
      const { start_date, end_date } = req.query;
      const result = await this.mealPlanService.getSharedWeeklyPlan(shareId, userId, start_date as string, end_date as string);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get shared weekly plan', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '获取共享周计划失败', data: null });
    }
  };

  markSharedMealComplete = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { shareId, planId } = req.params;
      const result = await this.mealPlanService.markSharedMealCompleted(shareId, userId, planId);
      res.json({ code: 200, message: '标记成功', data: result });
    } catch (error) {
      logger.error('Failed to mark shared meal complete', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '标记失败', data: null });
    }
  };

  regenerateWeeklyShareInvite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { shareId } = req.params;
      const result = await this.mealPlanService.regenerateWeeklyShareInvite(shareId, userId);
      res.json({ code: 200, message: '邀请码已更新', data: result });
    } catch (error) {
      logger.error('Failed to regenerate weekly share invite', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '更新邀请码失败', data: null });
    }
  };

  removeWeeklyShareMember = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { shareId, memberId } = req.params;
      const result = await this.mealPlanService.removeWeeklyShareMember(shareId, userId, memberId);
      res.json({ code: 200, message: '成员已移除', data: result });
    } catch (error) {
      logger.error('Failed to remove weekly share member', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '移除成员失败', data: null });
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

  // 三餐智能推荐 V1（A/B 方案）
  getSmartRecommendations = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const {
        meal_type = 'all-day',
        baby_age_months,
        max_prep_time,
        inventory = [],
        exclude_ingredients = [],
      } = req.body || {};

      const result = await this.mealPlanService.getSmartRecommendations(userId, {
        meal_type,
        baby_age_months,
        max_prep_time,
        inventory,
        exclude_ingredients,
      });

      res.json({
        code: 200,
        message: '生成成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to generate smart recommendations', { error });
      res.status(500).json({
        code: 500,
        message: '生成智能推荐失败',
        data: null,
      });
    }
  };

  submitRecommendationFeedback = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { meal_type, selected_option, reject_reason, event_time } = req.body || {};
      const allowedMealTypes = new Set(['breakfast', 'lunch', 'dinner', 'all-day']);
      const allowedOptions = new Set(['A', 'B', 'NONE']);

      if (!allowedMealTypes.has(String(meal_type))) {
        return res.status(400).json({ code: 400, message: '非法 meal_type', data: null });
      }
      if (!allowedOptions.has(String(selected_option))) {
        return res.status(400).json({ code: 400, message: '非法 selected_option', data: null });
      }

      const result = await this.mealPlanService.submitRecommendationFeedback(userId, {
        meal_type,
        selected_option,
        reject_reason,
        event_time,
      });

      return res.json({ code: 200, message: '记录成功', data: result });
    } catch (error: any) {
      if (error?.message === 'INVALID_EVENT_TIME') {
        return res.status(400).json({ code: 400, message: 'event_time 非法', data: null });
      }
      logger.error('Failed to submit recommendation feedback', { error });
      return res.status(500).json({ code: 500, message: '反馈记录失败', data: null });
    }
  };

  getRecommendationFeedbackStats = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const days = Number(req.query.days || 7);
      const result = await this.mealPlanService.getRecommendationFeedbackStats(userId, days);
      return res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get recommendation feedback stats', { error });
      return res.status(500).json({ code: 500, message: '获取反馈统计失败', data: null });
    }
  };

  recomputeRecommendationLearning = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { meal_types } = req.body || {};
      const mealTypes = Array.isArray(meal_types)
        ? meal_types.filter((x: string) => ['breakfast', 'lunch', 'dinner'].includes(String(x)))
        : undefined;

      const result = await this.mealPlanService.recomputeRecommendationLearning({
        userIds: [userId],
        mealTypes,
      });

      return res.json({ code: 200, message: '重算完成', data: result });
    } catch (error) {
      logger.error('Failed to recompute recommendation learning', { error });
      return res.status(500).json({ code: 500, message: '推荐学习重算失败', data: null });
    }
  };
}
