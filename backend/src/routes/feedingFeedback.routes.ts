import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { FeedingFeedbackController } from '../controllers/feedingFeedback.controller';

const router = Router();
const controller = new FeedingFeedbackController();

router.use(authenticate);
router.post('/', controller.createFeedback);
router.get('/recent', controller.listRecentFeedbacks);
router.get('/summary', controller.listRecipeSummaries);

export default router;
