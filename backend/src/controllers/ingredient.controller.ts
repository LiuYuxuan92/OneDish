import { Request, Response } from 'express';
import { IngredientService } from '../services/ingredient.service';
import { logger } from '../utils/logger';

export class IngredientController {
  private ingredientService: IngredientService;

  constructor() {
    this.ingredientService = new IngredientService();
  }

  // 获取食材列表
  getIngredients = async (req: Request, res: Response) => {
    try {
      const { category, keyword } = req.query;

      const result = await this.ingredientService.getIngredients({
        category: category as string,
        keyword: keyword as string,
      });

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get ingredients', { error });
      res.status(500).json({
        code: 500,
        message: '获取食材列表失败',
        data: null,
      });
    }
  };
}
