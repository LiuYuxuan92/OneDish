/**
 * 直接导入配对菜谱到数据库
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

async function importPairedRecipes() {
  logger.info('开始导入配对菜谱...');

  const pairedRecipes = [
    {
      id: 'recipe_006',
      name: '番茄牛腩 / 牛肉蔬菜泥',
      name_en: 'Braised Beef Brisket / Beef Veggie Puree',
      type: 'dinner',
      category: JSON.stringify(['肉类', '牛肉', '一菜两吃', '补铁']),
      prep_time: 20,
      cook_time: 90,
      total_time: 110,
      difficulty: '中等',
      servings: '3人份',
      main_ingredients: JSON.stringify([
        { name: '牛腩', amount_adult: '500g', amount_baby: '30g' },
        { name: '番茄', amount_adult: '3个', amount_baby: '1/4个' },
        { name: '胡萝卜', amount_adult: '1根', amount_baby: '30g' },
      ]),
      adult_version: JSON.stringify({
        name: '番茄牛腩',
        ingredients: [
          { name: '牛腩', amount: '500g', note: '切3cm方块' },
          { name: '番茄', amount: '3个', note: '切块' },
          { name: '胡萝卜', amount: '1根', note: '切滚刀块' },
        ],
        seasonings: [
          { name: '生抽', amount: '2勺' },
          { name: '料酒', amount: '2勺' },
        ],
        steps: [
          { step: 1, action: '牛腩切块焯水', time: 10 },
          { step: 2, action: '炒香番茄牛腩炖煮90分钟', time: 90 },
        ],
      }),
      baby_version: JSON.stringify({
        name: '牛肉蔬菜泥',
        age_range: '10-18个月',
        ingredients: [
          { name: '牛腩肉', amount: '30g' },
          { name: '胡萝卜', amount: '30g' },
        ],
        steps: [
          { step: 1, action: '取出炖好的牛肉和胡萝卜', time: 2 },
          { step: 2, action: '打成泥', time: 2 },
        ],
        nutrition_tips: '牛肉补铁，番茄维生素C促进吸收',
      }),
      sync_cooking: JSON.stringify({
        can_cook_together: true,
        time_saving: '共用炖煮过程',
      }),
      cooking_tips: JSON.stringify(['牛腩选肥瘦相间', '番茄分两次加']),
      tags: JSON.stringify(['牛肉', '番茄', '一菜两吃']),
      is_active: true,
    },
    {
      id: 'recipe_007',
      name: '白灼虾 / 虾泥粥',
      name_en: 'Boiled Shrimp / Shrimp Congee',
      type: 'lunch',
      category: JSON.stringify(['海鲜', '虾', '一菜两吃', '补钙']),
      prep_time: 10,
      cook_time: 15,
      total_time: 25,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '鲜虾', amount_adult: '400g', amount_baby: '3只虾肉' },
      ]),
      adult_version: JSON.stringify({
        name: '白灼虾',
        ingredients: [{ name: '鲜虾', amount: '400g' }],
        seasonings: [{ name: '生抽', amount: '2勺' }],
        steps: [
          { step: 1, action: '虾洗净剪须', time: 5 },
          { step: 2, action: '水开煮3分钟', time: 3 },
        ],
      }),
      baby_version: JSON.stringify({
        name: '虾泥粥',
        age_range: '10-18个月',
        ingredients: [{ name: '虾肉', amount: '3只' }, { name: '大米', amount: '30g' }],
        steps: [
          { step: 1, action: '虾去壳去虾线', time: 5 },
          { step: 2, action: '煮粥加入虾肉', time: 15 },
        ],
        allergy_alert: '虾是常见过敏原，首次少量尝试',
      }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['虾', '海鲜', '一菜两吃']),
      is_active: true,
    },
    {
      id: 'recipe_008',
      name: '番茄炒蛋 / 鸡蛋羹',
      name_en: 'Tomato Scrambled Eggs / Egg Custard',
      type: 'lunch',
      category: JSON.stringify(['蛋类', '快手', '一菜两吃']),
      prep_time: 5,
      cook_time: 10,
      total_time: 15,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '鸡蛋', amount_adult: '3个', amount_baby: '1个蛋黄' },
        { name: '番茄', amount_adult: '2个', amount_baby: '1/4个' },
      ]),
      adult_version: JSON.stringify({
        name: '番茄炒蛋',
        ingredients: [{ name: '鸡蛋', amount: '3个' }, { name: '番茄', amount: '2个' }],
        steps: [
          { step: 1, action: '炒蛋后盛出', time: 3 },
          { step: 2, action: '炒番茄加入炒蛋', time: 5 },
        ],
      }),
      baby_version: JSON.stringify({
        name: '番茄鸡蛋羹',
        age_range: '8-12个月',
        ingredients: [{ name: '蛋黄', amount: '1个' }, { name: '番茄', amount: '1/4个' }],
        steps: [
          { step: 1, action: '番茄压汁', time: 3 },
          { step: 2, action: '蒸蛋羹8分钟', time: 8 },
        ],
      }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['鸡蛋', '番茄', '快手']),
      is_active: true,
    },
    {
      id: 'recipe_009',
      name: '土豆烧牛肉 / 牛肉土豆泥',
      name_en: 'Braised Beef with Potatoes / Beef Potato Puree',
      type: 'dinner',
      category: JSON.stringify(['肉类', '牛肉', '一菜两吃']),
      prep_time: 15,
      cook_time: 75,
      total_time: 90,
      difficulty: '中等',
      servings: '3人份',
      main_ingredients: JSON.stringify([
        { name: '牛肉', amount_adult: '400g', amount_baby: '30g' },
        { name: '土豆', amount_adult: '2个', amount_baby: '50g' },
      ]),
      adult_version: JSON.stringify({ name: '土豆烧牛肉', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '牛肉土豆泥', age_range: '10-18个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['牛肉', '土豆']),
      is_active: true,
    },
    {
      id: 'recipe_010',
      name: '肉末茄子 / 茄子肉末粥',
      name_en: 'Eggplant with Minced Pork / Eggplant Pork Congee',
      type: 'lunch',
      category: JSON.stringify(['肉类', '茄子', '一菜两吃']),
      prep_time: 10,
      cook_time: 20,
      total_time: 30,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '猪肉末', amount_adult: '150g', amount_baby: '20g' },
        { name: '茄子', amount_adult: '2根', amount_baby: '30g' },
      ]),
      adult_version: JSON.stringify({ name: '肉末茄子', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '茄子肉末粥', age_range: '10-18个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['猪肉', '茄子']),
      is_active: true,
    },
    {
      id: 'recipe_011',
      name: '冬瓜排骨汤 / 冬瓜肉泥',
      name_en: 'Winter Melon Rib Soup / Winter Melon Puree',
      type: 'lunch',
      category: JSON.stringify(['汤类', '排骨', '一菜两吃']),
      prep_time: 15,
      cook_time: 60,
      total_time: 75,
      difficulty: '简单',
      servings: '3人份',
      main_ingredients: JSON.stringify([
        { name: '排骨', amount_adult: '400g', amount_baby: '2块' },
        { name: '冬瓜', amount_adult: '500g', amount_baby: '50g' },
      ]),
      adult_version: JSON.stringify({ name: '冬瓜排骨汤', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '冬瓜肉泥', age_range: '9-15个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['排骨', '冬瓜', '汤']),
      is_active: true,
    },
    {
      id: 'recipe_012',
      name: '韭菜鸡蛋饺子 / 鸡蛋菜泥',
      name_en: 'Chive Egg Dumplings / Egg Veggie Puree',
      type: 'lunch',
      category: JSON.stringify(['面食', '饺子', '一菜两吃']),
      prep_time: 30,
      cook_time: 15,
      total_time: 45,
      difficulty: '中等',
      servings: '3人份',
      main_ingredients: JSON.stringify([
        { name: '鸡蛋', amount_adult: '4个', amount_baby: '1个蛋黄' },
      ]),
      adult_version: JSON.stringify({ name: '韭菜鸡蛋饺子', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '蛋黄蔬菜泥', age_range: '8-12个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: false }),
      tags: JSON.stringify(['饺子', '鸡蛋']),
      is_active: true,
    },
    {
      id: 'recipe_013',
      name: '可乐鸡翅 / 鸡翅肉泥',
      name_en: 'Coca-Cola Chicken Wings / Chicken Puree',
      type: 'dinner',
      category: JSON.stringify(['肉类', '鸡翅', '一菜两吃']),
      prep_time: 15,
      cook_time: 30,
      total_time: 45,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '鸡翅', amount_adult: '10个', amount_baby: '2个' },
      ]),
      adult_version: JSON.stringify({ name: '可乐鸡翅', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '鸡翅肉泥', age_range: '9-15个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['鸡翅']),
      is_active: true,
    },
    {
      id: 'recipe_014',
      name: '红烧豆腐 / 豆腐泥',
      name_en: 'Braised Tofu / Tofu Puree',
      type: 'lunch',
      category: JSON.stringify(['豆制品', '一菜两吃', '素食']),
      prep_time: 10,
      cook_time: 15,
      total_time: 25,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '豆腐', amount_adult: '1块', amount_baby: '50g' },
      ]),
      adult_version: JSON.stringify({ name: '红烧豆腐', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '清蒸豆腐泥', age_range: '8-12个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: false }),
      tags: JSON.stringify(['豆腐', '素食']),
      is_active: true,
    },
    {
      id: 'recipe_015',
      name: '香菇滑鸡 / 鸡肉香菇泥',
      name_en: 'Chicken with Mushrooms / Chicken Mushroom Puree',
      type: 'dinner',
      category: JSON.stringify(['肉类', '鸡肉', '一菜两吃']),
      prep_time: 15,
      cook_time: 25,
      total_time: 40,
      difficulty: '简单',
      servings: '2人份',
      main_ingredients: JSON.stringify([
        { name: '鸡腿肉', amount_adult: '300g', amount_baby: '30g' },
        { name: '香菇', amount_adult: '100g', amount_baby: '20g' },
      ]),
      adult_version: JSON.stringify({ name: '香菇滑鸡', ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ name: '鸡肉香菇泥', age_range: '9-15个月', ingredients: [], steps: [] }),
      sync_cooking: JSON.stringify({ can_cook_together: true }),
      tags: JSON.stringify(['鸡肉', '香菇']),
      is_active: true,
    },
  ];

  try {
    // 清空现有菜谱
    await db('recipes').del();
    
    // 插入新数据
    await db('recipes').insert(pairedRecipes);
    
    logger.info(`✅ 成功导入 ${pairedRecipes.length} 个配对菜谱`);
    
    // 验证
    const count = await db('recipes').count('id as count').first();
    logger.info(`📊 当前数据库共有 ${count?.count} 个菜谱`);
  } catch (error) {
    logger.error('导入失败', { error });
    throw error;
  } finally {
    await db.destroy();
  }
}

importPairedRecipes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
