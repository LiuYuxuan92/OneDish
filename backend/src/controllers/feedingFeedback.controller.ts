import { Request, Response } from 'express';
import { feedingFeedbackService } from '../services/feedingFeedback.service';
import { logger } from '../utils/logger';

export class FeedingFeedbackController {
  createFeedback = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipe_id, meal_plan_id, baby_age_at_that_time, accepted_level, allergy_flag, note } = req.body || {};

      const feedback = await feedingFeedbackService.createFeedback({
        user_id: userId,
        recipe_id,
        meal_plan_id,
        baby_age_at_that_time,
        accepted_level,
        allergy_flag,
        note,
      });

      return res.json({ code: 200, message: '记录成功', data: feedback });
    } catch (error: any) {
      if (['INVALID_USER_ID', 'INVALID_RECIPE_ID', 'INVALID_ACCEPTED_LEVEL', 'INVALID_BABY_AGE', 'INVALID_NOTE'].includes(error?.message)) {
        return res.status(400).json({ code: 400, message: error.message, data: null });
      }

      logger.error('Failed to create feeding feedback', { error });
      return res.status(500).json({ code: 500, message: '提交用餐反馈失败', data: null });
    }
  };

  listRecentFeedbacks = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const limit = Number(req.query.limit || 10);
      const recipeId = req.query.recipe_id ? String(req.query.recipe_id) : undefined;

      const items = await feedingFeedbackService.listRecentFeedbacks({
        user_id: userId,
        limit,
        recipe_id: recipeId,
      });

      return res.json({ code: 200, message: 'success', data: { items } });
    } catch (error) {
      logger.error('Failed to list feeding feedbacks', { error });
      return res.status(500).json({ code: 500, message: '获取用餐反馈失败', data: null });
    }
  };
}
