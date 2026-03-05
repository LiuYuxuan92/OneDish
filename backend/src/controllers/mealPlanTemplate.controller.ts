import { Request, Response } from 'express';
import { MealPlanTemplateService } from '../services/mealPlanTemplate.service';
import { logger } from '../utils/logger';

export class MealPlanTemplateController {
  private service: MealPlanTemplateService;

  constructor() {
    this.service = new MealPlanTemplateService();
  }

  // 发布周计划为模板
  publishTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { title, description, planData, babyAgeStartMonths, babyAgeEndMonths, tags, isPublic } = req.body;

      if (!title || !planData) {
        res.status(400).json({
          code: 400,
          message: '缺少必要参数：title, planData',
          data: null,
        });
        return;
      }

      const template = await this.service.publishTemplate({
        userId,
        title,
        description,
        planData,
        babyAgeStartMonths,
        babyAgeEndMonths,
        tags,
        isPublic,
      });

      res.json({
        code: 200,
        message: '模板发布成功',
        data: template,
      });
    } catch (error) {
      logger.error('Failed to publish template', { error });
      res.status(500).json({
        code: 500,
        message: '模板发布失败',
        data: null,
      });
    }
  };

  // 浏览公开模板
  browseTemplates = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.user_id; // 可选的认证用户
      const { babyAgeMonths, tags, creatorUserId, page, pageSize } = req.query;

      const result = await this.service.browseTemplates({
        babyAgeMonths: babyAgeMonths ? Number(babyAgeMonths) : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        creatorUserId: creatorUserId as string,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
      });

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to browse templates', { error });
      res.status(500).json({
        code: 500,
        message: '获取模板列表失败',
        data: null,
      });
    }
  };

  // 获取单个模板详情
  getTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const template = await this.service.getTemplate(templateId);

      if (!template) {
        res.status(404).json({
          code: 404,
          message: '模板不存在',
          data: null,
        });
        return;
      }

      res.json({
        code: 200,
        message: 'success',
        data: template,
      });
    } catch (error) {
      logger.error('Failed to get template', { error });
      res.status(500).json({
        code: 500,
        message: '获取模板详情失败',
        data: null,
      });
    }
  };

  // 克隆模板
  cloneTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { templateId } = req.params;

      const result = await this.service.cloneTemplate(userId, templateId);

      res.json({
        code: 200,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to clone template', { error });
      res.status(500).json({
        code: 500,
        message: error.message || '克隆模板失败',
        data: null,
      });
    }
  };

  // 删除模板
  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { templateId } = req.params;

      await this.service.deleteTemplate(userId, templateId);

      res.json({
        code: 200,
        message: '删除成功',
        data: null,
      });
    } catch (error: any) {
      logger.error('Failed to delete template', { error });
      res.status(500).json({
        code: 500,
        message: error.message || '删除模板失败',
        data: null,
      });
    }
  };
}
