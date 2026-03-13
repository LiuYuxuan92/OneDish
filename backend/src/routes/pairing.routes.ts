/**
 * 一菜两吃配对 API 路由
 * 提供菜谱生成、营养分析等功能
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { BatchRecipeGenerator } from '../utils/recipe-pairing-engine';
import { RecipeTransformService } from '../services/recipe-transform.service';
import { AITransformService } from '../services/ai-transform.service';
import { quotaService } from '../services/quota.service';
import { metricsService } from '../services/metrics.service';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { optionalAuth } from '../middleware/auth';
import { billingService } from '../services/billing.service';

const router = Router();

/**
 * POST /api/v1/pairing/generate
 * 根据成人菜谱生成宝宝版
 * @query ai=true - 使用AI生成，否则使用规则引擎
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { adultRecipe, targetAge = '1-2岁', babyAgeMonths } = req.body;
    const useAI = req.query.ai === 'true' || req.body.useAI === true;

    if (!adultRecipe) {
      return res.status(400).json({
        code: 400,
        message: '缺少成人菜谱数据',
        data: null,
      });
    }

    // 解析宝宝月龄
    const ageMonths = babyAgeMonths || parseAgeRange(targetAge);

    // 如果请求使用 AI
    if (useAI) {
      try {
        // 获取用户配额（如果有用户信息）
        const userId = req.body.userId || 'anonymous';
        const tier = req.body.tier || 'free';

        // 检查 AI 配额
        const quotaCheck = await quotaService.consume(userId, tier, 'ai');
        
        if (!quotaCheck.allowed) {
          logger.warn('AI quota exceeded', { userId, reason: quotaCheck.reason });
          
          // AI 配额不足，回退到规则引擎
          logger.info('Falling back to rule-based transformation due to quota limit');
          const fallbackResult = await fallbackToRuleEngine(adultRecipe, ageMonths);
          
          return res.json({
            code: 200,
            message: 'AI配额已用完，使用规则引擎生成',
            data: {
              ...fallbackResult,
              fallback_reason: 'ai_quota_exceeded',
            },
          });
        }

        // 使用 AI 转换服务
        const aiService = new AITransformService();
        const aiResult = await aiService.generateBabyVersionWithAI(adultRecipe, ageMonths, {
          babyAgeMonths: ageMonths,
          familySize: req.body.familySize || 2,
          includeNutrition: true,
          includeSyncCooking: true,
        });

        if (aiResult.success && aiResult.baby_version) {
          // 记录指标
          metricsService.inc('onedish_ai_cost_usd_total', { provider: 'minimax' }, aiResult.costUsd || 0.002);

          logger.info('AI transformation successful', { 
            recipeId: adultRecipe.id, 
            babyAgeMonths: ageMonths 
          });

          return res.json({
            code: 200,
            message: 'AI生成成功',
            data: {
              adult_version: adultRecipe,
              baby_version: aiResult.baby_version,
              sync_cooking: aiResult.sync_cooking,
              nutrition_info: aiResult.nutrition_info,
              ai_generated: true,
            },
          });
        }

        // AI 生成失败，回退到规则引擎
        logger.warn('AI transformation failed, falling back to rule engine', { 
          recipeId: adultRecipe.id, 
          error: aiResult.error 
        });

        const fallbackResult = await fallbackToRuleEngine(adultRecipe, ageMonths);
        
        return res.json({
          code: 200,
          message: 'AI生成失败，已使用规则引擎',
          data: {
            ...fallbackResult,
            fallback_reason: 'ai_generation_failed',
          },
        });

      } catch (aiError) {
        // AI 出错，回退到规则引擎
        logger.error('AI transformation error, falling back', { 
          recipeId: adultRecipe.id, 
          error: aiError instanceof Error ? aiError.message : 'Unknown' 
        });

        const fallbackResult = await fallbackToRuleEngine(adultRecipe, ageMonths);
        
        return res.json({
          code: 200,
          message: 'AI生成出错，已使用规则引擎',
          data: {
            ...fallbackResult,
            fallback_reason: 'ai_error',
          },
        });
      }
    }

    // 默认使用规则引擎
    const ruleResult = await fallbackToRuleEngine(adultRecipe, ageMonths);

    res.json({
      code: 200,
      message: '生成成功',
      data: {
        adult_version: adultRecipe,
        baby_version: ruleResult.baby_version,
        sync_cooking: ruleResult.sync_cooking,
        nutrition_info: ruleResult.nutrition_info,
        ai_generated: false,
      },
    });
  } catch (error) {
    logger.error('生成配对菜谱失败', { error });
    res.status(500).json({
      code: 500,
      message: '生成失败',
      data: null,
    });
  }
});

/**
 * 回退到规则引擎转换
 */
async function fallbackToRuleEngine(adultRecipe: any, babyAgeMonths: number) {
  const transformService = new RecipeTransformService();
  
  // 构建 Recipe 对象 (使用类型断言)
  const recipe = {
    id: adultRecipe.id || `temp_${Date.now()}`,
    name: adultRecipe.name,
    type: (adultRecipe.type || 'dinner') as any,
    prep_time: adultRecipe.prep_time || 30,
    difficulty: (adultRecipe.difficulty || '简单') as any,
    servings: adultRecipe.servings || '2人份',
    adult_version: {
      ingredients: adultRecipe.ingredients || [],
      steps: adultRecipe.steps || [],
      seasonings: adultRecipe.seasonings || [],
    },
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const result = await transformService.transformToBabyVersion(recipe, babyAgeMonths, {
    familySize: 2,
    includeNutrition: true,
    includeSyncCooking: true,
  });

  return {
    baby_version: result.baby_version,
    sync_cooking: result.sync_cooking,
    nutrition_info: result.nutrition_info,
    cached: result.cached,
  };
}

/**
 * 解析年龄范围字符串
 */
function parseAgeRange(ageRange: string): number {
  // 尝试从 "1-2岁" 这样的格式中提取月龄
  const match = ageRange.match(/(\d+)-?(\d*)?岁/);
  if (match) {
    const years = parseInt(match[1], 10);
    return years * 12;
  }
  
  // 尝试直接提取数字
  const numMatch = ageRange.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10) * 12;
  }

  // 默认返回12个月
  return 12;
}

/**
 * POST /api/v1/pairing/generate-ai
 * 使用 AI 生成宝宝版食谱（专用接口）
 * @body { recipe_id: string, baby_age_months: number, use_ai?: boolean }
 */
router.post('/generate-ai', optionalAuth, async (req, res, next) => {
  try {
    const { recipe_id, baby_age_months, use_ai = true } = req.body;
    const authedUserId = (req as any).user?.user_id || null;
    const userId = authedUserId || req.body.userId || req.body.user_id || 'anonymous';

    if (!recipe_id) {
      return res.status(400).json({
        code: 400,
        message: '缺少 recipe_id 参数',
        data: null,
      });
    }

    if (!baby_age_months) {
      return res.status(400).json({
        code: 400,
        message: '缺少 baby_age_months 参数',
        data: null,
      });
    }

    // 如果不适用 AI，回退到规则引擎
    if (!use_ai) {
      const ruleResult = await fallbackToRuleEngineById(recipe_id, baby_age_months);
      if (!ruleResult) {
        return res.status(404).json({
          code: 404,
          message: '菜谱不存在',
          data: null,
        });
      }
      return res.json({
        code: 200,
        message: '使用规则引擎生成',
        data: {
          adult_version: ruleResult.adult_recipe,
          baby_version: ruleResult.baby_version,
          sync_cooking: ruleResult.sync_cooking,
          nutrition_info: ruleResult.nutrition_info,
          ai_generated: false,
        },
      });
    }

    // 1. 获取菜谱详情
    const recipe = await db('recipes').where('id', recipe_id).first();
    
    if (!recipe) {
      return res.status(404).json({
        code: 404,
        message: '菜谱不存在',
        data: null,
      });
    }

    // 解析菜谱数据
    const adultRecipe = {
      id: recipe.id,
      name: recipe.name,
      type: recipe.type,
      prep_time: recipe.prep_time,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      adult_version: typeof recipe.adult_version === 'string' 
        ? JSON.parse(recipe.adult_version) 
        : recipe.adult_version,
      is_active: recipe.is_active,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };

    // 2. 优先检查会员专属额度；若无可用额度，则回退到原有通用 AI 配额
    let billingQuotaAvailable = false;
    if (authedUserId) {
      const billingQuotaStatus = await billingService.getFeatureQuotaStatus(authedUserId, 'ai_baby_recipe');
      billingQuotaAvailable = billingQuotaStatus.available;
    }

    if (!billingQuotaAvailable) {
      const tier = req.body.tier || 'free';
      const quotaCheck = await quotaService.consume(userId, tier, 'ai');

      if (!quotaCheck.allowed) {
        logger.warn('AI quota exceeded', { userId, reason: quotaCheck.reason });

        const fallbackResult = await fallbackToRuleEngine(adultRecipe, baby_age_months);
        return res.json({
          code: 200,
          message: 'AI配额已用完，使用规则引擎生成',
          data: {
            adult_version: adultRecipe,
            baby_version: fallbackResult.baby_version,
            sync_cooking: fallbackResult.sync_cooking,
            nutrition_info: fallbackResult.nutrition_info,
            ai_generated: false,
            fallback_reason: 'ai_quota_exceeded',
          },
        });
      }
    }

    // 3. 创建 AI 转换服务（优先使用用户自定义配置）
    const aiService = await AITransformService.createWithUserConfig(userId);
    
    // 4. 调用 AI 转换
    const aiResult = await aiService.generateBabyVersionWithAI(adultRecipe, baby_age_months, {
      babyAgeMonths: baby_age_months,
      familySize: req.body.familySize || 2,
      includeNutrition: true,
      includeSyncCooking: true,
    });

    if (aiResult.success && aiResult.baby_version) {
      if (billingQuotaAvailable && authedUserId) {
        await billingService.consumeFeatureQuota({
          userId: authedUserId,
          featureCode: 'ai_baby_recipe',
          modelCode: 'ai_transform:auto',
          estimatedCostUsd: aiResult.costUsd,
          metadata: {
            recipe_id,
            baby_age_months,
          },
        });
      }

      // 记录指标
      metricsService.inc('onedish_ai_cost_usd_total', { provider: 'user_custom' }, aiResult.costUsd || 0.002);

      logger.info('AI generation successful', { 
        recipeId: recipe_id, 
        baby_age_months,
        userId,
      });

      return res.json({
        code: 200,
        message: 'AI生成成功',
        data: {
          adult_version: adultRecipe,
          baby_version: aiResult.baby_version,
          sync_cooking: aiResult.sync_cooking,
          nutrition_info: aiResult.nutrition_info,
          ai_generated: true,
          cached: aiResult.cached || false,
          cost_usd: aiResult.costUsd,
        },
      });
    }

    // AI 生成失败，回退到规则引擎
    logger.warn('AI generation failed, falling back to rule engine', { 
      recipeId: recipe_id, 
      error: aiResult.error 
    });

    const fallbackResult = await fallbackToRuleEngine(adultRecipe, baby_age_months);
    
    return res.json({
      code: 200,
      message: 'AI生成失败，已使用规则引擎',
      data: {
        adult_version: adultRecipe,
        baby_version: fallbackResult.baby_version,
        sync_cooking: fallbackResult.sync_cooking,
        nutrition_info: fallbackResult.nutrition_info,
        ai_generated: false,
        fallback_reason: 'ai_generation_failed',
      },
    });

  } catch (error) {
    logger.error('Generate AI baby version failed', { error });
    res.status(500).json({
      code: 500,
      message: '生成失败',
      data: null,
    });
  }
});

/**
 * 根据菜谱 ID 回退到规则引擎转换
 */
async function fallbackToRuleEngineById(recipeId: string, babyAgeMonths: number) {
  const recipe = await db('recipes').where('id', recipeId).first();
  
  if (!recipe) {
    return null;
  }

  const adultRecipe = {
    id: recipe.id,
    name: recipe.name,
    type: recipe.type,
    prep_time: recipe.prep_time,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    adult_version: typeof recipe.adult_version === 'string' 
      ? JSON.parse(recipe.adult_version) 
      : recipe.adult_version,
    is_active: recipe.is_active,
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  } as any;

  const transformService = new RecipeTransformService();
  const result = await transformService.transformToBabyVersion(adultRecipe, babyAgeMonths, {
    familySize: 2,
    includeNutrition: true,
    includeSyncCooking: true,
  });

  return result;
}

/**
 * GET /api/v1/pairing/batch-generate
 * 批量生成配对菜谱模板
 */
router.get('/batch-generate', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    
    const recipes = BatchRecipeGenerator.generateBatch(count);

    res.json({
      code: 200,
      message: '批量生成成功',
      data: {
        count: recipes.length,
        recipes,
      },
    });
  } catch (error) {
    logger.error('批量生成失败', { error });
    res.status(500).json({
      code: 500,
      message: '批量生成失败',
      data: null,
    });
  }
});

/**
 * POST /api/v1/pairing/analyze-nutrition
 * 分析菜谱营养成分
 */
router.post('/analyze-nutrition', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        code: 400,
        message: '缺少食材列表',
        data: null,
      });
    }

    const analysis = {
      protein: 0,
      vitamins: [] as string[],
      minerals: [] as string[],
      benefits: [] as string[],
    };

    // 营养分析逻辑
    const nutritionMap: Record<string, any> = {
      '鸡肉': { protein: 2, benefits: ['优质蛋白', '促进生长发育'] },
      '猪肉': { protein: 2, benefits: ['补铁', 'B族维生素'] },
      '牛肉': { protein: 3, benefits: ['高蛋白', '补铁补锌'] },
      '鱼': { protein: 2, benefits: ['DHA', '促进大脑发育'] },
      '虾': { protein: 2, benefits: ['高钙', '低脂高蛋白'] },
      '蛋': { protein: 2, benefits: ['卵磷脂', '促进大脑发育'] },
      '豆腐': { protein: 1, benefits: ['植物蛋白', '补钙'] },
      '胡萝卜': { vitamins: ['维生素A'], benefits: ['护眼'] },
      '南瓜': { vitamins: ['维生素A'], benefits: ['护眼', '膳食纤维'] },
      '菠菜': { vitamins: ['维生素C', '叶酸'], benefits: ['补铁'] },
      '番茄': { vitamins: ['维生素C', '番茄红素'], benefits: ['抗氧化'] },
      '西兰花': { vitamins: ['维生素C'], benefits: ['增强免疫力'] },
    };

    for (const ingredient of ingredients) {
      const name = ingredient.name || ingredient;
      for (const [key, value] of Object.entries(nutritionMap)) {
        if (name.includes(key)) {
          analysis.protein += value.protein || 0;
          if (value.vitamins) analysis.vitamins.push(...value.vitamins);
          if (value.benefits) analysis.benefits.push(...value.benefits);
        }
      }
    }

    // 去重
    analysis.vitamins = [...new Set(analysis.vitamins)];
    analysis.benefits = [...new Set(analysis.benefits)];

    res.json({
      code: 200,
      message: '分析成功',
      data: analysis,
    });
  } catch (error) {
    logger.error('营养分析失败', { error });
    res.status(500).json({
      code: 500,
      message: '分析失败',
      data: null,
    });
  }
});

/**
 * GET /api/v1/pairing/ingredients
 * 获取支持的食材列表
 */
router.get('/ingredients', async (req, res) => {
  try {
    const { type, age } = req.query;

    const ingredients = {
      meat: [
        { name: '鸡肉', minAge: 6, suitable: ['泥', '碎', '块'] },
        { name: '猪肉', minAge: 6, suitable: ['泥', '碎', '块'] },
        { name: '牛肉', minAge: 8, suitable: ['泥', '碎'] },
        { name: '排骨', minAge: 9, suitable: ['肉泥', '肉末'] },
      ],
      seafood: [
        { name: '鲈鱼', minAge: 10, suitable: ['鱼泥', '鱼肉碎'] },
        { name: '鳕鱼', minAge: 8, suitable: ['鱼泥'] },
        { name: '三文鱼', minAge: 8, suitable: ['鱼泥'] },
        { name: '虾', minAge: 10, suitable: ['虾泥', '虾仁碎'] },
      ],
      vegetable: [
        { name: '胡萝卜', minAge: 6, suitable: ['泥', '碎', '丝'] },
        { name: '南瓜', minAge: 6, suitable: ['泥'] },
        { name: '土豆', minAge: 6, suitable: ['泥', '碎'] },
        { name: '西兰花', minAge: 6, suitable: ['泥', '花朵碎'] },
        { name: '菠菜', minAge: 6, suitable: ['泥', '碎'] },
        { name: '番茄', minAge: 8, suitable: ['泥', '碎'] },
        { name: '豆腐', minAge: 8, suitable: ['泥', '小块'] },
      ],
      grain: [
        { name: '大米', minAge: 6, suitable: ['粥', '软饭'] },
        { name: '小米', minAge: 6, suitable: ['粥'] },
        { name: '面条', minAge: 8, suitable: ['碎面条'] },
      ],
    };

    // 根据年龄筛选
    let result: any = ingredients;
    if (age) {
      const ageNum = parseInt(age as string);
      result = Object.fromEntries(
        Object.entries(ingredients).map(([category, items]) => [
          category,
          items.filter((item: any) => item.minAge <= ageNum),
        ])
      );
    }

    // 根据类型筛选
    if (type && ingredients[type as keyof typeof ingredients]) {
      result = { [type as string]: ingredients[type as keyof typeof ingredients] };
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: result,
    });
  } catch (error) {
    logger.error('获取食材列表失败', { error });
    res.status(500).json({
      code: 500,
      message: '获取失败',
      data: null,
    });
  }
});

/**
 * GET /api/v1/pairing/age-guidelines
 * 获取年龄段指导建议
 */
router.get('/age-guidelines', async (req, res) => {
  try {
    const guidelines = {
      '6-8m': {
        name: '6-8个月',
        texture: '细腻泥状，无颗粒',
        feeding: '每天1-2次辅食，以奶为主',
        tips: ['从单一食材开始', '观察过敏反应', '不加盐和糖'],
      },
      '8-10m': {
        name: '8-10个月',
        texture: '稍粗泥状，可有小颗粒',
        feeding: '每天2次辅食，逐渐增量',
        tips: ['引入多种食材', '训练咀嚼', '可尝试手指食物'],
      },
      '10-12m': {
        name: '10-12个月',
        texture: '碎末状，软烂小颗粒',
        feeding: '每天3次辅食，接近正餐',
        tips: ['增加食物种类', '练习自主进食', '可少量加盐'],
      },
      '12-18m': {
        name: '1-1.5岁',
        texture: '小颗粒，可咀嚼的软烂颗粒',
        feeding: '每天3餐+2次点心',
        tips: ['与家人同桌吃饭', '少盐少糖', '多样化饮食'],
      },
      '18-24m': {
        name: '1.5-2岁',
        texture: '小块，约1cm大小软块',
        feeding: '每天3餐+2次点心',
        tips: ['培养饮食习惯', '控制零食', '注意营养均衡'],
      },
      '2-3y': {
        name: '2-3岁',
        texture: '小块，约2cm大小',
        feeding: '规律三餐',
        tips: ['独立进食', '不挑食', '注意饮食安全'],
      },
    };

    res.json({
      code: 200,
      message: '获取成功',
      data: guidelines,
    });
  } catch (error) {
    logger.error('获取年龄段指导失败', { error });
    res.status(500).json({
      code: 500,
      message: '获取失败',
      data: null,
    });
  }
});

/**
 * POST /api/v1/pairing/save
 * 保存生成的配对菜谱到数据库
 */
router.post('/save', async (req, res) => {
  try {
    const recipe = req.body;

    if (!recipe.name || !recipe.adult_version || !recipe.baby_version) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要字段',
        data: null,
      });
    }

    // 使用随机 UUID 避免并发写入时 ID 冲突
    const id = `recipe_${randomUUID()}`;
    
    const recipeData = {
      id,
      ...recipe,
      is_paired: true,
      main_ingredients: JSON.stringify(recipe.main_ingredients || []),
      adult_version: JSON.stringify(recipe.adult_version),
      baby_version: JSON.stringify(recipe.baby_version),
      sync_cooking: JSON.stringify(recipe.sync_cooking || {}),
      cooking_tips: JSON.stringify(recipe.cooking_tips || []),
      tags: JSON.stringify(recipe.tags || []),
      category: JSON.stringify(recipe.category || []),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db('recipes').insert(recipeData);

    res.json({
      code: 200,
      message: '保存成功',
      data: { id },
    });
  } catch (error) {
    logger.error('保存配对菜谱失败', { error });
    res.status(500).json({
      code: 500,
      message: '保存失败',
      data: null,
    });
  }
});

export default router;
