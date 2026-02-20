import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const recipeController = new RecipeController();

// 根据即将过期食材推荐菜谱（需认证）
router.get('/suggest-by-inventory', authenticate, recipeController.suggestByInventory);

// 获取今日推荐（无需认证）
router.get('/daily', recipeController.getDailyRecommendation);

// 搜索菜谱（无需认证）
router.get('/', recipeController.searchRecipes);

// 获取分类
router.get('/categories', recipeController.getCategories);

// 批量转换食谱（无需认证）
router.post('/transform/batch', recipeController.batchTransformRecipes);

// 将平铺搜索结果（AI/联网菜谱）转换为宝宝版（无需认证）
router.post('/transform/raw', recipeController.transformRawRecipe);

// 获取同步烹饪时间线（无需认证）
router.post('/:id/timeline', recipeController.getTimeline);

// 转换成人食谱为宝宝版（无需认证）
router.post('/:id/transform', recipeController.transformRecipe);

// 获取详情（无需认证）
router.get('/:id', recipeController.getRecipeDetail);

export default router;
