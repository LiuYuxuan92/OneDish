import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 获取当前最大ID
  const maxRecipe = await knex('recipes').max('id as max').first();
  let idCounter = maxRecipe?.max ? parseInt(maxRecipe.max.replace('recipe_', '')) + 1 : 21;

  const recipes = [];
  const addRecipe = (recipe: any) => {
    recipes.push({ ...recipe, id: `recipe_${String(idCounter++).padStart(3, '0')}` });
  };

  // ========== 猪肉类 ==========
  addRecipe({
    name: '青椒肉丝',
    name_en: 'Stir-Fried Pork with Green Pepper',
    type: 'lunch',
    category: JSON.stringify(['肉类', '猪肉', '快手']),
    prep_time: 15,
    cook_time: 8,
    total_time: 23,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪里脊肉', amount: '200g', note: '切丝' },
        { name: '青椒', amount: '2个', note: '切丝' },
        { name: '红椒', amount: '1个', note: '切丝' },
        { name: '姜', amount: '3片', note: '' },
        { name: '蒜', amount: '2瓣', note: '' },
        { name: '酱油', amount: '1勺', note: '' },
        { name: '淀粉', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '肉丝加酱油淀粉腌制10分钟', time: 10, tools: ['碗'], note: '' },
        { step: 2, action: '青红椒切丝', time: 3, tools: [], note: '' },
        { step: 3, action: '热锅下油，先炒肉丝变色盛出', time: 3, tools: ['锅'], note: '' },
        { step: 4, action: '再炒青椒丝，放入肉丝一起翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '猪肉', amount: '20g', note: '剁碎' },
        { name: '青椒', amount: '15g', note: '去籽切小块' },
      ],
      steps: [
        { step: 1, action: '青椒切小块煮软', time: 8, tools: ['小锅'], note: '' },
        { step: 2, action: '猪肉煮熟切碎', time: 10, tools: [], note: '' },
        { step: 3, action: '混合拌匀', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '青椒富含维生素C，猪肉提供蛋白质',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['大火快炒', '肉丝提前腌制更嫩']),
    tags: JSON.stringify(['青椒', '猪肉', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '回锅肉',
    name_en: 'Twice-Cooked Pork',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肉', '川菜']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '五花肉', amount: '300g', note: '' },
        { name: '青蒜', amount: '3根', note: '' },
        { name: '郫县豆瓣酱', amount: '2勺', note: '' },
        { name: '姜', amount: '3片', note: '' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '五花肉冷水下锅煮熟', time: 20, tools: ['锅'], note: '' },
        { step: 2, action: '捞出放凉切片', time: 5, tools: [], note: '' },
        { step: 3, action: '锅中放少许油，下肉片煸炒', time: 5, tools: [], note: '' },
        { step: 4, action: '加豆瓣酱、姜蒜片炒香', time: 3, tools: [], note: '' },
        { step: 5, action: '放入青蒜翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '五花肉', amount: '20g', note: '煮熟的瘦肉' },
      ],
      steps: [
        { step: 1, action: '五花肉煮熟', time: 15, tools: ['小锅'], note: '' },
        { step: 2, action: '剁碎即可', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '五花肉提供优质脂肪和蛋白质',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['肉要煮到断生', '煸炒出油更香']),
    tags: JSON.stringify(['回锅肉', '川菜', '猪肉']),
    is_active: true,
  });

  addRecipe({
    name: '鱼香肉丝',
    name_en: 'Yuxiang Shredded Pork',
    type: 'lunch',
    category: JSON.stringify(['肉类', '猪肉', '川菜']),
    prep_time: 20,
    cook_time: 10,
    total_time: 30,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪里脊', amount: '200g', note: '切丝' },
        { name: '木耳', amount: '30g', note: '泡发切丝' },
        { name: '胡萝卜', amount: '1根', note: '切丝' },
        { name: '郫县豆瓣酱', amount: '1勺', note: '' },
        { name: '醋', amount: '1勺', note: '' },
        { name: '白糖', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '肉丝加淀粉腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '调好鱼香汁：醋、糖、酱油、淀粉加水', time: 2, tools: [], note: '' },
        { step: 3, action: '炒肉丝变色盛出', time: 3, tools: [], note: '' },
        { step: 4, action: '炒配菜，加豆瓣酱', time: 4, tools: [], note: '' },
        { step: 5, action: '倒入肉丝和鱼香汁翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '1勺' },
        { name: '醋', amount: '1勺' },
        { name: '白糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '猪肉', amount: '20g', note: '' },
        { name: '胡萝卜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '胡萝卜煮软切碎', time: 10, tools: [], note: '' },
        { step: 2, action: '猪肉煮熟切碎', time: 10, tools: [], note: '' },
        { step: 3, action: '混合拌匀', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '荤素搭配，营养均衡',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鱼香汁要提前调好', '大火快炒']),
    tags: JSON.stringify(['鱼香肉丝', '川菜', '猪肉']),
    is_active: true,
  });

  addRecipe({
    name: '小炒肉',
    name_en: 'Stir-Fried Pork',
    type: 'lunch',
    category: JSON.stringify(['肉类', '猪肉', '快手']),
    prep_time: 10,
    cook_time: 8,
    total_time: 18,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪腿肉', amount: '200g', note: '切片' },
        { name: '青蒜', amount: '3根', note: '切段' },
        { name: '小米辣', amount: '3个', note: '' },
        { name: '豆豉', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '肉片煸炒出油', time: 5, tools: ['锅'], note: '' },
        { step: 2, action: '加豆豉、小米辣炒香', time: 2, tools: [], note: '' },
        { step: 3, action: '放入青蒜翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '猪肉', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '猪肉煮熟切碎', time: 15, tools: [], note: '' },
      ],
      nutrition_tips: '简单易做',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['煸出油更香', '大火快炒']),
    tags: JSON.stringify(['小炒肉', '猪肉', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '梅菜扣肉',
    name_en: 'Braised Pork with Preserved Vegetables',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肉', '蒸菜']),
    prep_time: 20,
    cook_time: 90,
    total_time: 110,
    difficulty: '困难',
    servings: '4人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '五花肉', amount: '500g', note: '' },
        { name: '梅菜', amount: '100g', note: '泡发' },
        { name: '南乳', amount: '2块', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '白糖', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '五花肉煮熟，皮扎孔抹酱油', time: 20, tools: [], note: '' },
        { step: 2, action: '油炸至皮金黄', time: 10, tools: ['锅'], note: '小心烫' },
        { step: 3, action: '切片，皮朝下码在碗里', time: 5, tools: [], note: '' },
        { step: 4, action: '梅菜铺在肉上，加调料', time: 3, tools: [], note: '' },
        { step: 5, action: '蒸1小时', time: 60, tools: ['蒸锅'], note: '' },
        { step: 6, action: '倒扣在盘子上', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '南乳', amount: '2块' },
        { name: '酱油', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '五花肉', amount: '20g', note: '瘦肉部分' },
      ],
      steps: [
        { step: 1, action: '五花肉蒸熟', time: 30, tools: ['蒸锅'], note: '' },
        { step: 2, action: '去皮剁碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '五花肉富含胶原蛋白',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['炸皮要小心油溅', '蒸的时间要够']),
    tags: JSON.stringify(['梅菜扣肉', '蒸菜', '猪肉']),
    is_active: true,
  });

  // ========== 鸡肉类 ==========
  addRecipe({
    name: '宫保鸡丁',
    name_en: 'Kung Pao Chicken',
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
        { name: '花生', amount: '50g', note: '' },
        { name: '黄瓜', amount: '1根', note: '切丁' },
        { name: '干辣椒', amount: '5个', note: '' },
        { name: '花椒', amount: '10粒', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡丁加盐淀粉腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒花生米盛出', time: 3, tools: [], note: '' },
        { step: 3, action: '炒鸡丁变色盛出', time: 3, tools: [], note: '' },
        { step: 4, action: '炒干辣椒花椒，加鸡丁', time: 3, tools: [], note: '' },
        { step: 5, action: '加黄瓜丁、花生翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '醋', amount: '1勺' },
        { name: '糖', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡胸肉', amount: '30g', note: '' },
        { name: '黄瓜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉煮熟切小块', time: 15, tools: [], note: '' },
        { step: 2, action: '黄瓜煮软切小块', time: 5, tools: [], note: '' },
        { step: 3, action: '混合拌匀', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '鸡肉高蛋白，黄瓜清热解暑',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['花生要最后放保持脆', '火候要掌握好']),
    tags: JSON.stringify(['宫保鸡丁', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '黄焖鸡',
    name_en: 'Braised Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '焖锅']),
    prep_time: 15,
    cook_time: 25,
    total_time: 40,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡腿', amount: '2个', note: '斩块' },
        { name: '香菇', amount: '5朵', note: '泡发' },
        { name: '青椒', amount: '1个', note: '切块' },
        { name: '姜', amount: '5片', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '料酒', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块焯水去腥', time: 5, tools: [], note: '' },
        { step: 2, action: '锅中炒香姜片', time: 2, tools: [], note: '' },
        { step: 3, action: '放入鸡块翻炒', time: 3, tools: [], note: '' },
        { step: 4, action: '加酱油、料酒、香菇和水', time: 2, tools: [], note: '' },
        { step: 5, action: '焖煮15分钟', time: 15, tools: [], note: '' },
        { step: 6, action: '加青椒收汁', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '料酒', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡腿肉', amount: '30g', note: '' },
        { name: '香菇', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡肉、香菇煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '捞出切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '香菇富含氨基酸，提升鲜味',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡块要选带骨的', '焖的时间要够']),
    tags: JSON.stringify(['黄焖鸡', '鸡肉', '焖锅']),
    is_active: true,
  });

  addRecipe({
    name: '辣子鸡',
    name_en: 'Spicy Fried Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '川菜']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡腿肉', amount: '300g', note: '斩块' },
        { name: '干辣椒', amount: '50g', note: '' },
        { name: '花椒', amount: '15g', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '蒜', amount: '5瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块加盐腌制10分钟', time: 10, tools: [], note: '' },
        { step: 2, action: '油炸鸡块至金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '炒香干辣椒、花椒、姜蒜', time: 3, tools: [], note: '' },
        { step: 4, action: '放入鸡块翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鸡腿肉', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟切小块', time: 15, tools: [], note: '' },
      ],
      nutrition_tips: '鸡肉高蛋白',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡块要炸透', '干辣椒根据口味调整']),
    tags: JSON.stringify(['辣子鸡', '川菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '白切鸡',
    name_en: 'Poached Chicken',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '清淡']),
    prep_time: 10,
    cook_time: 20,
    total_time: 30,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '三黄鸡', amount: '1只', note: '约1000g' },
        { name: '姜', amount: '10片', note: '' },
        { name: '葱', amount: '3根', note: '' },
        { name: '香菜', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡洗净，葱姜塞入腹中', time: 3, tools: [], note: '' },
        { step: 2, action: '水开下鸡，大火煮5分钟', time: 5, tools: ['锅'], note: '' },
        { step: 3, action: '关火焖20分钟', time: 20, tools: [], note: '' },
        { step: 4, action: '捞出冰水过凉', time: 3, tools: [], note: '' },
        { step: 5, action: '斩件装盘，配姜葱汁', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [{ name: '鸡胸肉', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '鸡肉煮熟', time: 15, tools: [], note: '' },
        { step: 2, action: '撕成小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '白切鸡最大程度保留鸡肉营养',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['鸡要选新鲜的', '焖的时间是关键']),
    tags: JSON.stringify(['白切鸡', '粤菜', '鸡肉']),
    is_active: true,
  });

  addRecipe({
    name: '大盘鸡',
    name_en: 'Da Pan Ji',
    type: 'dinner',
    category: JSON.stringify(['肉类', '鸡肉', '新疆菜']),
    prep_time: 20,
    cook_time: 30,
    total_time: 50,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡腿', amount: '2个', note: '斩块' },
        { name: '土豆', amount: '2个', note: '切块' },
        { name: '青椒', amount: '2个', note: '切块' },
        { name: '面条', amount: '300g', note: '' },
        { name: '豆瓣酱', amount: '2勺', note: '' },
        { name: '干辣椒', amount: '5个', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡块焯水', time: 5, tools: [], note: '' },
        { step: 2, action: '炒香豆瓣酱、干辣椒', time: 3, tools: [], note: '' },
        { step: 3, action: '放入鸡块翻炒，加水', time: 5, tools: [], note: '' },
        { step: 4, action: '加土豆炖15分钟', time: 15, tools: [], note: '' },
        { step: 5, action: '放入青椒，面条煮熟铺在盘底', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鸡肉', amount: '20g', note: '' },
        { name: '土豆', amount: '20g', note: '' },
      ],
      steps: [
        { step: 1, action: '、土豆煮软', time: 15, tools: [], note: '' },
        { step: 2, action: '鸡肉煮熟，混合压碎', time: 10, tools: [], note: '' },
      ],
      nutrition_tips: '鸡肉配土豆，营养互补',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['面条可以换成皮带面', '土豆要炖烂']),
    tags: JSON.stringify(['大盘鸡', '新疆菜', '鸡肉']),
    is_active: true,
  });

  // ========== 牛肉类 ==========
  addRecipe({
    name: '水煮牛肉',
    name_en: 'Boiled Beef',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '川菜']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛肉', amount: '300g', note: '切片' },
        { name: '豆芽', amount: '200g', note: '' },
        { name: '郫县豆瓣酱', amount: '2勺', note: '' },
        { name: '干辣椒', amount: '10个', note: '' },
        { name: '花椒', amount: '1勺', note: '' },
        { name: '淀粉', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉片加淀粉、盐腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒豆芽铺在碗底', time: 3, tools: [], note: '' },
        { step: 3, action: '炒豆瓣酱，加水煮开', time: 3, tools: [], note: '' },
        { step: 4, action: '放入牛肉片滑熟', time: 3, tools: [], note: '' },
        { step: 5, action: '浇上热油，撒干辣椒花椒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛肉', amount: '20g', note: '' },
        { name: '豆芽', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、豆芽煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '切碎混合', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '牛肉富含铁，豆芽富含维C',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['牛肉要切薄', '浇油要热']),
    tags: JSON.stringify(['水煮牛肉', '川菜', '牛肉']),
    is_active: true,
  });

  addRecipe({
    name: '红烧牛肉',
    name_en: 'Braised Beef',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '家常']),
    prep_time: 15,
    cook_time: 120,
    total_time: 135,
    difficulty: '中等',
    servings: '4人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛腩', amount: '800g', note: '切块' },
        { name: '胡萝卜', amount: '2根', note: '切块' },
        { name: '番茄', amount: '2个', note: '' },
        { name: '八角', amount: '2个', note: '' },
        { name: '桂皮', amount: '1小块', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉焯水去血沫', time: 10, tools: [], note: '' },
        { step: 2, action: '炒香调料，加牛肉翻炒', time: 5, tools: [], note: '' },
        { step: 3, action: '加酱油、番茄、水', time: 3, tools: [], note: '' },
        { step: 4, action: '高压锅压40分钟或砂锅炖1.5小时', time: 60, tools: [], note: '' },
        { step: 5, action: '加胡萝卜再炖30分钟', time: 30, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '盐', amount: '适量' },
        { name: '料酒', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛肉', amount: '25g', note: '' },
        { name: '胡萝卜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、胡萝卜煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '捞出切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '牛肉补铁效果好',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['选肥瘦相间的牛腩', '炖的时间要够']),
    tags: JSON.stringify(['红烧牛肉', '牛肉', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '青椒牛柳',
    name_en: 'Stir-Fried Beef with Green Pepper',
    type: 'lunch',
    category: JSON.stringify(['肉类', '牛肉', '快手']),
    prep_time: 15,
    cook_time: 8,
    total_time: 23,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛里脊', amount: '200g', note: '切条' },
        { name: '青椒', amount: '2个', note: '切条' },
        { name: '黑胡椒', amount: '适量', note: '' },
        { name: '酱油', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉加酱油、淀粉腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒牛肉变色盛出', time: 3, tools: [], note: '' },
        { step: 3, action: '炒青椒，放入牛肉', time: 3, tools: [], note: '' },
        { step: 4, action: '撒黑胡椒出锅', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛肉', amount: '20g', note: '' },
        { name: '青椒', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、青椒煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '牛肉富含铁和锌',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['大火快炒', '牛肉要逆纹切']),
    tags: JSON.stringify(['青椒牛柳', '牛肉', '快手']),
    is_active: true,
  });

  // ========== 鱼类 ==========
  addRecipe({
    name: '糖醋鲤鱼',
    name_en: 'Sweet and Sour Carp',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '酸甜', '炸']),
    prep_time: 20,
    cook_time: 20,
    total_time: 40,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鲤鱼', amount: '1条', note: '约600g' },
        { name: '面粉', amount: '100g', note: '' },
        { name: '番茄酱', amount: '3勺', note: '' },
        { name: '白糖', amount: '2勺', note: '' },
        { name: '醋', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鲤鱼收拾干净，两面划刀', time: 5, tools: [], note: '' },
        { step: 2, action: '鱼身裹面粉', time: 3, tools: [], note: '' },
        { step: 3, action: '油炸至金黄酥脆', time: 10, tools: ['锅'], note: '' },
        { step: 4, action: '炒糖醋汁', time: 3, tools: [], note: '' },
        { step: 5, action: '浇在鱼身上', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '番茄酱', amount: '3勺' },
        { name: '白糖', amount: '2勺' },
        { name: '醋', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '鱼肉', amount: '30g', note: '无刺' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '鱼肉富含DHA',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['鱼要炸透', '糖醋汁要浓']),
    tags: JSON.stringify(['糖醋鲤鱼', '鱼', '酸甜']),
    is_active: true,
  });

  addRecipe({
    name: '红烧带鱼',
    name_en: 'Braised Belt Fish',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '家常', '红烧']),
    prep_time: 15,
    cook_time: 20,
    total_time: 35,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '带鱼', amount: '400g', note: '切段' },
        { name: '姜', amount: '5片', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '糖', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '带鱼洗净，擦干水分', time: 3, tools: [], note: '' },
        { step: 2, action: '油煎至两面金黄', time: 8, tools: ['锅'], note: '' },
        { step: 3, action: '加姜蒜、酱油、糖、水', time: 2, tools: [], note: '' },
        { step: 4, action: '焖煮10分钟', time: 10, tools: [], note: '' },
        { step: 5, action: '大火收汁', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '糖', amount: '1勺' },
        { name: '料酒', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '带鱼肉', amount: '30g', note: '无骨' }],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '去刺压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '带鱼富含蛋白质和钙',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['鱼要擦干水分再煎', '煎的时候不要常翻动']),
    tags: JSON.stringify(['红烧带鱼', '鱼', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '酸菜鱼',
    name_en: 'Sour Mustard Green Fish',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '川菜', '酸辣']),
    prep_time: 25,
    cook_time: 20,
    total_time: 45,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '草鱼', amount: '1条', note: '约600g' },
        { name: '酸菜', amount: '200g', note: '' },
        { name: '泡椒', amount: '10个', note: '' },
        { name: '豆芽', amount: '100g', note: '' },
        { name: '蛋清', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '鱼片加蛋清、盐腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '炒酸菜、泡椒', time: 5, tools: [], note: '' },
        { step: 3, action: '加水煮开', time: 5, tools: [], note: '' },
        { step: 4, action: '放入鱼片滑熟', time: 3, tools: [], note: '' },
        { step: 5, action: '浇热油', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '白醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '鱼肉', amount: '25g', note: '无刺' },
        { name: '酸菜', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '鱼肉蒸熟', time: 10, tools: [], note: '' },
        { step: 2, action: '酸菜煮一下，混合压碎', time: 5, tools: [], note: '' },
      ],
      nutrition_tips: '酸菜开胃，鱼肉优质蛋白',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['片鱼片要有耐心', '酸菜要炒出香味']),
    tags: JSON.stringify(['酸菜鱼', '川菜', '鱼']),
    is_active: true,
  });

  addRecipe({
    name: '松鼠桂鱼',
    name_en: 'Squirrel-Shaped Mandarin Fish',
    type: 'dinner',
    category: JSON.stringify(['鱼类', '苏菜', '酸甜']),
    prep_time: 25,
    cook_time: 20,
    total_time: 45,
    difficulty: '困难',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '桂鱼', amount: '1条', note: '约500g' },
        { name: '松子', amount: '30g', note: '' },
        { name: '番茄酱', amount: '3勺', note: '' },
        { name: '糖', amount: '2勺', note: '' },
        { name: '醋', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '鱼去骨，两侧划花刀', time: 10, tools: [], note: '' },
        { step: 2, action: '裹淀粉，油炸成型', time: 10, tools: ['锅'], note: '' },
        { step: 3, action: '炒番茄酱、糖、醋', time: 3, tools: [], note: '' },
        { step: 4, action: '浇在鱼上，撒松子', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '番茄酱', amount: '3勺' },
        { name: '糖', amount: '2勺' },
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
      nutrition_tips: '桂鱼刺少肉嫩',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['划花刀要均匀', '炸的时候油温要高']),
    tags: JSON.stringify(['松鼠桂鱼', '苏菜', '鱼']),
    is_active: true,
  });

  // ========== 蔬菜类 ==========
  addRecipe({
    name: '酸辣土豆丝',
    name_en: 'Shredded Potatoes with Vinegar and Pepper',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '快手', '酸辣']),
    prep_time: 10,
    cook_time: 5,
    total_time: 15,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '土豆', amount: '2个', note: '切丝' },
        { name: '干辣椒', amount: '5个', note: '' },
        { name: '花椒', amount: '10粒', note: '' },
        { name: '白醋', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '土豆丝泡水去淀粉', time: 3, tools: [], note: '' },
        { step: 2, action: '油热炒花椒、干辣椒', time: 1, tools: [], note: '' },
        { step: 3, action: '放入土豆丝翻炒', time: 3, tools: [], note: '' },
        { step: 4, action: '加醋、盐翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '白醋', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [{ name: '土豆', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '土豆煮软', time: 15, tools: [], note: '' },
        { step: 2, action: '压成小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '土豆富含碳水化合物',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['土豆丝要泡水', '大火快炒']),
    tags: JSON.stringify(['土豆丝', '酸辣', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '地三鲜',
    name_en: 'Di San Xian',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '东北菜', '素菜']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '土豆', amount: '1个', note: '切块' },
        { name: '茄子', amount: '1个', note: '切块' },
        { name: '青椒', amount: '1个', note: '切块' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '土豆、茄子分别炸至金黄', time: 10, tools: ['锅'], note: '' },
        { step: 2, action: '炒香蒜末', time: 1, tools: [], note: '' },
        { step: 3, action: '放入青椒、土豆、茄子', time: 2, tools: [], note: '' },
        { step: 4, action: '加酱油、盐翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '土豆', amount: '20g', note: '' },
        { name: '茄子', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '土豆、茄子煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '压成小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '茄子富含维生素P',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['土豆要炸透', '茄子吸油']),
    tags: JSON.stringify(['地三鲜', '东北菜', '素菜']),
    is_active: true,
  });

  addRecipe({
    name: '手撕包菜',
    name_en: 'Hand-Torn Cabbage',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '快手', '清淡']),
    prep_time: 5,
    cook_time: 5,
    total_time: 10,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '包菜', amount: '300g', note: '手撕' },
        { name: '干辣椒', amount: '5个', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '醋', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '包菜手撕成片', time: 3, tools: [], note: '' },
        { step: 2, action: '炒香干辣椒、蒜', time: 1, tools: [], note: '' },
        { step: 3, action: '放入包菜翻炒', time: 3, tools: [], note: '' },
        { step: 4, action: '加醋、盐出锅', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '醋', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [{ name: '包菜', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '包菜煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '切小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '包菜富含维C和膳食纤维',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['一定要手撕', '大火快炒']),
    tags: JSON.stringify(['手撕包菜', '快手', '蔬菜']),
    is_active: true,
  });

  addRecipe({
    name: '麻婆豆腐',
    name_en: 'Mapo Tofu',
    type: 'dinner',
    category: JSON.stringify(['川菜', '豆腐', '麻辣']),
    prep_time: 10,
    cook_time: 15,
    total_time: 25,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '豆腐', amount: '300g', note: '切块' },
        { name: '猪肉末', amount: '100g', note: '' },
        { name: '郫县豆瓣酱', amount: '2勺', note: '' },
        { name: '花椒', amount: '1勺', note: '' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '豆腐盐水焯水', time: 3, tools: [], note: '' },
        { step: 2, action: '炒肉末加豆瓣酱', time: 5, tools: [], note: '' },
        { step: 3, action: '加水放入豆腐', time: 2, tools: [], note: '' },
        { step: 4, action: '烧3分钟，水淀粉勾芡', time: 5, tools: [], note: '' },
        { step: 5, action: '撒花椒油', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '豆腐', amount: '30g', note: '' },
      ],
      steps: [
        { step: 1, action: '豆腐煮烂', time: 10, tools: [], note: '' },
        { step: 2, action: '压成小块', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '豆腐富含钙和植物蛋白',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['豆腐要盐水焯水', '勾芡要薄']),
    tags: JSON.stringify(['麻婆豆腐', '川菜', '豆腐']),
    is_active: true,
  });

  addRecipe({
    name: '西葫芦炒蛋',
    name_en: 'Stir-Fried Egg with Zucchini',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '快手', '清淡']),
    prep_time: 10,
    cook_time: 8,
    total_time: 18,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '西葫芦', amount: '1根', note: '切片' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡蛋炒熟盛出', time: 3, tools: [], note: '' },
        { step: 2, action: '炒香蒜片', time: 1, tools: [], note: '' },
        { step: 3, action: '放入西葫芦翻炒', time: 4, tools: [], note: '' },
        { step: 4, action: '放入鸡蛋，加盐翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '西葫芦', amount: '20g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '西葫芦煮软', time: 8, tools: [], note: '' },
        { step: 2, action: '鸡蛋煮熟，混合压碎', time: 10, tools: [], note: '' },
      ],
      nutrition_tips: '西葫芦清热利尿',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['西葫芦不要炒太久', '保持脆爽']),
    tags: JSON.stringify(['西葫芦', '快手', '清淡']),
    is_active: true,
  });

  addRecipe({
    name: '苦瓜炒蛋',
    name_en: 'Bitter Melon with Egg',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '清热', '苦瓜']),
    prep_time: 10,
    cook_time: 10,
    total_time: 20,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '苦瓜', amount: '1根', note: '切片' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '盐', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '苦瓜用盐腌10分钟，去苦味', time: 10, tools: [], note: '' },
        { step: 2, action: '苦瓜挤干水分', time: 2, tools: [], note: '' },
        { step: 3, action: '炒鸡蛋盛出', time: 3, tools: [], note: '' },
        { step: 4, action: '炒苦瓜，加鸡蛋翻炒', time: 5, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '苦瓜', amount: '15g', note: '' }],
      steps: [
        { step: 1, action: '苦瓜煮软，多换水去苦味', time: 15, tools: [], note: '' },
        { step: 2, action: '压成小块', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '苦瓜清热解毒',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['苦瓜要提前腌制去苦味', '炒的时候大火快炒']),
    tags: JSON.stringify(['苦瓜', '清热', '苦瓜']),
    is_active: true,
  });

  addRecipe({
    name: '香干芹菜',
    name_en: 'Stir-Fried Dried Tofu with Celery',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '快手', '芹菜']),
    prep_time: 10,
    cook_time: 8,
    total_time: 18,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '香干', amount: '100g', note: '切片' },
        { name: '芹菜', amount: '200g', note: '切段' },
        { name: '红椒', amount: '1个', note: '切丝' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '芹菜焯水', time: 2, tools: [], note: '' },
        { step: 2, action: '炒香蒜末', time: 1, tools: [], note: '' },
        { step: 3, action: '放入香干翻炒', time: 3, tools: [], note: '' },
        { step: 4, action: '加芹菜、红椒丝翻炒', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '香干', amount: '15g', note: '' },
        { name: '芹菜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '芹菜、香干煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '芹菜富含纤维，香干补充钙质',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['芹菜提前焯水保持绿色', '大火快炒']),
    tags: JSON.stringify(['香干', '芹菜', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '木耳山药',
    name_en: 'Stir-Fried Wood Ear with Yam',
    type: 'lunch',
    category: JSON.stringify(['蔬菜', '清淡', '养生']),
    prep_time: 15,
    cook_time: 8,
    total_time: 23,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '山药', amount: '200g', note: '切片' },
        { name: '木耳', amount: '30g', note: '泡发' },
        { name: '胡萝卜', amount: '1根', note: '切片' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '木耳泡发，山药胡萝卜切片', time: 5, tools: [], note: '' },
        { step: 2, action: '山药胡萝卜焯水', time: 3, tools: [], note: '' },
        { step: 3, action: '炒香蒜末', time: 1, tools: [], note: '' },
        { step: 4, action: '放入所有食材翻炒', time: 4, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '山药', amount: '20g', note: '' },
        { name: '木耳', amount: '5g', note: '' },
      ],
      steps: [
        { step: 1, action: '山药、木耳煮软', time: 15, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '山药健脾，木耳清血管',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['山药切片后要泡水防氧化', '炒的时候加醋']),
    tags: JSON.stringify(['木耳', '山药', '养生']),
    is_active: true,
  });

  // ========== 蛋类 ==========
  addRecipe({
    name: '西红柿炒鸡蛋',
    name_en: 'Tomato Scrambled Eggs',
    type: 'breakfast',
    category: JSON.stringify(['快手', '家常', '番茄']),
    prep_time: 10,
    cook_time: 8,
    total_time: 18,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '鸡蛋', amount: '3个', note: '' },
        { name: '西红柿', amount: '2个', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡蛋打散，西红柿切块', time: 3, tools: [], note: '' },
        { step: 2, action: '炒鸡蛋盛出', time: 3, tools: [], note: '' },
        { step: 3, action: '炒西红柿出汁', time: 5, tools: [], note: '' },
        { step: 4, action: '放入鸡蛋翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '糖', amount: '1小勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '鸡蛋', amount: '1个', note: '' },
        { name: '西红柿', amount: '30g', note: '' },
      ],
      steps: [
        { step: 1, action: '西红柿去皮切碎', time: 3, tools: [], note: '' },
        { step: 2, action: '鸡蛋煮熟，西红柿煮软', time: 10, tools: [], note: '' },
        { step: 3, action: '混合压碎', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '番茄红素和蛋白质完美结合',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['番茄要炒出汁', '糖可以中和酸味']),
    tags: JSON.stringify(['西红柿炒鸡蛋', '快手', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '韭菜炒鸡蛋',
    name_en: 'Chives with Egg',
    type: 'breakfast',
    category: JSON.stringify(['快手', '韭菜', '家常']),
    prep_time: 5,
    cook_time: 5,
    total_time: 10,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '韭菜', amount: '200g', note: '切段' },
        { name: '鸡蛋', amount: '2个', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡蛋打散', time: 1, tools: [], note: '' },
        { step: 2, action: '炒鸡蛋盛出', time: 2, tools: [], note: '' },
        { step: 3, action: '炒韭菜', time: 2, tools: [], note: '' },
        { step: 4, action: '放入鸡蛋翻炒', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '韭菜', amount: '15g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '韭菜、鸡蛋煮熟', time: 10, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '韭菜富含纤维和维生素A',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['韭菜不要炒太久', '保持翠绿']),
    tags: JSON.stringify(['韭菜', '快手', '家常']),
    is_active: true,
  });

  addRecipe({
    name: '辣椒炒蛋',
    name_en: 'Pepper with Egg',
    type: 'lunch',
    category: JSON.stringify(['快手', '辣椒', '家常']),
    prep_time: 10,
    cook_time: 8,
    total_time: 18,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '青椒', amount: '2个', note: '切丝' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '蒜', amount: '2瓣', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡蛋打散', time: 1, tools: [], note: '' },
        { step: 2, action: '炒鸡蛋盛出', time: 2, tools: [], note: '' },
        { step: 3, action: '炒蒜末、青椒', time: 3, tools: [], note: '' },
        { step: 4, action: '放入鸡蛋翻炒', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '青椒', amount: '15g', note: '去籽' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '青椒、鸡蛋煮熟', time: 10, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '青椒维C含量高',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['青椒要炒至断生', '大火快炒']),
    tags: JSON.stringify(['青椒', '快手', '家常']),
    is_active: true,
  });

  // ========== 汤类 ==========
  addRecipe({
    name: '冬瓜排骨汤',
    name_en: 'Winter Melon Ribs Soup',
    type: 'lunch',
    category: JSON.stringify(['汤类', '清淡', '夏季']),
    prep_time: 15,
    cook_time: 60,
    total_time: 75,
    difficulty: '简单',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '排骨', amount: '400g', note: '' },
        { name: '冬瓜', amount: '300g', note: '切块' },
        { name: '姜', amount: '5片', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '砂锅加水放排骨、姜', time: 3, tools: ['砂锅'], note: '' },
        { step: 3, action: '大火烧开，小火炖40分钟', time: 40, tools: [], note: '' },
        { step: 4, action: '加冬瓜再炖15分钟', time: 15, tools: [], note: '' },
        { step: 5, action: '加盐、葱花', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '排骨', amount: '20g', note: '' },
        { name: '冬瓜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨、冬瓜煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '冬瓜利尿，排骨补钙',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['一次性加足水', '冬瓜最后放']),
    tags: JSON.stringify(['冬瓜', '排骨', '汤']),
    is_active: true,
  });

  addRecipe({
    name: '莲藕排骨汤',
    name_en: 'Lotus Root Ribs Soup',
    type: 'lunch',
    category: JSON.stringify(['汤类', '养生', '秋季']),
    prep_time: 15,
    cook_time: 90,
    total_time: 105,
    difficulty: '简单',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '排骨', amount: '400g', note: '' },
        { name: '莲藕', amount: '300g', note: '切块' },
        { name: '花生', amount: '50g', note: '' },
        { name: '姜', amount: '5片', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨、莲藕分别焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '砂锅加水放所有食材', time: 3, tools: [], note: '' },
        { step: 3, action: '大火烧开，小火炖1.5小时', time: 90, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '排骨', amount: '20g', note: '' },
        { name: '莲藕', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨、莲藕煮烂', time: 60, tools: [], note: '' },
        { step: 2, action: '切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '莲藕清热润肺',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['莲藕要选粉藕', '炖的时间要够']),
    tags: JSON.stringify(['莲藕', '排骨', '汤']),
    is_active: true,
  });

  addRecipe({
    name: '丝瓜蛋汤',
    name_en: 'Luffa Egg Soup',
    type: 'breakfast',
    category: JSON.stringify(['汤类', '快手', '夏季']),
    prep_time: 5,
    cook_time: 10,
    total_time: 15,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '丝瓜', amount: '1根', note: '切片' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '紫菜', amount: '5g', note: '' },
      ],
      steps: [
        { step: 1, action: '丝瓜切片', time: 2, tools: [], note: '' },
        { step: 2, action: '烧水，放入丝瓜', time: 5, tools: [], note: '' },
        { step: 3, action: '关火，慢慢倒入蛋液', time: 2, tools: [], note: '' },
        { step: 4, action: '放入紫菜，加盐', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '香油', amount: '少许' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '丝瓜', amount: '20g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '丝瓜煮软', time: 8, tools: [], note: '' },
        { step: 2, action: '鸡蛋打散倒入', time: 3, tools: [], note: '' },
        { step: 3, action: '盛出放凉', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '丝瓜清热解暑',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['倒蛋液要关火', '保持蛋花漂亮']),
    tags: JSON.stringify(['丝瓜', '汤', '快手']),
    is_active: true,
  });

  addRecipe({
    name: '番茄蛋汤',
    name_en: 'Tomato Egg Soup',
    type: 'breakfast',
    category: JSON.stringify(['汤类', '快手', '家常']),
    prep_time: 5,
    cook_time: 10,
    total_time: 15,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '番茄', amount: '1个', note: '' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '葱花', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '番茄切块', time: 2, tools: [], note: '' },
        { step: 2, action: '炒番茄出汁', time: 5, tools: [], note: '' },
        { step: 3, action: '加水烧开', time: 3, tools: [], note: '' },
        { step: 4, action: '倒入蛋液', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '香油', amount: '少许' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '番茄', amount: '30g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '番茄煮软', time: 8, tools: [], note: '' },
        { step: 2, action: '鸡蛋打散倒入', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '番茄维C丰富',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['番茄炒出汁更浓', '蛋液要细水流']),
    tags: JSON.stringify(['番茄', '汤', '快手']),
    is_active: true,
  });

  // ========== 面食类 ==========
  addRecipe({
    name: '炸酱面',
    name_en: 'Noodles with Soy Bean Paste',
    type: 'lunch',
    category: JSON.stringify(['主食', '面食', '北京']),
    prep_time: 20,
    cook_time: 20,
    total_time: 40,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '面条', amount: '300g', note: '' },
        { name: '猪肉末', amount: '200g', note: '' },
        { name: '黄酱', amount: '3勺', note: '' },
        { name: '甜面酱', amount: '1勺', note: '' },
        { name: '黄瓜', amount: '1根', note: '切丝' },
        { name: '豆芽', amount: '100g', note: '' },
      ],
      steps: [
        { step: 1, action: '肉末炒散', time: 5, tools: [], note: '' },
        { step: 2, action: '加黄酱、甜面酱炒香', time: 10, tools: [], note: '' },
        { step: 3, action: '加少许水，小火煮10分钟', time: 10, tools: [], note: '' },
        { step: 4, action: '煮面条', time: 8, tools: ['锅'], note: '' },
        { step: 5, action: '配菜焯水', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '黄酱', amount: '3勺' },
        { name: '甜面酱', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '面条', amount: '30g', note: '' },
        { name: '猪肉末', amount: '15g', note: '' },
        { name: '黄瓜', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '肉酱炒熟', time: 10, tools: [], note: '' },
        { step: 2, action: '面条煮软', time: 10, tools: [], note: '' },
        { step: 3, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '炸酱味浓，少盐即可',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['酱要炒出香味', '配菜根据季节调整']),
    tags: JSON.stringify(['炸酱面', '北京', '面食']),
    is_active: true,
  });

  addRecipe({
    name: '热干面',
    name_en: 'Hot Dry Noodles',
    type: 'breakfast',
    category: JSON.stringify(['主食', '面食', '武汉']),
    prep_time: 15,
    cook_time: 10,
    total_time: 25,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '碱水面', amount: '300g', note: '' },
        { name: '芝麻酱', amount: '3勺', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '榨菜', amount: '30g', note: '切碎' },
        { name: '葱花', amount: '适量', note: '' },
        { name: '酸豆角', amount: '30g', note: '' },
      ],
      steps: [
        { step: 1, action: '面条煮至断生', time: 5, tools: ['锅'], note: '' },
        { step: 2, action: '捞出沥干', time: 2, tools: [], note: '' },
        { step: 3, action: '加芝麻酱、酱油拌匀', time: 3, tools: [], note: '' },
        { step: 4, action: '撒上榨菜、酸豆角、葱花', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '芝麻酱', amount: '3勺' },
        { name: '酱油', amount: '2勺' },
        { name: '醋', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '面条', amount: '30g', note: '' },
        { name: '芝麻酱', amount: '1小勺', note: '' },
      ],
      steps: [
        { step: 1, action: '面条煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '加芝麻酱拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '芝麻酱富含钙和维生素E',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['面条要沥干', '芝麻酱要调稀']),
    tags: JSON.stringify(['热干面', '武汉', '面食']),
    is_active: true,
  });

  addRecipe({
    name: '刀削面',
    name_en: 'Daoxiao Noodles',
    type: 'lunch',
    category: JSON.stringify(['主食', '面食', '山西']),
    prep_time: 30,
    cook_time: 15,
    total_time: 45,
    difficulty: '困难',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '面粉', amount: '300g', note: '' },
        { name: '猪肉', amount: '100g', note: '切片' },
        { name: '番茄', amount: '2个', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
        { name: '青菜', amount: '2颗', note: '' },
      ],
      steps: [
        { step: 1, action: '和面，醒30分钟', time: 30, tools: [], note: '' },
        { step: 2, action: '炒浇头：肉片、番茄、鸡蛋', time: 10, tools: [], note: '' },
        { step: 3, action: '烧水，削面入锅', time: 5, tools: ['锅'], note: '' },
        { step: 4, action: '放入青菜', time: 2, tools: [], note: '' },
        { step: 5, action: '盛入碗中，浇上浇头', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '面条', amount: '30g', note: '普通细面' },
        { name: '番茄', amount: '20g', note: '' },
      ],
      steps: [
        { step: 1, action: '面条煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '番茄煮软，混合', time: 5, tools: [], note: '' },
      ],
      nutrition_tips: '面食提供碳水化合物',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['和面要硬', '削面要掌握力度']),
    tags: JSON.stringify(['刀削面', '山西', '面食']),
    is_active: true,
  });

  addRecipe({
    name: '西红柿鸡蛋打卤面',
    name_en: 'Noodles with Tomato Egg Sauce',
    type: 'lunch',
    category: JSON.stringify(['主食', '面食', '家常']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '面条', amount: '300g', note: '' },
        { name: '番茄', amount: '2个', note: '' },
        { name: '鸡蛋', amount: '2个', note: '' },
        { name: '木耳', amount: '20g', note: '泡发' },
        { name: '黄花菜', amount: '20g', note: '泡发' },
      ],
      steps: [
        { step: 1, action: '番茄切块，鸡蛋打散', time: 3, tools: [], note: '' },
        { step: 2, action: '炒鸡蛋盛出', time: 3, tools: [], note: '' },
        { step: 3, action: '炒番茄出汁，加木耳、黄花菜', time: 8, tools: [], note: '' },
        { step: 4, action: '放入鸡蛋，水淀粉勾芡', time: 3, tools: [], note: '' },
        { step: 5, action: '煮面条，浇卤', time: 10, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1-1.5岁',
      ingredients: [
        { name: '面条', amount: '30g', note: '' },
        { name: '番茄', amount: '20g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
      ],
      steps: [
        { step: 1, action: '番茄、鸡蛋煮熟', time: 10, tools: [], note: '' },
        { step: 2, action: '面条煮软，混合压碎', time: 10, tools: [], note: '' },
      ],
      nutrition_tips: '营养全面的家常面',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['卤要稍微浓稠', '面条过冷水更Q']),
    tags: JSON.stringify(['打卤面', '家常', '面食']),
    is_active: true,
  });

  // ========== 粥类 ==========
  addRecipe({
    name: '皮蛋瘦肉粥',
    name_en: 'Century Egg Congee',
    type: 'breakfast',
    category: JSON.stringify(['主食', '粥', '广东']),
    prep_time: 10,
    cook_time: 40,
    total_time: 50,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '大米', amount: '100g', note: '' },
        { name: '皮蛋', amount: '1个', note: '' },
        { name: '瘦肉', amount: '100g', note: '' },
        { name: '姜', amount: '3片', note: '' },
        { name: '葱花', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '大米洗净，加水煮粥', time: 30, tools: ['锅'], note: '' },
        { step: 2, action: '瘦肉切丝，加盐腌制', time: 5, tools: [], note: '' },
        { step: 3, action: '皮蛋切小块', time: 2, tools: [], note: '' },
        { step: 4, action: '粥快好时放入肉丝和皮蛋', time: 10, tools: [], note: '' },
        { step: 5, action: '盛出撒葱花', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '胡椒粉', amount: '少许' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '大米', amount: '30g', note: '' },
        { name: '瘦肉', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '大米煮成稀粥', time: 30, tools: [], note: '' },
        { step: 2, action: '瘦肉煮熟切碎', time: 15, tools: [], note: '' },
        { step: 3, action: '混合', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '粥易消化，适合宝宝',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['粥要熬到粘稠', '皮蛋要最后放']),
    tags: JSON.stringify(['皮蛋瘦肉粥', '广东', '粥']),
    is_active: true,
  });

  addRecipe({
    name: '小米粥',
    name_en: 'Millet Congee',
    type: 'breakfast',
    category: JSON.stringify(['主食', '粥', '养胃']),
    prep_time: 5,
    cook_time: 30,
    total_time: 35,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '小米', amount: '100g', note: '' },
        { name: '水', amount: '800ml', note: '' },
      ],
      steps: [
        { step: 1, action: '小米洗净', time: 2, tools: [], note: '' },
        { step: 2, action: '加水，大火烧开', time: 5, tools: [], note: '' },
        { step: 3, action: '转小火熬30分钟', time: 30, tools: [], note: '' },
      ],
      seasonings: [],
    }),
    baby_version: JSON.stringify({
      age_range: '6-12月',
      ingredients: [{ name: '小米', amount: '20g', note: '' }],
      steps: [
        { step: 1, action: '小米煮成稀粥', time: 30, tools: [], note: '' },
        { step: 2, action: '取上面稀的部分', time: 1, tools: [], note: '' },
      ],
      nutrition_tips: '小米养胃，易消化',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['小米要选新米', '小火慢熬']),
    tags: JSON.stringify(['小米粥', '养胃', '粥']),
    is_active: true,
  });

  addRecipe({
    name: '八宝粥',
    name_en: 'Mixed Congee',
    type: 'breakfast',
    category: JSON.stringify(['主食', '粥', '营养']),
    prep_time: 10,
    cook_time: 60,
    total_time: 70,
    difficulty: '简单',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '大米', amount: '50g', note: '' },
        { name: '糯米', amount: '30g', note: '' },
        { name: '红豆', amount: '20g', note: '' },
        { name: '绿豆', amount: '20g', note: '' },
        { name: '花生', amount: '20g', note: '' },
        { name: '红枣', amount: '5颗', note: '' },
        { name: '莲子', amount: '10g', note: '' },
        { name: '桂圆', amount: '5颗', note: '' },
      ],
      steps: [
        { step: 1, action: '所有食材提前泡2小时', time: 120, tools: [], note: '' },
        { step: 2, action: '加水，大火烧开', time: 10, tools: [], note: '' },
        { step: 3, action: '转小火熬1小时', time: 60, tools: [], note: '' },
      ],
      seasonings: [
        { name: '白糖', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '大米', amount: '20g', note: '' },
        { name: '红豆', amount: '5g', note: '' },
        { name: '红枣', amount: '1颗', note: '' },
      ],
      steps: [
        { step: 1, action: '食材提前泡', time: 60, tools: [], note: '' },
        { step: 2, action: '煮烂成粥', time: 40, tools: [], note: '' },
        { step: 3, action: '去核切碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '八宝粥营养全面',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['食材要提前泡', '熬到粘稠']),
    tags: JSON.stringify(['八宝粥', '营养', '粥']),
    is_active: true,
  });

  // ========== 甜品类 ==========
  addRecipe({
    name: '红糖糍粑',
    name_en: 'Brown Sugar Rice Cake',
    type: 'snack',
    category: JSON.stringify(['甜点', '小吃', '四川']),
    prep_time: 20,
    cook_time: 15,
    total_time: 35,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '糯米', amount: '200g', note: '' },
        { name: '红糖', amount: '50g', note: '' },
        { name: '黄豆粉', amount: '30g', note: '' },
      ],
      steps: [
        { step: 1, action: '糯米浸泡4小时，蒸熟', time: 30, tools: ['蒸锅'], note: '' },
        { step: 2, action: '放入容器压实', time: 3, tools: [], note: '' },
        { step: 3, action: '冷却后切块', time: 10, tools: [], note: '' },
        { step: 4, action: '油炸至金黄', time: 5, tools: ['锅'], note: '' },
        { step: 5, action: '撒黄豆粉，红糖水浇上', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '红糖', amount: '50g' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '糯米', amount: '20g', note: '' },
        { name: '红糖', amount: '5g', note: '' },
      ],
      steps: [
        { step: 1, action: '糯米煮成粥', time: 20, tools: [], note: '' },
        { step: 2, action: '加入红糖融化', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '糯米补中益气',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['糯米要蒸透', '炸的时候油温不要太高']),
    tags: JSON.stringify(['红糖糍粑', '四川', '甜点']),
    is_active: true,
  });

  addRecipe({
    name: '酒酿圆子',
    name_en: 'Glutinous Rice Balls in Sweet Wine',
    type: 'snack',
    category: JSON.stringify(['甜点', '小吃', '江浙']),
    prep_time: 15,
    cook_time: 10,
    total_time: 25,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '糯米粉', amount: '100g', note: '' },
        { name: '酒酿', amount: '100g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
        { name: '白糖', amount: '2勺', note: '' },
        { name: '桂花', amount: '少许', note: '' },
      ],
      steps: [
        { step: 1, action: '糯米粉加水揉成团', time: 5, tools: [], note: '' },
        { step: 2, action: '搓成小圆子', time: 10, tools: [], note: '' },
        { step: 3, action: '烧水，放入圆子煮至浮起', time: 5, tools: [], note: '' },
        { step: 4, action: '放入酒酿、鸡蛋', time: 3, tools: [], note: '' },
        { step: 5, action: '盛出撒桂花', time: 1, tools: [], note: '' },
      ],
      seasonings: [
        { name: '白糖', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '糯米粉', amount: '20g', note: '' },
        { name: '酒酿', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '搓小圆子煮熟', time: 10, tools: [], note: '' },
        { step: 2, action: '加入少量酒酿', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '酒酿活血暖身',
      allergy_alert: '对糯米过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['圆子要搓小', '酒酿最后放']),
    tags: JSON.stringify(['酒酿圆子', '江浙', '甜点']),
    is_active: true,
  });

  // ========== 继续添加更多菜品 ==========
  addRecipe({
    name: '蚂蚁上树',
    name_en: 'Mapo Tofu Noodles',
    type: 'dinner',
    category: JSON.stringify(['川菜', '粉丝', '麻辣']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '粉丝', amount: '100g', note: '' },
        { name: '猪肉末', amount: '100g', note: '' },
        { name: '郫县豆瓣酱', amount: '2勺', note: '' },
        { name: '蒜', amount: '3瓣', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '粉丝泡软', time: 10, tools: [], note: '' },
        { step: 2, action: '炒肉末加豆瓣酱', time: 5, tools: [], note: '' },
        { step: 3, action: '加水和粉丝', time: 3, tools: [], note: '' },
        { step: 4, action: '收汁撒葱花', time: 3, tools: [], note: '' },
      ],
      seasonings: [
        { name: '郫县豆瓣酱', amount: '2勺' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '粉丝', amount: '15g', note: '' },
        { name: '猪肉末', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '粉丝煮软', time: 10, tools: [], note: '' },
        { step: 2, action: '肉末炒熟，混合切碎', time: 8, tools: [], note: '' },
      ],
      nutrition_tips: '粉丝提供碳水',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['粉丝不要泡太久', '大火收汁']),
    tags: JSON.stringify(['蚂蚁上树', '川菜', '粉丝']),
    is_active: true,
  });

  addRecipe({
    name: '蒜香排骨',
    name_en: 'Garlic Ribs',
    type: 'dinner',
    category: JSON.stringify(['肉类', '排骨', '蒜香']),
    prep_time: 20,
    cook_time: 25,
    total_time: 45,
    difficulty: '中等',
    servings: '2人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '排骨', amount: '400g', note: '' },
        { name: '大蒜', amount: '1头', note: '' },
        { name: '淀粉', amount: '2勺', note: '' },
        { name: '椒盐', amount: '1勺', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨洗净，加盐腌制', time: 10, tools: [], note: '' },
        { step: 2, action: '大蒜捣成蒜泥', time: 5, tools: [], note: '' },
        { step: 3, action: '排骨裹淀粉炸至金黄', time: 15, tools: ['锅'], note: '' },
        { step: 4, action: '撒椒盐蒜末', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '椒盐', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '排骨', amount: '30g', note: '' }],
      steps: [
        { step: 1, action: '排骨煮熟', time: 20, tools: [], note: '' },
        { step: 2, action: '去骨切碎', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '排骨补钙',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['蒜要炸透', '复炸更酥']),
    tags: JSON.stringify(['蒜香排骨', '排骨', '炸']),
    is_active: true,
  });

  addRecipe({
    name: '红烧狮子头',
    name_en: 'Braised Pork Balls',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肉', '扬州']),
    prep_time: 30,
    cook_time: 60,
    total_time: 90,
    difficulty: '困难',
    servings: '4人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪肉', amount: '500g', note: '三分肥七分瘦' },
        { name: '马蹄', amount: '100g', note: '' },
        { name: '鸡蛋', amount: '1个', note: '' },
        { name: '淀粉', amount: '2勺', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
      ],
      steps: [
        { step: 1, action: '猪肉、马蹄剁成肉泥', time: 15, tools: [], note: '' },
        { step: 2, action: '加盐、淀粉、鸡蛋搅拌上劲', time: 10, tools: [], note: '' },
        { step: 3, action: '搓成大肉圆，油炸定型', time: 10, tools: ['锅'], note: '' },
        { step: 4, action: '加水、酱油焖1小时', time: 60, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '盐', amount: '适量' },
        { name: '料酒', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '猪肉', amount: '20g', note: '' },
        { name: '马蹄', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '猪肉、马蹄煮烂', time: 20, tools: [], note: '' },
        { step: 2, action: '压成小块', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '狮子头软糯易消化',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['肉要剁细腻', '小火慢炖']),
    tags: JSON.stringify(['红烧狮子头', '扬州', '猪肉']),
    is_active: true,
  });

  addRecipe({
    name: '珍珠丸子',
    name_en: 'Pearl Meatballs',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肉', '蒸菜']),
    prep_time: 25,
    cook_time: 20,
    total_time: 45,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '猪肉', amount: '300g', note: '' },
        { name: '糯米', amount: '100g', note: '提前泡4小时' },
        { name: '马蹄', amount: '50g', note: '' },
        { name: '姜', amount: '3片', note: '' },
        { name: '葱', amount: '2根', note: '' },
      ],
      steps: [
        { step: 1, action: '猪肉、马蹄、姜葱剁成泥', time: 15, tools: [], note: '' },
        { step: 2, action: '加盐、淀粉搅拌上劲', time: 5, tools: [], note: '' },
        { step: 3, action: '搓成小圆子，裹上糯米', time: 10, tools: [], note: '' },
        { step: 4, action: '上锅蒸20分钟', time: 20, tools: ['蒸锅'], note: '' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '酱油', amount: '1勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '猪肉', amount: '20g', note: '' },
        { name: '糯米', amount: '10g', note: '' },
      ],
      steps: [
        { step: 1, action: '糯米煮熟', time: 20, tools: [], note: '' },
        { step: 2, action: '猪肉煮熟，混合压碎', time: 15, tools: [], note: '' },
      ],
      nutrition_tips: '糯米搭配肉类营养更全',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['糯米要提前泡', '蒸的时间要够']),
    tags: JSON.stringify(['珍珠丸子', '蒸菜', '猪肉']),
    is_active: true,
  });

  addRecipe({
    name: '东坡肉',
    name_en: 'Dongpo Pork',
    type: 'dinner',
    category: JSON.stringify(['肉类', '猪肉', '杭州']),
    prep_time: 20,
    cook_time: 180,
    total_time: 200,
    difficulty: '困难',
    servings: '4人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '五花肉', amount: '500g', note: '方形' },
        { name: '黄酒', amount: '250ml', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
        { name: '白糖', amount: '2勺', note: '' },
        { name: '姜', amount: '5片', note: '' },
        { name: '葱', amount: '3根', note: '' },
      ],
      steps: [
        { step: 1, action: '五花肉切大方块，焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '砂锅底铺葱姜，放肉块', time: 3, tools: [], note: '' },
        { step: 3, action: '加黄酒、酱油、糖', time: 2, tools: [], note: '' },
        { step: 4, action: '大火烧开，小火炖3小时', time: 180, tools: [], note: '' },
        { step: 5, action: '肉皮朝上装盘', time: 2, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '白糖', amount: '2勺' },
        { name: '黄酒', amount: '250ml' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '五花肉', amount: '20g', note: '瘦肉部分' }],
      steps: [
        { step: 1, action: '五花肉蒸熟', time: 40, tools: ['蒸锅'], note: '' },
        { step: 2, action: '去皮压碎', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '东坡肉酥烂，入口即化',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['要用小火慢炖', '选五花肉']),
    tags: JSON.stringify(['东坡肉', '杭州', '猪肉']),
    is_active: true,
  });

  addRecipe({
    name: '无锡排骨',
    name_en: 'Wuxi Ribs',
    type: 'dinner',
    category: JSON.stringify(['肉类', '排骨', '无锡']),
    prep_time: 15,
    cook_time: 90,
    total_time: 105,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '排骨', amount: '500g', note: '' },
        { name: '酱油', amount: '3勺', note: '' },
        { name: '白糖', amount: '3勺', note: '' },
        { name: '醋', amount: '2勺', note: '' },
        { name: '八角', amount: '2个', note: '' },
        { name: '桂皮', amount: '1小块', note: '' },
      ],
      steps: [
        { step: 1, action: '排骨焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '炒糖色，放入排骨翻炒', time: 5, tools: [], note: '' },
        { step: 3, action: '加酱油、醋、八角、桂皮', time: 3, tools: [], note: '' },
        { step: 4, action: '加水没过排骨，大火烧开', time: 5, tools: [], note: '' },
        { step: 5, action: '小火炖1.5小时', time: 90, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '3勺' },
        { name: '白糖', amount: '3勺' },
        { name: '醋', amount: '2勺' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [{ name: '排骨', amount: '25g', note: '' }],
      steps: [
        { step: 1, action: '排骨煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '去骨切碎', time: 3, tools: [], note: '' },
      ],
      nutrition_tips: '无锡排骨色泽红亮',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['糖色要炒好', '小火慢炖']),
    tags: JSON.stringify(['无锡排骨', '排骨', '无锡']),
    is_active: true,
  });

  addRecipe({
    name: '萝卜烧牛肉',
    name_en: 'Braised Beef with Radish',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '冬季']),
    prep_time: 15,
    cook_time: 90,
    total_time: 105,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛肉', amount: '400g', note: '切块' },
        { name: '白萝卜', amount: '400g', note: '切块' },
        { name: '酱油', amount: '2勺', note: '' },
        { name: '糖', amount: '1勺', note: '' },
        { name: '姜', amount: '5片', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、萝卜分别焯水', time: 10, tools: [], note: '' },
        { step: 2, action: '炒香姜片，加牛肉翻炒', time: 5, tools: [], note: '' },
        { step: 3, action: '加酱油、糖、水', time: 2, tools: [], note: '' },
        { step: 4, action: '烧开转小火炖1小时', time: 60, tools: [], note: '' },
        { step: 5, action: '加萝卜再炖30分钟', time: 30, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '糖', amount: '1勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛肉', amount: '20g', note: '' },
        { name: '白萝卜', amount: '15g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、萝卜煮烂', time: 50, tools: [], note: '' },
        { step: 2, action: '切碎混合', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '萝卜助消化，牛肉补铁',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['萝卜要后放', '牛肉要选带肥的']),
    tags: JSON.stringify(['萝卜烧牛肉', '牛肉', '冬季']),
    is_active: true,
  });

  addRecipe({
    name: '土豆烧牛肉',
    name_en: 'Beef with Potatoes',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '家常']),
    prep_time: 15,
    cook_time: 60,
    total_time: 75,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      ingredients: [
        { name: '牛肉', amount: '400g', note: '切块' },
        { name: '土豆', amount: '300g', note: '切块' },
        { name: '番茄', amount: '2个', note: '' },
        { name: '洋葱', amount: '1个', note: '' },
        { name: '酱油', amount: '2勺', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、土豆、番茄切块', time: 10, tools: [], note: '' },
        { step: 2, action: '炒牛肉变色', time: 5, tools: [], note: '' },
        { step: 3, action: '加番茄、酱油、水', time: 3, tools: [], note: '' },
        { step: 4, action: '烧开后小火炖40分钟', time: 40, tools: [], note: '' },
        { step: 5, action: '加土豆再炖15分钟', time: 15, tools: [], note: '' },
      ],
      seasonings: [
        { name: '酱油', amount: '2勺' },
        { name: '盐', amount: '适量' },
      ],
    }),
    baby_version: JSON.stringify({
      age_range: '1.5-2岁',
      ingredients: [
        { name: '牛肉', amount: '20g', note: '' },
        { name: '土豆', amount: '20g', note: '' },
      ],
      steps: [
        { step: 1, action: '牛肉、土豆煮烂', time: 40, tools: [], note: '' },
        { step: 2, action: '切碎拌匀', time: 2, tools: [], note: '' },
      ],
      nutrition_tips: '土豆牛肉是经典搭配',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['土豆要后放', '炖到软烂']),
    tags: JSON.stringify(['土豆烧牛肉', '牛肉', '家常']),
    is_active: true,
  });

  // 插入所有菜谱
  await knex('recipes').insert(recipes);
  console.log(`Added ${recipes.length} new recipes`);
}
