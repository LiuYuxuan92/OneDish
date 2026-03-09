import { Request, Response } from 'express';
import { weeklyReviewService } from '../services/weeklyReview.service';
import { logger } from '../utils/logger';

export class WeeklyReviewController {
  /**
   * GET /api/v1/feeding-reviews/weekly
   * 获取本周回顾
   */
  getWeeklyReview = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const weekStart = req.query.week_start ? String(req.query.week_start) : undefined;
      const childId = req.query.child_id ? String(req.query.child_id) : undefined;

      // 验证日期格式（如果提供了）
      if (weekStart && !this.isValidDate(weekStart)) {
        return res.status(400).json({
          code: 400,
          message: 'INVALID_DATE_FORMAT',
          data: null,
        });
      }

      const result = await weeklyReviewService.getWeeklyReview(userId, weekStart, childId);

      if (!result.review) {
        return res.status(404).json({
          code: 404,
          message: 'NO_DATA',
          data: null,
        });
      }

      return res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to get weekly review', { error });
      return res.status(500).json({
        code: 500,
        message: '获取周回顾失败',
        data: null,
      });
    }
  };

  /**
   * POST /api/v1/feeding-reviews/weekly/regenerate
   * 重新生成回顾
   */
  regenerateWeeklyReview = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { week_start, child_id } = req.body || {};

      // 验证必填参数
      if (!week_start) {
        return res.status(400).json({
          code: 400,
          message: 'MISSING_WEEK_START',
          data: null,
        });
      }

      // 验证日期格式
      if (!this.isValidDate(week_start)) {
        return res.status(400).json({
          code: 400,
          message: 'INVALID_DATE_FORMAT',
          data: null,
        });
      }

      // 验证日期范围（不超过7天）
      const weekEnd = this.getWeekEnd(week_start);
      if (!weekEnd) {
        return res.status(400).json({
          code: 400,
          message: 'INVALID_DATE_RANGE',
          data: null,
        });
      }

      const result = await weeklyReviewService.regenerateWeeklyReview(userId, week_start, child_id);

      return res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error: any) {
      if (error?.message === 'INVALID_SCOPE') {
        return res.status(400).json({
          code: 400,
          message: 'INVALID_SCOPE',
          data: null,
        });
      }
      logger.error('Failed to regenerate weekly review', { error });
      return res.status(500).json({
        code: 500,
        message: '重新生成周回顾失败',
        data: null,
      });
    }
  };

  private isValidDate(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private getWeekEnd(weekStart: string): string | null {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 7) return null;
    
    return end.toISOString().split('T')[0];
  }
}

export const weeklyReviewController = new WeeklyReviewController();
