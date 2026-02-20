import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';

const router = Router();
const ingredientController = new IngredientController();

// 获取食材列表（无需认证）
router.get('/', ingredientController.getIngredients);

export default router;
