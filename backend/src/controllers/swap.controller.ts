import { Request, Response } from 'express';
import { SwapService } from '../services/swap.service';
import { logger } from '../utils/logger';

export class SwapController {
  private swapService: SwapService;

  constructor() {
    this.swapService = new SwapService();
  }

  /**
   * 智能换菜 API
   * POST /api/v1/recipes/swap
   * Body: { current_recipe_id, baby_age_months, preferred_categories }
   * Headers: Authorization (optional)
   */
  swapRecipe = async (req: Request, res: Response) => {
    try {
      const { current_recipe_id, baby_age_months, preferred_categories } = req.body;

      if (!current_recipe_id) {
        res.status(400).json({
          code: 400,
          message: '缺少当前菜谱ID (current_recipe_id)',
          data: null,
        });
        return;
      }

      // 从认证信息中获取 user_id（如果有）
      const userId = (req as any).user?.user_id;

      const result = await this.swapService.swapRecipe({
        current_recipe_id,
        user_id: userId,
        baby_age_months: baby_age_months ? Number(baby_age_months) : undefined,
        preferred_categories,
      });

      if (!result) {
        res.status(404).json({
          code: 404,
          message: '未找到合适的替换菜谱',
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
      logger.error('Failed to swap recipe', { error });
      res.status(500).json({
        code: 500,
        message: '换菜失败，请稍后重试',
        data: null,
      });
    }
  };
}
