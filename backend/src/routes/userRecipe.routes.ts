import { Router } from 'express';
import { UserRecipeController } from '../controllers/userRecipe.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new UserRecipeController();

// 公共发布广场
router.get('/published', controller.listPublished);
router.get('/published/:id', controller.getDetail);

// 需要登录
router.use(authenticate);

router.post('/', controller.createDraft);
router.put('/:id', controller.updateDraft);
router.post('/:id/submit', controller.submit);
router.post('/:id/review', controller.review); // V1: 管理员模拟接口
router.post('/admin/recompute-quality', controller.recomputeQuality);
router.get('/admin/recommend-pool', controller.listRecommendPool);
router.post('/:id/favorite', controller.favorite);
router.get('/', controller.getList);
router.get('/:id', controller.getDetail);
router.delete('/:id', controller.delete);

export default router;
