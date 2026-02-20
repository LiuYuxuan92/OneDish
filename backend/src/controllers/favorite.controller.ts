import { Request, Response } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { logger } from '../utils/logger';

export class FavoriteController {
  private favoriteService: FavoriteService;

  constructor() {
    this.favoriteService = new FavoriteService();
  }

  // 添加收藏
  addFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipe_id } = req.body;

      const result = await this.favoriteService.addFavorite(userId, recipe_id);

      res.json({
        code: 200,
        message: '收藏成功',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to add favorite', { error });
      res.status(500).json({
        code: 500,
        message: '收藏失败',
        data: null,
      });
    }
  };

  // 取消收藏
  removeFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipeId } = req.params;

      await this.favoriteService.removeFavorite(userId, recipeId);

      res.json({
        code: 200,
        message: '取消收藏成功',
        data: null,
      });
    } catch (error) {
      logger.error('Failed to remove favorite', { error });
      res.status(500).json({
        code: 500,
        message: '取消收藏失败',
        data: null,
      });
    }
  };

  // 获取收藏列表
  getFavorites = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.favoriteService.getFavorites(
        userId,
        Number(page),
        Number(limit)
      );

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get favorites', { error });
      res.status(500).json({
        code: 500,
        message: '获取收藏列表失败',
        data: null,
      });
    }
  };

  // 检查是否已收藏
  checkFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { recipeId } = req.params;

      const isFavorited = await this.favoriteService.checkFavorite(userId, recipeId);

      res.json({
        code: 200,
        message: 'success',
        data: { is_favorited: isFavorited },
      });
    } catch (error) {
      logger.error('Failed to check favorite', { error });
      res.status(500).json({
        code: 500,
        message: '检查收藏状态失败',
        data: null,
      });
    }
  };
}
