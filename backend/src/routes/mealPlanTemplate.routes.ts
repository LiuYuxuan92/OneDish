import { Router } from 'express';
import { MealPlanTemplateController } from '../controllers/mealPlanTemplate.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();
const controller = new MealPlanTemplateController();

router.get('/', optionalAuth, controller.browseTemplates);
router.get('/:templateId', optionalAuth, controller.getTemplate);

router.use(authenticate);
router.post('/', controller.createTemplate);
router.post('/:templateId/apply', controller.applyTemplate);
router.delete('/:templateId', controller.deleteTemplate);

export default router;
