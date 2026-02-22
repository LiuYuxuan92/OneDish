import { Router, Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { ErrorCodes } from '../config/error-codes';

const router = Router();

router.post('/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, intent_type, freshness_required, user_tier, context, force_refresh } = req.body || {};
    if (!query || typeof query !== 'string') {
      throw createError('query is required', 400, ErrorCodes.BAD_REQUEST);
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
    res.json({
      code: 200,
      message: 'success',
      data: result,
      meta: {
        route: result.route_used,
      },
    });
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
