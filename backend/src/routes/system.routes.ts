/**
 * 系统路由 - 提供数据库健康检查和系统状态
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metrics.service';
import { authenticate } from '../middleware/auth';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      code: 403,
      message: '需要管理员权限',
      data: null,
    });
    return;
  }
  next();
}

const router = Router();

/**
 * GET /api/system/health
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: '简家厨API服务',
    version: '1.0.0',
  });
});

/**
 * GET /api/system/database
 * 数据库健康检查 - 生产环境仅返回基本状态
 */
router.get('/database', authenticate, requireAdmin, async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // 生产环境：仅返回基本状态信息
    if (isProduction) {
      let dbConnectionStatus = 'ok';
      try {
        await db.raw('SELECT 1');
      } catch (error) {
        dbConnectionStatus = 'error';
      }

      return res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connection: dbConnectionStatus,
        },
      });
    }

    // 开发环境：返回详细信息
    logger.info('开始数据库健康检查...');

    // 1. 获取各表数据计数
    const [
      recipesCount,
      usersCount,
      ingredientsCount,
      favoritesCount,
      mealPlansCount,
      shoppingListsCount,
    ] = await Promise.all([
      db('recipes').count('id as count').first(),
      db('users').count('id as count').first(),
      db('ingredients').count('id as count').first(),
      db('favorites').count('id as count').first(),
      db('meal_plans').count('id as count').first(),
      db('shopping_lists').count('id as count').first(),
    ]);

    // 2. 仅返回轻量汇总信息，避免暴露明细并降低查询开销
    const recipeTotal = parseInt(String(recipesCount?.count || 0), 10);

    // 3. 检查数据库连接
    let dbConnectionStatus = 'connected';
    try {
      await db.raw('SELECT 1');
    } catch (error) {
      dbConnectionStatus = 'error';
    }

    // 4. 汇总报告
    const report = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        type: 'SQLite',
        file: './dev.sqlite3',
        connection: dbConnectionStatus,
      },
      counts: {
        recipes: parseInt(String(recipesCount?.count || 0), 10),
        users: parseInt(String(usersCount?.count || 0), 10),
        ingredients: parseInt(String(ingredientsCount?.count || 0), 10),
        favorites: parseInt(String(favoritesCount?.count || 0), 10),
        mealPlans: parseInt(String(mealPlansCount?.count || 0), 10),
        shoppingLists: parseInt(String(shoppingListsCount?.count || 0), 10),
      },
      recipes: {
        total: recipeTotal,
      },
    };

    logger.info('数据库健康检查完成', {
      totalRecipes: report.recipes.total,
    });

    res.json(report);
  } catch (error) {
    logger.error('数据库健康检查失败', { error });
    res.status(500).json({
      status: 'error',
      message: '数据库检查失败',
      error: String(error),
    });
  }
});

/**
 * GET /api/system/stats
 * 系统统计信息
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    // 获取今日日期
    const today = new Date().toISOString().split('T')[0];

    // 统计数据
    const [
      totalRecipes,
      totalUsers,
      todayMealPlans,
      totalShoppingItems,
    ] = await Promise.all([
      db('recipes').count('id as count').first(),
      db('users').count('id as count').first(),
      db('meal_plans').where('date', today).count('id as count').first(),
      db('shopping_lists').count('id as count').first(),
    ]);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats: {
        totalRecipes: parseInt(String(totalRecipes?.count || 0), 10),
        totalUsers: parseInt(String(totalUsers?.count || 0), 10),
        todayMealPlans: parseInt(String(todayMealPlans?.count || 0), 10),
        totalShoppingItems: parseInt(String(totalShoppingItems?.count || 0), 10),
      },
    });
  } catch (error) {
    logger.error('获取系统统计失败', { error });
    res.status(500).json({
      status: 'error',
      message: '获取统计失败',
    });
  }
});

/**
 * POST /api/v1/system/metrics/ai-cost/drill
 * 告警演练辅助：手动推进 AI 成本指标（仅用于演练）
 */
router.post('/metrics/ai-cost/drill', authenticate, requireAdmin, (req, res) => {
  const amountRaw = Number(req.body?.amount);
  const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0.002;
  metricsService.inc('onedish_ai_cost_usd_total', { provider: 'drill', endpoint: 'manual', tier: 'drill' }, amount);
  res.json({
    code: 200,
    message: 'success',
    data: { metric: 'onedish_ai_cost_usd_total', amount },
  });
});

export default router;
