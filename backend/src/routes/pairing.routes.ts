/**
 * 一菜两吃配对 API 路由
 * 提供菜谱生成、营养分析等功能
 */

import { Router } from 'express';
import { RecipePairingEngine, BatchRecipeGenerator } from '../utils/recipe-pairing-engine';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/pairing/generate
 * 根据成人菜谱生成宝宝版
 */
router.post('/generate', async (req, res) => {
  try {
    const { adultRecipe, targetAge = '1-2岁' } = req.body;

    if (!adultRecipe) {
      return res.status(400).json({
        code: 400,
        message: '缺少成人菜谱数据',
        data: null,
      });
    }

    // 使用配对引擎生成宝宝版
    const babyVersion = RecipePairingEngine.generateBabyVersion(adultRecipe, targetAge);

    // 生成同步烹饪建议
    const syncCooking = RecipePairingEngine.generateSyncCookingTips(
      adultRecipe.steps || [],
      babyVersion.steps
    );

    res.json({
      code: 200,
      message: '生成成功',
      data: {
        adult_version: adultRecipe,
        baby_version: babyVersion,
        sync_cooking: syncCooking,
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
    let result = ingredients;
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

    // 生成ID
    const id = `recipe_${Date.now()}`;
    
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
