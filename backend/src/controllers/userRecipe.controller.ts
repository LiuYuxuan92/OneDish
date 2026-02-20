import { Request, Response } from 'express';
import { UserRecipeService } from '../services/userRecipe.service';
import { logger } from '../utils/logger';

export class UserRecipeController {
  private service: UserRecipeService;

  constructor() {
    this.service = new UserRecipeService();
  }

  // 保存搜索结果到我的菜谱
  save = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const result = await this.service.saveFromSearch(userId, req.body);
      res.json({ code: 200, message: '保存成功', data: result });
    } catch (error) {
      logger.error('Failed to save user recipe', { error });
      res.status(500).json({ code: 500, message: '保存失败', data: null });
    }
  };

  // 获取我的菜谱列表
  getList = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const result = await this.service.getUserRecipes(userId, Number(page), Number(limit));
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get user recipes', { error });
      res.status(500).json({ code: 500, message: '获取菜谱列表失败', data: null });
    }
  };

  // 获取详情
  getDetail = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      const result = await this.service.getUserRecipeDetail(userId, id);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get user recipe detail', { error });
      res.status(404).json({ code: 404, message: '菜谱不存在', data: null });
    }
  };

  // 删除菜谱
  delete = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      await this.service.deleteUserRecipe(userId, id);
      res.json({ code: 200, message: '删除成功', data: null });
    } catch (error) {
      logger.error('Failed to delete user recipe', { error });
      res.status(500).json({ code: 500, message: '删除失败', data: null });
    }
  };
}
