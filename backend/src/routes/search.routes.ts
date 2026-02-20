import { Router, Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';

const router = Router();

// 统一搜索API
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const keyword = req.query.keyword as string;

    if (!keyword) {
      res.status(400).json({
        code: 400,
        message: '请提供搜索关键词',
        data: null,
      });
      return;
    }

    const result = await searchService.search(keyword);

    res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      code: 500,
      message: '搜索失败，请稍后重试',
      data: null,
    });
  }
});

// 指定来源搜索
router.get('/source/:source', async (req: Request, res: Response): Promise<void> => {
  try {
    const keyword = req.query.keyword as string;
    const source = req.params.source as 'local' | 'tianxing' | 'ai';

    if (!keyword) {
      res.status(400).json({
        code: 400,
        message: '请提供搜索关键词',
        data: null,
      });
      return;
    }

    if (!['local', 'tianxing', 'ai'].includes(source)) {
      res.status(400).json({
        code: 400,
        message: '无效的搜索来源',
        data: null,
      });
      return;
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
    res.status(500).json({
      code: 500,
      message: '搜索失败，请稍后重试',
      data: null,
    });
  }
});

export default router;
