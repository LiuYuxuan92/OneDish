import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { weeklyReviewController } from '../controllers/weeklyReview.controller';

const router = Router();

router.use(authenticate);

// GET /weekly - 获取本周回顾
router.get('/weekly', weeklyReviewController.getWeeklyReview);

// POST /weekly/regenerate - 重新生成回顾
router.post('/weekly/regenerate', weeklyReviewController.regenerateWeeklyReview);

export default router;
