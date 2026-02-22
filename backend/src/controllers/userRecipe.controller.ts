import { Request, Response } from 'express';
import { UserRecipeService } from '../services/userRecipe.service';
import { logger } from '../utils/logger';

export class UserRecipeController {
  private service: UserRecipeService;

  constructor() {
    this.service = new UserRecipeService();
  }

  createDraft = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const result = await this.service.createDraft(userId, req.body);
      res.json({ code: 200, message: '草稿已创建', data: result });
    } catch (error) {
      logger.error('Failed to create draft', { error });
      res.status(500).json({ code: 500, message: '创建失败', data: null });
    }
  };

  updateDraft = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      const result = await this.service.upsertDraft(userId, id, req.body);
      res.json({ code: 200, message: '草稿已更新', data: result });
    } catch (error) {
      logger.error('Failed to update draft', { error });
      res.status(400).json({ code: 400, message: '更新失败', data: null });
    }
  };

  submit = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      const result = await this.service.submitForReview(userId, id);
      res.json({ code: 200, message: '已提交审核', data: result });
    } catch (error: any) {
      logger.error('Failed to submit recipe', { error });
      res.status(400).json({ code: 400, message: error?.message || '提交失败', data: null });
    }
  };

  review = async (req: Request, res: Response) => {
    try {
      const role = (req as any).user?.role;
      if (role !== 'admin') {
        return res.status(403).json({ code: 403, message: '仅管理员可审核', data: null });
      }

      const { id } = req.params;
      const { action, reason } = req.body;
      const result = await this.service.reviewRecipe(id, action, reason);
      res.json({ code: 200, message: '审核完成', data: result });
    } catch (error: any) {
      logger.error('Failed to review recipe', { error });
      res.status(400).json({ code: 400, message: error?.message || '审核失败', data: null });
    }
  };

  listPublished = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.user_id;
      const { page = 1, limit = 20 } = req.query;
      const result = await this.service.getPublishedRecipes(Number(page), Number(limit), userId);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to list published recipes', { error });
      res.status(500).json({ code: 500, message: '获取发布广场失败', data: null });
    }
  };

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

  getDetail = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.user_id;
      const { id } = req.params;
      const result = await this.service.getUserRecipeDetail(userId, id);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get user recipe detail', { error });
      res.status(404).json({ code: 404, message: '菜谱不存在', data: null });
    }
  };

  favorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      const result = await this.service.toggleFavorite(userId, id);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to favorite recipe', { error });
      res.status(400).json({ code: 400, message: '收藏操作失败', data: null });
    }
  };

  save = this.createDraft;

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
