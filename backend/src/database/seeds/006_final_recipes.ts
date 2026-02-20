import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 获取当前最大ID
  const maxRecipe = await knex('recipes').max('id as max').first();
  let idCounter = maxRecipe?.max ? parseInt(maxRecipe.max.replace('recipe_', '')) + 1 : 96;

  const recipes = [];
  const addRecipe = (recipe: any) => {
    recipes.push({ ...recipe, id: `recipe_${String(idCounter++).padStart(3, '0')}` });
  };

  addRecipe({
    name: '豆腐皮卷',
    name_en: 'Tofu Skin Rolls',
    type: 'dinner',
    category: JSON.stringify(['素菜', '豆腐', '家常']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '豆腐皮', amount: '3张', note: '' },
        { name: '胡萝卜', amount: '1根', note: '切丝' },
        { name: '黄瓜', amount: '1根', note: '切丝' },
        { name: '香菜', amount: '2根', note: '' },
        { name: '甜面酱', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '豆腐皮焯水', time: 2, tools: [], note: '' },
        { step: 2, action: '铺上胡萝卜丝、黄瓜丝、香菜', time: 5, tools: [], note: '' },
        { step: 3, action: '卷起切段', time: 3, tools: [], note: '' },
        { step: 4, action: '蘸甜面酱吃', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '甜面酱', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '豆腐皮', amount: '20g', note: '' },
        { name: '胡萝卜', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '豆腐皮煮软', time: 5, tools: [], note: '' },
        { step: 2, action: '胡萝卜煮软，混合切碎', time: 10, tools: [], note: '' },
      ],
      nutrition_tips: '豆腐皮富含蛋白质',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['豆腐皮要焯水', '卷紧']),
    tags: JSON.stringify(['豆腐皮卷', '素菜', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '凉拌黄瓜',
    name_en: 'Cold Cucumber Salad',
    type: 'lunch',
    category: JSON.stringify(['凉菜', '快手', '夏季']),
    prep_time: 10,
    cook_time: 0,
    total_time: 10,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '黄瓜', amount: '2根', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '小米辣', amount: '3个', note: '' },
        { name: '醋', amount: '2勺', note: '' },
        { name: '酱油', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '黄瓜拍碎切块', time: 3, tools: [], note: '' },
        { step: 2, action: '加蒜末、辣椒圈', time: 2, tools: [], note: '' },
        { step: 3, action: '加醋、酱油拌匀', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '醋', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
        { name: '香油', amount: '少许' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [{ name: '黄瓜', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '黄瓜煮软', time: 5, tools: [], note: '' },
        { step: 2, action: '切小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '黄瓜清热解暑',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['黄瓜要拍碎', '冰镇更脆']),
    tags: JSON.stringify(['凉拌黄瓜', '凉菜', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '凉拌木耳',
    name_en: 'Cold Wood Ear Salad',
    type: 'lunch',
    category: JSON.stringify(['凉菜', '快手', '家常']),
    prep_time: 15,
    cook_time: 5,
    total_time: 20,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '木耳', amount: '50g', note: '泡发' },
        { name: '洋葱', amount: '半个', note: '切丝' },
        { name: '香菜', amount: '2根', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '醋', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '木耳焯水煮熟', time: 5, tools: [], note: '' },
        { step: 2, action: '过冷水沥干', time: 2, tools: [], note: '' },
        { step: 3, action: '加洋葱丝、蒜末、调料拌匀', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '醋', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
        { name: '辣椒油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '木耳', amount: '20g', note: '' }],
      steps: [
        { step: 1, action: '木耳煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '木耳清血管',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['木耳要煮透', '过冷水更脆']),
    tags: JSON.stringify(['凉拌木耳', '凉菜', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '拍黄瓜',
    name_en: 'Smashed Cucumber',
    type: 'lunch',
    category: JSON.stringify(['凉菜', '快手', '夏季']),
    prep_time: 5,
    cook_time: 0,
    total_time: 5,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '黄瓜', amount: '2根', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '醋', amount: '1勺', note: '' },
        { name: '酱油', amount: '1勺', note: '' },
        { name: '辣椒油', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '黄瓜用刀拍碎', time: 2, tools: [], note: '' },
        { step: 2, action: '切块，加蒜末', time: 2, tools: [], note: '' },
        { step: 3, action: '拌匀即可', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '醋', amount: '1勺' },
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
        { name: '辣椒油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [{ name: '黄瓜', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '黄瓜煮软', time: 5, tools: [], note: '' },
        { step: 2, action: '切小块', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '黄瓜利尿清热',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['一定要拍碎', '不要切']),
    tags: JSON.stringify(['拍黄瓜', '凉菜', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '凉拌番茄',
    name_en: 'Cold Tomato Salad',
    type: 'snack',
    category: JSON.stringify(['凉菜', '快手', '夏季']),
    prep_time: 5,
    cook_time: 0,
    total_time: 5,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '番茄', amount: '2个', note: '' },
        { name: '白糖', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '番茄切块', time: 3, tools: [], note: '' },
        { step: 2, action: '撒上白糖拌匀', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '白糖', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '6-12月',
      ingredients: [{ name: '番茄', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '番茄去皮', time: 2, tools: [], note: '' },
        { step: 2, action: '压成泥', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '番茄富含维C',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['冰镇更好吃', '白糖要够']),
    tags: JSON.stringify(['凉拌番茄', '凉菜', '快手']),
    is_active: true,
  });

  // 插入所有菜谱
  await knex('recipes').insert(recipes);
  console.log(`Added ${recipes.length} new recipes`);
}
