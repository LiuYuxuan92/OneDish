import { Router, Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { ErrorCodes } from '../config/error-codes';
import { idempotencyService } from '../services/idempotency.service';

const router = Router();

router.post('/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, intent_type, freshness_required, user_tier, context, force_refresh } = req.body || {};
    if (!query || typeof query !== 'string') {
      throw createError('query is required', 400, ErrorCodes.BAD_REQUEST);
    }

    const idemKey = (req.header('Idempotency-Key') || '').trim();
    const idemTtlSec = Number(process.env.IDEMPOTENCY_TTL_SEC || 600);
    if (idemKey) {
      const begin = await idempotencyService.begin('search-resolve', idemKey, req.body || {}, idemTtlSec);
      if (begin.state === 'replay') {
        const replayData = await idempotencyService.replay('search-resolve', idemKey);
        if (replayData) {
          res.setHeader('X-Idempotency-Replayed', 'true');
          res.json(replayData);
          return;
        }
      }
      if (begin.state === 'conflict') {
        throw createError('idempotency key is in-flight or payload conflict', 409, ErrorCodes.CONFLICT);
      }
    }

    const result = await searchService.resolve({
      query,
      intent_type,
      freshness_required,
      user_tier,
      context,
      force_refresh,
      user_id: req.user?.userId || req.user?.id || `anon_${req.ip || 'unknown'}`,
    });

    res.locals.routeUsed = result.route_used;
    const payload = {
      code: 200,
      message: 'success',
      data: result,
      meta: {
        route: result.route_used,
      },
    };

    if (idemKey) {
      await idempotencyService.complete('search-resolve', idemKey, req.body || {}, payload, idemTtlSec);
    }

    res.json(payload);
  } catch (error) {
    logger.error('Search resolve error:', error);
    throw error;
  }
});

// 统一搜索API
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const keyword = req.query.keyword as string;

    if (!keyword) {
      throw createError('请提供搜索关键词', 400, ErrorCodes.BAD_REQUEST);
    }

    const result = await searchService.search(keyword);

    res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('Search error:', error);
    throw error;
  }
});

// 指定来源搜索
router.get('/source/:source', async (req: Request, res: Response): Promise<void> => {
  try {
    const keyword = req.query.keyword as string;
    const source = req.params.source as 'local' | 'tianxing' | 'ai';

    if (!keyword) {
      throw createError('请提供搜索关键词', 400, ErrorCodes.BAD_REQUEST);
    }

    if (!['local', 'tianxing', 'ai'].includes(source)) {
      throw createError('无效的搜索来源', 400, ErrorCodes.BAD_REQUEST);
    }

    const results = await searchService.searchFromSource(keyword, source);

    res.json({
      code: 200,
      message: 'success',
      data: {
        results,
        source,
        total: results.length,
      },
    });
  } catch (error) {
    logger.error('Search error:', error);
    throw error;
  }
});

export default router;
