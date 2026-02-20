import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 获取当前最大ID
  const maxRecipe = await knex('recipes').max('id as max').first();
  let idCounter = maxRecipe?.max ? parseInt(maxRecipe.max.replace('recipe_', '')) + 1 : 70;

  const recipes = [];
  const addRecipe = (recipe: any) => {
    recipes.push({ ...recipe, id: `recipe_${String(idCounter++).padStart(3, '0')}` });
  };

  // ========== 继续添加更多菜品 ==========

  addRecipe({
    name: '熘肝尖',
    name_en: 'Stir-Fried Liver',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肝', '鲁菜']),
    prep_time: 15,
    cook_time: 8,
    total_time: 23,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪肝', amount: '200g', note: '切片' },
        { name: '木耳', amount: '30g', note: '泡发' },
        { name: '黄瓜', amount: '1根', note: '切片' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '猪肝切片，用清水浸泡去血水', time: 10, tools: [], note: '' },
        { step: 2, action: '猪肝加淀粉腌制', time: 5, tools: [], note: '' },
        { step: 3, action: '炒猪肝变色盛出', time: 3, tools: [], note: '' },
        { step: 4, action: '炒配菜，加猪肝翻炒', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '猪肝', amount: '15g', note: '' }],
      steps: [
        { step: 1, action: '猪肝煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '压成泥', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '猪肝富含铁和维生素A',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['猪肝要浸泡去血水', '大火快炒']),
    tags: JSON.stringify(['熘肝尖', '猪肝', '鲁菜']),
    is_active: true,
  });

  addRecipe({
    name: '爆炒腰花',
    name_en: 'Stir-Fried Kidney',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪腰', '川菜']),
    prep_time: 20,
    cook_time: 8,
    total_time: 28,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪腰', amount: '2个', note: '' },
        { name: '青椒', amount: '1个', note: '' },
        { name: '红椒', amount: '1个', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '猪腰去膜，切花刀', time: 10, tools: [], note: '' },
        { step: 2, action: '加醋、盐腌制10分钟', time: 10, tools: [], note: '' },
        { step: 3, action: '炒腰花变色盛出', time: 5, tools: [], note: '' },
        { step: 4, action: '加青红椒翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '醋', amount: '1勺' },
        { name: '料酒', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '猪腰', amount: '15g', note: '' }],
      steps: [
        { step: 1, action: '猪腰煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '去膜切碎', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '猪腰富含蛋白质',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['腰花要切花刀', '大火快炒']),
    tags: JSON.stringify(['爆炒腰花', '猪腰', '川菜']),
    is_active: true,
  });

  addRecipe({
    name: '夫妻肺片',
    name_en: 'Couple Lung Slices',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛杂', '川菜']),
    prep_time: 30,
    cook_time: 40,
    total_time: 70,
    difficulty: '困难',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛腱子肉', amount: '300g', note: '' },
        { name: '牛百叶', amount: '200g', note: '' },
        { name: '牛心', amount: '100g', note: '' },
        { name: '花生碎', amount: '50g', note: '' },
        { name: '芝麻酱', amount: '2勺', note: '' },
        { name: '红油', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛腱子肉、牛杂分别煮熟', time: 40, tools: [], note: '' },
        { step: 2, action: '放凉切片', time: 10, tools: [], note: '' },
        { step: 3, action: '调红油调料', time: 5, tools: [], note: '' },
        { step: 4, action: '淋在牛杂上，撒花生碎', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '芝麻酱', amount: '2勺' },
        { name: '红油', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '牛腱子肉', amount: '20g', note: '' }],
      steps: [
        { step: 1, action: '牛肉煮熟', time: 30, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '牛肉富含蛋白质和铁',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['牛杂要煮烂', '调料要调匀']),
    tags: JSON.stringify(['夫妻肺片', '川菜', '牛杂']),
    is_active: true,
  });

  addRecipe({
    name: '辣子鸡丁',
    name_en: 'Spicy Diced Chicken',
    type: 'lunch',
    category: JSON.stringify(['肉类', '鸡肉', '川菜']),
    prep_time: 20,
    cook_time: 10,
    total_time: 30,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡胸肉', amount: '200g', note: '切丁' },
        { name: '干辣椒', amount: '30g', note: '' },
        { name: '花椒', amount: '1勺', note: '' },
        { name: '炸花生', amount: '50g', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡丁加盐淀粉腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒鸡丁至金黄', time: 5, tools: [], note: '' },
        { step: 3, action: '炒干辣椒花椒', time: 3, tools: [], note: '' },
        { step: 4, action: '加鸡丁、花生、葱段翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡胸肉', amount: '25g', note: '' },
        { name: '花生', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉煮熟切小块', time: 15, tools: [], note: '' },
        { step: 2, action: '花生压碎，混合', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '鸡肉配花生，蛋白质互补',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡丁要炸透', '干辣椒根据口味']),
    tags: JSON.stringify(['辣子鸡丁', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '鸡米芽菜',
    name_en: 'Chicken with Bean Sprouts',
    type: 'lunch',
    category: JSON.stringify(['肉类', '鸡肉', '川菜']),
    prep_time: 15,
    cook_time: 10,
    total_time: 25,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡胸肉', amount: '150g', note: '切末' },
        { name: '芽菜', amount: '100g', note: '' },
        { name: '青椒', amount: '1个', note: '切末' },
        { name: '干辣椒', amount: '5个', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉末炒散', time: 3, tools: [], note: '' },
        { step: 2, action: '加干辣椒炒香', time: 2, tools: [], note: '' },
        { step: 3, action: '放入芽菜、青椒翻炒', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '糖', amount: '1小勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡胸肉', amount: '20g', note: '' },
        { name: '芽菜', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、芽菜煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '芽菜富含维生素C',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['大火快炒', '芽菜要炒干']),
    tags: JSON.stringify(['鸡米芽菜', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '歌乐山辣子鸡',
    name_en: 'Geleshan Spicy Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '重庆']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡腿肉', amount: '300g', note: '斩块' },
        { name: '干辣椒', amount: '100g', note: '' },
        { name: '花椒', amount: '30g', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '蒜', amount: '5瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块加盐腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '油炸至金黄酥脆', time: 10, tools: ['锅'], note: '' },
        { step: 3, action: '炒干辣椒花椒姜蒜', time: 3, tools: [], note: '' },
        { step: 4, action: '放入鸡块翻炒均匀', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '鸡腿肉质细嫩',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡块要炸透', '干辣椒多点才够味']),
    tags: JSON.stringify(['辣子鸡', '重庆', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '烧鸡公',
    name_en: 'Braised Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '川菜']),
    prep_time: 20,
    cook_time: 30,
    total_time: 50,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '公鸡', amount: '1只', note: '约1000g' },
        { name: '干辣椒', amount: '50g', note: '' },
        { name: '花椒', amount: '30g', note: '' },
        { name: '豆瓣酱', amount: '3勺', note: '' },
        { name: '魔芋', amount: '200g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡洗净斩块', time: 10, tools: [], note: '' },
        { step: 2, action: '炒鸡块至水干', time: 10, tools: [], note: '' },
        { step: 3, action: '加豆瓣酱、干辣椒、花椒', time: 5, tools: [], note: '' },
        { step: 4, action: '加水焖20分钟', time: 20, tools: [], note: '' },
        { step: 5, action: '加魔芋煮5分钟', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '豆瓣酱', amount: '3勺' },
        { name: '酱油', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡肉', amount: '25g', note: '' },
        { name: '魔芋', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、魔芋煮烂', time: 25, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '魔芋富含膳食纤维',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡要选公的', '焖的时间要够']),
    tags: JSON.stringify(['烧鸡公', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '重庆辣子鸡',
    name_en: 'Chongqing Spicy Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '重庆']),
    prep_time: 25,
    cook_time: 15,
    total_time: 40,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡肉', amount: '400g', note: '斩块' },
        { name: '干辣椒', amount: '80g', note: '' },
        { name: '花椒', amount: '20g', note: '' },
        { name: '白芝麻', amount: '30g', note: '' },
        { name: '葱姜蒜', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉加盐腌制', time: 15, tools: [], note: '' },
        { step: 2, action: '炸至金黄酥脆', time: 10, tools: ['锅'], note: '' },
        { step: 3, action: '炒香调料', time: 3, tools: [], note: '' },
        { step: 4, action: '放入鸡块翻炒，撒芝麻', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '鸡肉高蛋白',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡肉要炸两次才脆', '芝麻增香']),
    tags: JSON.stringify(['重庆辣子鸡', '重庆', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '麻辣鸡丁',
    name_en: 'Spicy Diced Chicken',
    type: 'lunch',
    category: JSON.stringify(['肉类', '鸡肉', '川菜']),
    prep_time: 15,
    cook_time: 10,
    total_time: 25,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡胸肉', amount: '200g', note: '切丁' },
        { name: '花生', amount: '50g', note: '' },
        { name: '干辣椒', amount: '10个', note: '' },
        { name: '花椒', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡丁腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒鸡丁至变色', time: 4, tools: [], note: '' },
        { step: 3, action: '加辣椒、花椒', time: 3, tools: [], note: '' },
        { step: 4, action: '加花生翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '糖', amount: '1小勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡肉', amount: '20g', note: '' },
        { name: '花生', amount: '5g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '花生含优质脂肪',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡丁要嫩', '花生最后放']),
    tags: JSON.stringify(['麻辣鸡丁', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '干锅鸡',
    name_en: 'Dry Pot Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '干锅']),
    prep_time: 20,
    cook_time: 25,
    total_time: 45,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡肉', amount: '400g', note: '斩块' },
        { name: '土豆', amount: '1个', note: '切片' },
        { name: '莲藕', amount: '1节', note: '切片' },
        { name: '干辣椒', amount: '30g', note: '' },
        { name: '豆瓣酱', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、土豆、莲藕炸至金黄', time: 10, tools: ['锅'], note: '' },
        { step: 2, action: '炒豆瓣酱、干辣椒', time: 3, tools: [], note: '' },
        { step: 3, action: '放入所有食材翻炒', time: 5, tools: [], note: '' },
        { step: 4, action: '加调料翻炒均匀', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡肉', amount: '20g', note: '' },
        { name: '土豆', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、土豆煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '干锅风味浓郁',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['食材要炸透', '全程大火']),
    tags: JSON.stringify(['干锅鸡', '干锅', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '地锅鸡',
    name_en: 'Earth Pot Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '北方']),
    prep_time: 25,
    cook_time: 40,
    total_time: 65,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡肉', amount: '500g', note: '斩块' },
        { name: '面粉', amount: '200g', note: '' },
        { name: '土豆', amount: '2个', note: '切块' },
        { name: '青椒', amount: '2个', note: '' },
        { name: '豆瓣酱', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '和面，贴饼子', time: 20, tools: [], note: '' },
        { step: 2, action: '炒鸡肉加豆瓣酱', time: 10, tools: [], note: '' },
        { step: 3, action: '加水、土豆焖20分钟', time: 20, tools: [], note: '' },
        { step: 4, action: '放青椒，饼子贴在锅边', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡肉', amount: '25g', note: '' },
        { name: '土豆', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、土豆煮烂', time: 25, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '地锅鸡饼子有嚼劲',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['饼子要贴牢', '焖的时间要够']),
    tags: JSON.stringify(['地锅鸡', '北方', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '叫化鸡',
    name_en: 'Beggars Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '江苏']),
    prep_time: 30,
    cook_time: 120,
    total_time: 150,
    difficulty: '困难',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '三黄鸡', amount: '1只', note: '约1000g' },
        { name: '荷叶', amount: '1张', note: '' },
        { name: '泥土', amount: '500g', note: '' },
        { name: '五花肉', amount: '100g', note: '' },
        { name: '香菇', amount: '50g', note: '' },
        { name: '葱姜', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡腹中塞入五花肉、香菇、葱姜', time: 10, tools: [], note: '' },
        { step: 2, action: '用荷叶包好', time: 5, tools: [], note: '' },
        { step: 3, action: '裹上黄泥', time: 10, tools: [], note: '' },
        { step: 4, action: '埋入火堆烤2小时', time: 120, tools: [], note: '' },
        { step: 5, action: '敲开泥土', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉蒸熟', time: 30, tools: ['蒸锅'], note: '' },
        { step: 2, action: '去骨切碎', time: 5, tools: [], note: '' },
      ],
      nutrition_tips: '叫化鸡保持鸡肉原汁原味',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['泥要裹匀', '火候要掌握好']),
    tags: JSON.stringify(['叫化鸡', '江苏', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '盐焗鸡',
    name_en: 'Salt-Baked Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '客家']),
    prep_time: 20,
    cook_time: 45,
    total_time: 65,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '三黄鸡', amount: '1只', note: '约1000g' },
        { name: '粗盐', amount: '1000g', note: '' },
        { name: '八角', amount: '2个', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '葱', amount: '3根', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡洗净，葱姜塞入腹中', time: 5, tools: [], note: '' },
        { step: 2, action: '用油纸包好', time: 5, tools: [], note: '' },
        { step: 3, action: '盐炒热，放入鸡', time: 10, tools: [], note: '' },
        { step: 4, action: '小火焗45分钟', time: 45, tools: [], note: '' },
        { step: 5, action: '取出拆骨', time: 5, tools: [], note: '' },
      ],
      seasonings: [],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉蒸熟', time: 25, tools: [], note: '' },
        { step: 2, action: '去骨切块', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '盐焗鸡风味独特',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['盐要炒透', '小火焗']),
    tags: JSON.stringify(['盐焗鸡', '客家', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '东安子鸡',
    name_en: 'Dongan Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '湘菜']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '小母鸡', amount: '500g', note: '切块' },
        { name: '红椒', amount: '2个', note: '' },
        { name: '姜', amount: '10片', note: '' },
        { name: '醋', amount: '2勺', note: '' },
        { name: '花椒', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块焯水', time: 5, tools: [], note: '' },
        { step: 2, action: '炒姜、花椒', time: 3, tools: [], note: '' },
        { step: 3, action: '加鸡块翻炒', time: 5, tools: [], note: '' },
        { step: 4, action: '加醋、盐、红椒', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '醋', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 20, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '东安子鸡酸辣开胃',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['要用嫩鸡', '大火快炒']),
    tags: JSON.stringify(['东安子鸡', '湘菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '左宗棠鸡',
    name_en: 'General Tso Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '湘菜']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡腿肉', amount: '300g', note: '切块' },
        { name: '干辣椒', amount: '10个', note: '' },
        { name: '蒜', amount: '5瓣', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '糖', amount: '2勺', note: '' },
        { name: '醋', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块裹淀粉炸至金黄', time: 8, tools: ['锅'], note: '' },
        { step: 2, action: '炒蒜、干辣椒', time: 2, tools: [], note: '' },
        { step: 3, action: '加酱油、糖、醋、水', time: 3, tools: [], note: '' },
        { step: 4, action: '放入鸡块翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '糖', amount: '2勺' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡肉', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '左宗棠鸡是经典湘菜',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡块要炸两次', '调料提前调好']),
    tags: JSON.stringify(['左宗棠鸡', '湘菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '辣子田鸡',
    name_en: 'Spicy Frog Legs',
    type: 'dinner',
    category: JSON.stringify(['肉类', '田鸡', '川菜']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '田鸡', amount: '400g', note: '斩块' },
        { name: '干辣椒', amount: '50g', note: '' },
        { name: '花椒', amount: '20g', note: '' },
        { name: '姜蒜', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '田鸡加盐腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炸至金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '炒干辣椒、花椒、姜蒜', time: 3, tools: [], note: '' },
        { step: 4, action: '放入田鸡翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '田鸡肉', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '田鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '田鸡低脂肪高蛋白',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['田鸡要炸透', '干辣椒多']),
    tags: JSON.stringify(['辣子田鸡', '川菜', '田鸡']),
    is_active: true,
  });

  addRecipe({
    name: '小炒黄牛肉',
    name_en: 'Stir-Fried Beef',
    type: 'lunch',
    category: JSON.stringify(['肉类', '牛肉', '湘菜']),
    prep_time: 15,
    cook_time: 8,
    total_time: 23,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '黄牛肉', amount: '200g', note: '切片' },
        { name: '小米辣', amount: '10个', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉加盐、淀粉腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒牛肉至变色', time: 3, tools: [], note: '' },
        { step: 3, action: '加小米辣、姜蒜翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '蚝油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '牛肉', amount: '20g', note: '' }],
      steps: [
        { step: 1, action: '牛肉煮熟', time: 20, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '黄牛肉富含铁',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['要选黄牛肉', '大火快炒']),
    tags: JSON.stringify(['小炒黄牛肉', '湘菜', '牛肉']),
    is_active: true,
  });

  addRecipe({
    name: '红烧牛腩',
    name_en: 'Braised Beef Brisket',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '家常']),
    prep_time: 15,
    cook_time: 90,
    total_time: 105,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛腩', amount: '500g', note: '切块' },
        { name: '胡萝卜', amount: '2根', note: '' },
        { name: '番茄', amount: '2个', note: '' },
        { name: '八角', amount: '2个', note: '' },
        { name: '桂皮', amount: '1小块', note: '' },
      ],
      steps: [
        { step: 1, action: '牛腩焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '炒香调料', time: 5, tools: [], note: '' },
        { step: 3, action: '加牛腩翻炒', time: 5, tools: [], note: '' },
        { step: 4, action: '加水、番茄、胡萝卜', time: 5, tools: [], note: '' },
        { step: 5, action: '高压锅压40分钟', time: 40, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '盐', amount: '适量' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛腩', amount: '20g', note: '' },
        { name: '胡萝卜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛腩、胡萝卜煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '番茄有助牛肉软烂',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['选带肥的牛腩', '高压锅省时间']),
    tags: JSON.stringify(['红烧牛腩', '牛肉', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '番茄牛腩',
    name_en: 'Tomato Beef Brisket',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '酸甜']),
    prep_time: 15,
    cook_time: 60,
    total_time: 75,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛腩', amount: '400g', note: '' },
        { name: '番茄', amount: '4个', note: '' },
        { name: '洋葱', amount: '1个', note: '' },
        { name: '番茄酱', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛腩、番茄切块', time: 10, tools: [], note: '' },
        { step: 2, action: '炒牛腩至变色', time: 8, tools: [], note: '' },
        { step: 3, action: '加番茄、番茄酱', time: 5, tools: [], note: '' },
        { step: 4, action: '加水炖1小时', time: 60, tools: [], note: '' },
      ],
      seasonings: [
        { name: '番茄酱', amount: '2勺' },
        { name: '盐', amount: '适量' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛腩', amount: '20g', note: '' },
        { name: '番茄', amount: '20g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛腩、番茄煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '番茄牛腩酸甜开胃',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['番茄要炒出汁', '一次加足水']),
    tags: JSON.stringify(['番茄牛腩', '牛肉', '酸甜']),
    is_active: true,
  });

  addRecipe({
    name: '金汤肥牛',
    name_en: 'Sour Soup Beef',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '川菜']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '肥牛片', amount: '300g', note: '' },
        { name: '酸菜', amount: '100g', note: '' },
        { name: '金针菇', amount: '100g', note: '' },
        { name: '泡椒', amount: '10个', note: '' },
        { name: '黄灯笼椒酱', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '炒酸菜、泡椒', time: 5, tools: [], note: '' },
        { step: 2, action: '加黄灯笼椒酱炒香', time: 3, tools: [], note: '' },
        { step: 3, action: '加水煮开', time: 5, tools: [], note: '' },
        { step: 4, action: '放入金针菇、肥牛片', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '黄灯笼椒酱', amount: '2勺' },
        { name: '盐', amount: '适量' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '肥牛', amount: '20g', note: '' },
        { name: '金针菇', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '肥牛、金针菇煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '金汤肥牛酸辣爽口',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['肥牛片不要煮太久', '酸菜要炒香']),
    tags: JSON.stringify(['金汤肥牛', '川菜', '牛肉']),
    is_active: true,
  });

  addRecipe({
    name: '红烧鲤鱼',
    name_en: 'Braised Carp',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '家常', '红烧']),
    prep_time: 15,
    cook_time: 25,
    total_time: 40,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鲤鱼', amount: '1条', note: '约600g' },
        { name: '五花肉', amount: '50g', note: '切片' },
        { name: '姜蒜', amount: '适量', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
        { name: '糖', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鲤鱼收拾干净，两面划刀', time: 5, tools: [], note: '' },
        { step: 2, action: '煎至两面金黄', time: 10, tools: ['锅'], note: '' },
        { step: 3, action: '加姜蒜、五花肉', time: 3, tools: [], note: '' },
        { step: 4, action: '加酱油、糖、水', time: 2, tools: [], note: '' },
        { step: 5, action: '烧15分钟', time: 15, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '糖', amount: '1勺' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鱼肉', amount: '30g', note: '无刺' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '鲤鱼营养丰富',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['鱼要煎透', '烧的时间要够']),
    tags: JSON.stringify(['红烧鲤鱼', '鱼', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '糖醋带鱼',
    name_en: 'Sweet and Sour Belt Fish',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '酸甜', '炸']),
    prep_time: 15,
    cook_time: 20,
    total_time: 35,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '带鱼', amount: '400g', note: '切段' },
        { name: '番茄酱', amount: '3勺', note: '' },
        { name: '糖', amount: '2勺', note: '' },
        { name: '醋', amount: '2勺', note: '' },
        { name: '淀粉', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '带鱼洗净，裹淀粉', time: 5, tools: [], note: '' },
        { step: 2, action: '炸至金黄', time: 10, tools: ['锅'], note: '' },
        { step: 3, action: '炒番茄酱、糖、醋', time: 5, tools: [], note: '' },
        { step: 4, action: '放入带鱼翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '番茄酱', amount: '3勺' },
        { name: '糖', amount: '2勺' },
        { name: '醋', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '带鱼肉', amount: '25g', note: '无骨' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '带鱼富含蛋白质',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['带鱼要炸脆', '糖醋汁要浓']),
    tags: JSON.stringify(['糖醋带鱼', '鱼', '酸甜']),
    is_active: true,
  });

  addRecipe({
    name: '干烧黄鱼',
    name_en: 'Dry-Braised Yellow Croaker',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '川菜', '干烧']),
    prep_time: 15,
    cook_time: 20,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '黄鱼', amount: '1条', note: '约400g' },
        { name: '肉末', amount: '50g', note: '' },
        { name: '豆瓣酱', amount: '2勺', note: '' },
        { name: '姜蒜', amount: '适量', note: '' },
        { name: '泡椒', amount: '5个', note: '' },
      ],
      steps: [
        { step: 1, action: '黄鱼收拾干净', time: 5, tools: [], note: '' },
        { step: 2, action: '煎至两面金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '炒肉末、豆瓣酱、泡椒', time: 5, tools: [], note: '' },
        { step: 4, action: '加水烧至收汁', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鱼肉', amount: '30g', note: '无刺' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '黄鱼刺少肉嫩',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['鱼要煎透', '汤汁要烧干']),
    tags: JSON.stringify(['干烧黄鱼', '川菜', '鱼']),
    is_active: true,
  });

  addRecipe({
    name: '豆瓣鱼',
    name_en: 'Bean Paste Fish',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '川菜', '豆瓣']),
    prep_time: 15,
    cook_time: 20,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '草鱼', amount: '1条', note: '约500g' },
        { name: '郫县豆瓣酱', amount: '3勺', note: '' },
        { name: '姜蒜', amount: '适量', note: '' },
        { name: '葱', amount: '2根', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鱼收拾干净，两面划刀', time: 5, tools: [], note: '' },
        { step: 2, action: '煎至两面金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '炒豆瓣酱、姜蒜', time: 3, tools: [], note: '' },
        { step: 4, action: '加水烧10分钟', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '3勺' },
        { name: '酱油', amount: '2勺' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鱼肉', amount: '30g', note: '无刺' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '豆瓣鱼是经典川菜',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['豆瓣酱要炒出红油', '鱼要烧入味']),
    tags: JSON.stringify(['豆瓣鱼', '川菜', '鱼']),
    is_active: true,
  });

  addRecipe({
    name: '葱烧黄鱼',
    name_en: 'Scallion Braised Yellow Croaker',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '山东', '葱烧']),
    prep_time: 15,
    cook_time: 25,
    total_time: 40,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '黄鱼', amount: '1条', note: '约400g' },
        { name: '大葱', amount: '3根', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
        { name: '糖', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '黄鱼收拾干净', time: 5, tools: [], note: '' },
        { step: 2, action: '煎至两面金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '加入葱段、姜片', time: 2, tools: [], note: '' },
        { step: 4, action: '加酱油、糖、水烧15分钟', time: 15, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '糖', amount: '1勺' },
        { name: '料酒', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鱼肉', amount: '30g', note: '无刺' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '葱烧鱼是山东名菜',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['葱要煎透', '小火慢烧']),
    tags: JSON.stringify(['葱烧黄鱼', '山东', '鱼']),
    is_active: true,
  });

  addRecipe({
    name: '鲫鱼豆腐汤',
    name_en: 'Crucian Tofu Soup',
    type: 'lunch',
    category: JSON.stringify(['汤类', '鱼', '家常']),
    prep_time: 10,
    cook_time: 30,
    total_time: 40,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鲫鱼', amount: '2条', note: '' },
        { name: '豆腐', amount: '200g', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '鲫鱼收拾干净', time: 5, tools: [], note: '' },
        { step: 2, action: '煎至两面金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '加开水、姜片', time: 3, tools: [], note: '' },
        { step: 4, action: '大火煮10分钟', time: 10, tools: [], note: '' },
        { step: 5, action: '加豆腐再煮10分钟', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '胡椒粉', amount: '少许' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '鲫鱼肉', amount: '20g', note: '无刺' },
        { name: '豆腐', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '鱼肉、豆腐煮熟', time: 20, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '鲫鱼豆腐汤营养丰富',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['加开水汤才白', '豆腐要后放']),
    tags: JSON.stringify(['鲫鱼豆腐汤', '汤', '家常']),
    is_active: true,
  });

  // 插入所有菜谱
  await knex('recipes').insert(recipes);
  console.log(`Added ${recipes.length} new recipes`);
}
