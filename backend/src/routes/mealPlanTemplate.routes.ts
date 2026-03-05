import { Router } from 'express';
import { MealPlanTemplateController } from '../controllers/mealPlanTemplate.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();
const controller = new MealPlanTemplateController();

// 公开浏览模板（无需认证）
router.get('/', optionalAuth, controller.browseTemplates);

// 获取单个模板详情（公开）
router.get('/:templateId', optionalAuth, controller.getTemplate);

// 以下需要认证
router.use(authenticate);

// 发布模板
router.post('/', controller.publishTemplate);

// 克隆模板
router.post('/:templateId/clone', controller.cloneTemplate);

// 删除模板
router.delete('/:templateId', controller.deleteTemplate);

export default router;
