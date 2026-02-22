import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();
const metricsController = new MetricsController();

router.post('/events', optionalAuth, metricsController.ingestEvent);

export default router;
