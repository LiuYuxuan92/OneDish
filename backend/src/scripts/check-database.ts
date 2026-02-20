/**
 * 数据库健康检查脚本
 * 用于检查菜谱数据是否完整保存
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

async function checkDatabase() {
  logger.info('开始检查数据库...');

  try {
    // 1. 检查菜谱表结构和数据
    const recipesCount = await db('recipes').count('id as count').first();
    logger.info(`📊 菜谱总数: ${recipesCount?.count || 0}`);

    // 2. 获取所有菜谱并检查数据完整性
    const recipes = await db('recipes').select('*');
    
    logger.info('\n📋 菜谱数据检查:');
    logger.info('='.repeat(60));

    let completeCount = 0;
    let incompleteCount = 0;

    for (const recipe of recipes) {
      const issues: string[] = [];

      // 检查基本字段
      if (!recipe.name) issues.push('缺少名称');
      if (!recipe.type) issues.push('缺少类型');
      if (!recipe.prep_time) issues.push('缺少准备时间');
      if (!recipe.difficulty) issues.push('缺少难度');

      // 检查 adult_version
      let adultVersion = null;
      try {
        adultVersion = JSON.parse(recipe.adult_version || '{}');
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
      let babyVersion = null;
      try {
        babyVersion = JSON.parse(recipe.baby_version || '{}');
        if (!babyVersion.ingredients || babyVersion.ingredients.length === 0) {
          issues.push('宝宝版食材为空');
        }
        if (!babyVersion.steps || babyVersion.steps.length === 0) {
          issues.push('宝宝版步骤为空');
        }
      } catch (e) {
        issues.push('宝宝版数据解析失败');
      }

      // 输出检查结果
      if (issues.length === 0) {
        completeCount++;
        logger.info(`✅ ${recipe.name} - 数据完整`);
      } else {
        incompleteCount++;
        logger.warn(`⚠️  ${recipe.name} - ${issues.join(', ')}`);
      }
    }

    logger.info('='.repeat(60));
    logger.info(`\n📈 检查结果:`);
    logger.info(`  完整数据: ${completeCount} 条`);
    logger.info(`  存在问题: ${incompleteCount} 条`);
    logger.info(`  总计: ${recipes.length} 条`);

    // 3. 检查其他表
    const usersCount = await db('users').count('id as count').first();
    const ingredientsCount = await db('ingredients').count('id as count').first();
    const favoritesCount = await db('favorites').count('id as count').first();
    const mealPlansCount = await db('meal_plans').count('id as count').first();
    const shoppingListsCount = await db('shopping_lists').count('id as count').first();

    logger.info('\n📊 其他表数据:');
    logger.info(`  用户: ${usersCount?.count || 0}`);
    logger.info(`  食材: ${ingredientsCount?.count || 0}`);
    logger.info(`  收藏: ${favoritesCount?.count || 0}`);
    logger.info(`  餐计划: ${mealPlansCount?.count || 0}`);
    logger.info(`  购物清单: ${shoppingListsCount?.count || 0}`);

    // 4. 输出数据库配置
    logger.info('\n🔧 数据库配置:');
    logger.info(`  类型: SQLite`);
    logger.info(`  文件: ./dev.sqlite3`);

    logger.info('\n✅ 数据库检查完成!');

    // 返回检查结果
    return {
      success: incompleteCount === 0,
      totalRecipes: recipes.length,
      completeRecipes: completeCount,
      incompleteRecipes: incompleteCount,
    };

  } catch (error) {
    logger.error('数据库检查失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// 运行检查
if (require.main === module) {
  checkDatabase()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('检查失败:', error);
      process.exit(1);
    });
}

export { checkDatabase };
