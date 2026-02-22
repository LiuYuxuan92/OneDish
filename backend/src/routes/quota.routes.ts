import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { quotaService } from '../services/quota.service';

const router = Router();

router.get('/status', optionalAuth, (req, res) => {
  const userId = req.user?.userId || req.user?.id || `anon_${req.ip || 'unknown'}`;
  const tier = (req.user?.tier as 'free' | 'pro' | 'enterprise') || 'free';

  res.json({
    code: 200,
    message: 'success',
    data: quotaService.getStatus(userId, tier),
  });
});

export default router;
