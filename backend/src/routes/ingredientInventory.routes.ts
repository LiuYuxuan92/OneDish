import { Router } from 'express';
import { IngredientInventoryController } from '../controllers/ingredientInventory.controller';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';

const router = Router();
const controller = new IngredientInventoryController(db);

// 所有路由需要认证
router.use(authenticate);

// 获取用户食材库存
router.get('/', controller.getInventory.bind(controller));

// 添加食材到库存
router.post('/', controller.addInventory.bind(controller));

// 更新食材库存
router.put('/:id', controller.updateInventory.bind(controller));

// 删除食材库存
router.delete('/:id', controller.deleteInventory.bind(controller));

// 批量删除食材库存
router.post('/batch-delete', controller.batchDeleteInventory.bind(controller));

// 获取即将过期的食材
router.get('/expiring', controller.getExpiringItems.bind(controller));

export default router;
