import { Request, Response } from 'express';
import { MealPlanTemplateService } from '../services/mealPlanTemplate.service';
import { logger } from '../utils/logger';

export class MealPlanTemplateController {
  private service: MealPlanTemplateService;

  constructor() {
    this.service = new MealPlanTemplateService();
  }

  createTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { title, description, planData, tags, isPublic, sourceStartDate, sourceEndDate } = req.body;

      if (!title) {
        res.status(400).json({
          code: 400,
          message: '缺少必要参数：title',
          data: null,
        });
        return;
      }

      const template = await this.service.createTemplate({
        userId,
        title,
        description,
        planData,
        tags,
        isPublic,
        sourceStartDate,
        sourceEndDate,
      });

      res.json({
        code: 200,
        message: '模板保存成功',
        data: template,
      });
    } catch (error: any) {
      logger.error('Failed to create template', { error });
      res.status(500).json({
        code: 500,
        message: error.message || '模板保存失败',
        data: null,
      });
    }
  };

  browseTemplates = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.user_id;
      const { creatorUserId, page, pageSize, mine, includePublic } = req.query;

      const shouldUseMine = String(mine || '').toLowerCase() === 'true';
      const effectiveCreatorUserId = shouldUseMine ? userId : (creatorUserId as string | undefined);

      const result = await this.service.browseTemplates({
        creatorUserId: effectiveCreatorUserId,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
        includePublic: String(includePublic || '').toLowerCase() === 'true',
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

  getTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.user_id;
      const { templateId } = req.params;
      const template = await this.service.getTemplate(templateId, userId);

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

  applyTemplate = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { templateId } = req.params;
      const { targetStartDate } = req.body || {};

      if (!targetStartDate) {
        res.status(400).json({ code: 400, message: '缺少必要参数：targetStartDate', data: null });
        return;
      }

      const result = await this.service.applyTemplate(userId, templateId, { targetStartDate });

      res.json({
        code: 200,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to apply template', { error });
      res.status(500).json({
        code: 500,
        message: error.message || '套用模板失败',
        data: null,
      });
    }
  };

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
