/**
 * 系统路由 - 提供数据库健康检查和系统状态
 */

import { Router } from 'express';
import { db } from '../config/database';
import { logger } from '../utils/logger';

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
router.get('/database', async (req, res) => {
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

    // 2. 获取菜谱数据并检查完整性
    const recipes = await db('recipes').select('*');
    const recipeDetails = recipes.map((recipe) => {
      const issues: string[] = [];

      // 检查基本字段
      if (!recipe.name) issues.push('缺少名称');
      if (!recipe.type) issues.push('缺少类型');
      if (!recipe.prep_time) issues.push('缺少准备时间');
      if (!recipe.difficulty) issues.push('缺少难度');

      // 检查 adult_version
      try {
        const adultVersion = JSON.parse(recipe.adult_version || '{}');
        if (!adultVersion.ingredients || adultVersion.ingredients.length === 0) {
          issues.push('成人版食材为空');
        }
        if (!adultVersion.steps || adultVersion.steps.length === 0) {
          issues.push('成人版步骤为空');
        }
      } catch (e) {
        issues.push('成人版数据解析失败');
      }

      // 检查 baby_version
      try {
        const babyVersion = JSON.parse(recipe.baby_version || '{}');
        if (!babyVersion.ingredients || babyVersion.ingredients.length === 0) {
          issues.push('宝宝版食材为空');
        }
        if (!babyVersion.steps || babyVersion.steps.length === 0) {
          issues.push('宝宝版步骤为空');
        }
      } catch (e) {
        issues.push('宝宝版数据解析失败');
      }

      return {
        id: recipe.id,
        name: recipe.name,
        isComplete: issues.length === 0,
        issues: issues.length > 0 ? issues : undefined,
      };
    });

    const completeRecipes = recipeDetails.filter((r) => r.isComplete).length;
    const incompleteRecipes = recipeDetails.filter((r) => !r.isComplete).length;

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
        total: recipes.length,
        complete: completeRecipes,
        incomplete: incompleteRecipes,
        details: recipeDetails,
      },
    };

    logger.info('数据库健康检查完成', {
      totalRecipes: report.recipes.total,
      complete: report.recipes.complete,
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
router.get('/stats', async (req, res) => {
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

export default router;
