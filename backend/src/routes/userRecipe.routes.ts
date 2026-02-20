import { Router } from 'express';
import { UserRecipeController } from '../controllers/userRecipe.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new UserRecipeController();

// 所有路由需要认证
router.use(authenticate);

router.post('/', controller.save);
router.get('/', controller.getList);
router.get('/:id', controller.getDetail);
router.delete('/:id', controller.delete);

export default router;
