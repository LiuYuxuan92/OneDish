/**
 * 直接导入配对菜谱到数据库
 * 适配现有表结构（无 main_ingredients 和 sync_cooking 列）
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../dev.sqlite3');
console.log('[信息] 数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[错误] 无法连接数据库:', err.message);
    process.exit(1);
  }
  console.log('[成功] 已连接到 SQLite 数据库\n');
});

// 配对菜谱数据 - 适配现有表结构
const pairedRecipes = [
  {
    id: 'recipe_p01',
    name: '红烧鸡翅 / 鸡肉蔬菜泥',
    name_en: 'Braised Chicken Wings / Chicken Veggie Puree',
    type: 'dinner',
    category: JSON.stringify(['肉类', '家常', '一菜两吃']),
    prep_time: 25,
    cook_time: 20,
    total_time: 45,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '红烧鸡翅',
      main_ingredients: [
        { name: '鸡翅中', amount: '8个(约300g)' },
        { name: '胡萝卜', amount: '1根' },
        { name: '姜片', amount: '3片' },
      ],
      ingredients: [
        { name: '鸡翅中', amount: '8个', note: '约300g，表面划刀' },
        { name: '胡萝卜', amount: '1根', note: '切滚刀块' },
        { name: '姜片', amount: '3片', note: '' },
        { name: '大葱', amount: '1根', note: '切段' },
        { name: '食用油', amount: '适量', note: '' },
      ],
      seasonings: [
        { name: '生抽', amount: '1勺', note: '' },
        { name: '老抽', amount: '半勺', note: '' },
        { name: '料酒', amount: '1勺', note: '' },
        { name: '白糖', amount: '1小勺', note: '' },
        { name: '盐', amount: '适量', note: '' },
      ],
      steps: [
        { step: 1, action: '鸡翅洗净擦干，两面划两刀方便入味', time: 5 },
        { step: 2, action: '冷水下锅焯水，加姜片煮沸后捞出洗净浮沫', time: 5, note: '🔥 和宝宝版共用此步骤' },
        { step: 3, action: '锅中放少量油，放入鸡翅小火煎至两面金黄', time: 5 },
        { step: 4, action: '加入胡萝卜块、姜片、所有调料和适量水', time: 2 },
        { step: 5, action: '大火煮沸后转小火焖煮15分钟至软烂', time: 15 },
        { step: 6, action: '大火收汁，撒上葱花出锅', time: 3 },
      ],
      tags: ['下饭菜', '家常菜', '补钙'],
    }),
    baby_version: JSON.stringify({
      name: '鸡肉蔬菜泥',
      age_range: '8-18个月',
      main_ingredients: [
        { name: '鸡翅中', amount: '2个肉量' },
        { name: '胡萝卜', amount: '30g' },
      ],
      ingredients: [
        { name: '鸡翅肉', amount: '2个鸡翅的肉量', note: '从大人版已焯水的鸡翅中取出' },
        { name: '胡萝卜', amount: '30g', note: '切小丁' },
        { name: '西兰花', amount: '2小朵', note: '约20g' },
        { name: '温水', amount: '20ml', note: '打泥用' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '从焯水的鸡翅中取出2个，去骨取肉', time: 5, note: '仔细检查小骨头' },
        { step: 2, action: '胡萝卜切小丁，西兰花取花朵部分切小', time: 3 },
        { step: 3, action: '鸡肉、胡萝卜、西兰花一起蒸15分钟至软烂', time: 15, note: '🔥 可以和大人版同时蒸制' },
        { step: 4, action: '将蒸好的食材放入料理机，加少量温水打成细腻泥状', time: 3 },
        { step: 5, action: '装入宝宝碗，滴1-2滴核桃油（可选）', time: 1 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['食材清洗处理', '焯水去腥（共用同一锅水）'],
        time_saving: '共用焯水步骤，节省5分钟',
        tips: '建议先处理宝宝版的去骨，再处理大人版',
      },
      nutrition_tips: '鸡肉提供优质蛋白质和铁元素；胡萝卜富含β-胡萝卜素',
      allergy_alert: '对鸡肉过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['鸡翅可以在表面划两刀，更易入味', '焯水时冷水下锅，能更好去除血水']),
    tags: JSON.stringify(['一菜两吃', '鸡肉', '宝宝辅食']),
    is_active: true,
  },
  {
    id: 'recipe_p02',
    name: '清蒸鲈鱼 / 鲈鱼肉泥',
    name_en: 'Steamed Sea Bass / Bass Puree',
    type: 'dinner',
    category: JSON.stringify(['海鲜', '清淡', '一菜两吃']),
    prep_time: 15,
    cook_time: 12,
    total_time: 27,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '清蒸鲈鱼',
      main_ingredients: [
        { name: '鲈鱼', amount: '1条(约500g)' },
        { name: '姜', amount: '1块' },
      ],
      ingredients: [
        { name: '鲈鱼', amount: '1条', note: '约500g' },
        { name: '葱', amount: '2根', note: '切丝' },
        { name: '姜', amount: '1块', note: '切片' },
      ],
      seasonings: [
        { name: '蒸鱼豉油', amount: '2勺' },
        { name: '料酒', amount: '1勺' },
        { name: '食用油', amount: '适量' },
      ],
      steps: [
        { step: 1, action: '鲈鱼去鳞去内脏洗净', time: 5 },
        { step: 2, action: '鱼身划几刀，抹料酒姜片腌制', time: 5 },
        { step: 3, action: '大火蒸8-10分钟', time: 10 },
        { step: 4, action: '出锅淋蒸鱼豉油和热油', time: 2 },
      ],
      tags: ['清淡', '高蛋白'],
    }),
    baby_version: JSON.stringify({
      name: '鲈鱼肉泥',
      age_range: '9-18个月',
      main_ingredients: [
        { name: '鲈鱼', amount: '50g鱼肉' },
        { name: '姜', amount: '2片' },
      ],
      ingredients: [
        { name: '鲈鱼肉', amount: '50g', note: '取腹部无刺肉' },
        { name: '姜片', amount: '2片', note: '去腥用' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '取鱼腹肉，仔细检查去刺', time: 5 },
        { step: 2, action: '放姜片蒸8分钟', time: 8 },
        { step: 3, action: '用勺子压成鱼泥', time: 2 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['处理鲈鱼'],
        time_saving: '同时蒸制，节省8分钟',
        tips: '宝宝鱼肉选鱼腹，刺少肉嫩',
      },
      nutrition_tips: '鲈鱼富含优质蛋白和DHA，促进大脑发育',
      allergy_alert: '对鱼类过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['选择眼睛清澈、鱼鳃鲜红的鲈鱼', '蒸鱼时间不宜过长']),
    tags: JSON.stringify(['一菜两吃', '鱼类', 'DHA']),
    is_active: true,
  },
  {
    id: 'recipe_p03',
    name: '糖醋排骨 / 排骨肉泥粥',
    name_en: 'Sweet & Sour Ribs / Rib Porridge',
    type: 'dinner',
    category: JSON.stringify(['肉类', '下饭菜', '一菜两吃']),
    prep_time: 30,
    cook_time: 45,
    total_time: 75,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      name: '糖醋排骨',
      main_ingredients: [
        { name: '猪小排', amount: '500g' },
        { name: '姜', amount: '1块' },
      ],
      ingredients: [
        { name: '猪小排', amount: '500g', note: '切小段' },
        { name: '姜', amount: '1块', note: '切片' },
      ],
      seasonings: [
        { name: '生抽', amount: '2勺' },
        { name: '醋', amount: '3勺' },
        { name: '白糖', amount: '3勺' },
        { name: '料酒', amount: '1勺' },
      ],
      steps: [
        { step: 1, action: '排骨冷水下锅焯水', time: 5 },
        { step: 2, action: '锅中放油，排骨煎至金黄', time: 8 },
        { step: 3, action: '加调料和水，小火炖40分钟', time: 40 },
        { step: 4, action: '大火收汁', time: 5 },
      ],
      tags: ['下饭菜', '经典菜'],
    }),
    baby_version: JSON.stringify({
      name: '排骨肉泥粥',
      age_range: '10-24个月',
      main_ingredients: [
        { name: '猪小排', amount: '30g肉' },
      ],
      ingredients: [
        { name: '排骨肉', amount: '30g', note: '焯水后取肉' },
        { name: '大米', amount: '30g' },
        { name: '胡萝卜', amount: '20g', note: '切丁' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '从焯水排骨中取肉，去骨', time: 5 },
        { step: 2, action: '大米煮粥，加入肉碎和胡萝卜', time: 30 },
        { step: 3, action: '煮至软烂', time: 10 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['排骨焯水'],
        time_saving: '共用焯水，节省5分钟',
        tips: '先焯水，再分锅制作',
      },
      nutrition_tips: '排骨提供钙质，大米提供碳水化合物',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['选择猪小排，肉质更嫩', '糖醋比例黄金比例是3:2']),
    tags: JSON.stringify(['一菜两吃', '猪肉', '补钙']),
    is_active: true,
  },
  {
    id: 'recipe_p04',
    name: '南瓜蒸排骨 / 南瓜泥',
    name_en: 'Steamed Pork Ribs with Pumpkin / Pumpkin Puree',
    type: 'dinner',
    category: JSON.stringify(['蔬菜', '肉类', '一菜两吃']),
    prep_time: 20,
    cook_time: 25,
    total_time: 45,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '南瓜蒸排骨',
      main_ingredients: [
        { name: '南瓜', amount: '300g' },
        { name: '排骨', amount: '300g' },
      ],
      ingredients: [
        { name: '南瓜', amount: '300g', note: '切厚片' },
        { name: '排骨', amount: '300g', note: '切段' },
        { name: '蒜', amount: '3瓣', note: '切末' },
      ],
      seasonings: [
        { name: '生抽', amount: '1勺' },
        { name: '蚝油', amount: '半勺' },
        { name: '淀粉', amount: '1勺' },
      ],
      steps: [
        { step: 1, action: '排骨加调料腌制15分钟', time: 15 },
        { step: 2, action: '南瓜铺盘底，放上排骨', time: 3 },
        { step: 3, action: '大火蒸25分钟', time: 25 },
      ],
      tags: ['健康', '原味'],
    }),
    baby_version: JSON.stringify({
      name: '南瓜泥',
      age_range: '6-18个月',
      main_ingredients: [
        { name: '南瓜', amount: '50g' },
      ],
      ingredients: [
        { name: '南瓜', amount: '50g', note: '切小块' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '南瓜切小块', time: 2 },
        { step: 2, action: '和大人版一起蒸25分钟', time: 25, note: '共用蒸锅' },
        { step: 3, action: '压成泥状', time: 3 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['蒸制'],
        time_saving: '共用蒸锅，节省25分钟',
        tips: '宝宝南瓜放上层，蒸软后压泥',
      },
      nutrition_tips: '南瓜富含胡萝卜素，易消化吸收',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['选择老南瓜，表皮发黄、有白霜的会更甜', '南瓜切厚片，蒸后不会散']),
    tags: JSON.stringify(['一菜两吃', '南瓜', '素食']),
    is_active: true,
  },
  {
    id: 'recipe_p05',
    name: '麻婆豆腐 / 豆腐蛋羹',
    name_en: 'Mapo Tofu / Tofu Egg Custard',
    type: 'dinner',
    category: JSON.stringify(['豆制品', '川菜', '一菜两吃']),
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '麻婆豆腐',
      main_ingredients: [
        { name: '嫩豆腐', amount: '300g' },
      ],
      ingredients: [
        { name: '嫩豆腐', amount: '300g', note: '切小块' },
        { name: '肉末', amount: '50g' },
        { name: '豆瓣酱', amount: '1勺' },
      ],
      seasonings: [
        { name: '花椒粉', amount: '适量' },
        { name: '生抽', amount: '1勺' },
        { name: '淀粉水', amount: '适量' },
      ],
      steps: [
        { step: 1, action: '豆腐切小块，淡盐水浸泡', time: 5 },
        { step: 2, action: '肉末炒香，加豆瓣酱炒出红油', time: 3 },
        { step: 3, action: '加豆腐和水，煮5分钟', time: 5 },
        { step: 4, action: '勾芡撒花椒粉', time: 2 },
      ],
      tags: ['川菜', '下饭菜'],
    }),
    baby_version: JSON.stringify({
      name: '豆腐蛋羹',
      age_range: '10-24个月',
      main_ingredients: [
        { name: '嫩豆腐', amount: '50g' },
        { name: '鸡蛋', amount: '1个' },
      ],
      ingredients: [
        { name: '嫩豆腐', amount: '50g', note: '压碎' },
        { name: '鸡蛋', amount: '1个' },
        { name: '温水', amount: '30ml' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '豆腐压碎', time: 2 },
        { step: 2, action: '鸡蛋加温水打散', time: 2 },
        { step: 3, action: '混合后蒸10分钟', time: 10 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: [],
        time_saving: '分别制作',
        tips: '豆腐各取所需量分开制作',
      },
      nutrition_tips: '豆腐提供植物蛋白，鸡蛋提供动物蛋白',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['豆腐用盐水浸泡可以去豆腥味', '炒豆腐时用锅铲背轻推']),
    tags: JSON.stringify(['一菜两吃', '豆腐', '高蛋白']),
    is_active: true,
  },
  {
    id: 'recipe_p06',
    name: '番茄炒蛋 / 番茄蛋花羹',
    name_en: 'Tomato Egg Stir-fry / Tomato Egg Soup',
    type: 'dinner',
    category: JSON.stringify(['蔬菜', '家常', '一菜两吃']),
    prep_time: 10,
    cook_time: 10,
    total_time: 20,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '番茄炒蛋',
      main_ingredients: [
        { name: '番茄', amount: '2个' },
        { name: '鸡蛋', amount: '3个' },
      ],
      ingredients: [
        { name: '番茄', amount: '2个', note: '切块' },
        { name: '鸡蛋', amount: '3个', note: '打散' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '糖', amount: '1小勺' },
        { name: '葱', amount: '适量' },
      ],
      steps: [
        { step: 1, action: '鸡蛋炒熟盛出', time: 3 },
        { step: 2, action: '番茄炒出汁', time: 5 },
        { step: 3, action: '倒入鸡蛋翻炒', time: 2 },
      ],
      tags: ['家常菜', '快手菜'],
    }),
    baby_version: JSON.stringify({
      name: '番茄蛋花羹',
      age_range: '10-24个月',
      main_ingredients: [
        { name: '番茄', amount: '1个' },
        { name: '鸡蛋', amount: '1个' },
      ],
      ingredients: [
        { name: '番茄', amount: '1个', note: '去皮切丁' },
        { name: '鸡蛋', amount: '1个' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '番茄去皮切丁', time: 3 },
        { step: 2, action: '番茄煮软加水', time: 5 },
        { step: 3, action: '淋入蛋液成蛋花', time: 2 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['番茄处理'],
        time_saving: '共用番茄处理',
        tips: '番茄先烫去皮',
      },
      nutrition_tips: '番茄富含维生素C，鸡蛋提供优质蛋白',
      allergy_alert: '对鸡蛋过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['番茄选熟透的更容易出汁', '炒蛋油温要高']),
    tags: JSON.stringify(['一菜两吃', '快手菜']),
    is_active: true,
  },
  {
    id: 'recipe_p07',
    name: '土豆炖牛肉 / 牛肉土豆泥',
    name_en: 'Beef Stew with Potatoes / Beef Potato Puree',
    type: 'dinner',
    category: JSON.stringify(['肉类', '家常', '一菜两吃']),
    prep_time: 30,
    cook_time: 90,
    total_time: 120,
    difficulty: '中等',
    servings: '3人份',
    adult_version: JSON.stringify({
      name: '土豆炖牛肉',
      main_ingredients: [
        { name: '牛腩', amount: '500g' },
        { name: '土豆', amount: '2个' },
      ],
      ingredients: [
        { name: '牛腩', amount: '500g', note: '切块' },
        { name: '土豆', amount: '2个', note: '切块' },
        { name: '胡萝卜', amount: '1根' },
      ],
      seasonings: [
        { name: '生抽', amount: '2勺' },
        { name: '老抽', amount: '1勺' },
        { name: '料酒', amount: '1勺' },
      ],
      steps: [
        { step: 1, action: '牛肉冷水焯水', time: 5 },
        { step: 2, action: '炒香牛肉，加调料', time: 5 },
        { step: 3, action: '加水炖1.5小时', time: 90 },
        { step: 4, action: '加土豆炖20分钟', time: 20 },
      ],
      tags: ['家常菜', '硬菜'],
    }),
    baby_version: JSON.stringify({
      name: '牛肉土豆泥',
      age_range: '10-24个月',
      main_ingredients: [
        { name: '牛腩', amount: '30g' },
        { name: '土豆', amount: '半个' },
      ],
      ingredients: [
        { name: '牛腩肉', amount: '30g', note: '炖烂后取肉' },
        { name: '土豆', amount: '半个' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '从炖好的牛肉中取肉', time: 2 },
        { step: 2, action: '土豆蒸熟', time: 20 },
        { step: 3, action: '肉切碎和土豆一起压泥', time: 3 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['牛肉焯水', '炖煮'],
        time_saving: '共用炖煮，节省1.5小时',
        tips: '宝宝肉单独取出切碎',
      },
      nutrition_tips: '牛肉补铁，土豆提供能量',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['牛腩选肥瘦相间', '炖煮时间要足']),
    tags: JSON.stringify(['一菜两吃', '补铁']),
    is_active: true,
  },
  {
    id: 'recipe_p08',
    name: '蒜蓉粉丝虾 / 虾仁泥',
    name_en: 'Garlic Shrimp with Vermicelli / Shrimp Puree',
    type: 'dinner',
    category: JSON.stringify(['海鲜', '清淡', '一菜两吃']),
    prep_time: 20,
    cook_time: 8,
    total_time: 28,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '蒜蓉粉丝虾',
      main_ingredients: [
        { name: '鲜虾', amount: '300g' },
        { name: '粉丝', amount: '1把' },
      ],
      ingredients: [
        { name: '鲜虾', amount: '300g', note: '开背去虾线' },
        { name: '粉丝', amount: '1把', note: '泡软' },
        { name: '蒜', amount: '1头', note: '切末' },
      ],
      seasonings: [
        { name: '生抽', amount: '2勺' },
        { name: '蚝油', amount: '1勺' },
      ],
      steps: [
        { step: 1, action: '虾开背去虾线', time: 10 },
        { step: 2, action: '粉丝铺底，放虾', time: 3 },
        { step: 3, action: '撒蒜蓉蒸8分钟', time: 8 },
        { step: 4, action: '淋生抽和热油', time: 2 },
      ],
      tags: ['海鲜', '快手菜'],
    }),
    baby_version: JSON.stringify({
      name: '虾仁泥',
      age_range: '10-24个月',
      main_ingredients: [
        { name: '鲜虾', amount: '3只' },
      ],
      ingredients: [
        { name: '虾仁', amount: '3只', note: '去虾线' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '虾仁去虾线洗净', time: 5 },
        { step: 2, action: '蒸8分钟至熟', time: 8 },
        { step: 3, action: '压成泥', time: 2 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['处理虾'],
        time_saving: '共用处理时间',
        tips: '先取3只给宝宝专用',
      },
      nutrition_tips: '虾富含优质蛋白和钙',
      allergy_alert: '对虾过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['选活虾或冰鲜虾', '蒸虾时间不要过长']),
    tags: JSON.stringify(['一菜两吃', '海鲜']),
    is_active: true,
  },
  {
    id: 'recipe_p09',
    name: '冬瓜排骨汤 / 冬瓜肉泥',
    name_en: 'Winter Melon Rib Soup / Winter Melon Puree',
    type: 'dinner',
    category: JSON.stringify(['汤类', '清淡', '一菜两吃']),
    prep_time: 20,
    cook_time: 60,
    total_time: 80,
    difficulty: '简单',
    servings: '3人份',
    adult_version: JSON.stringify({
      name: '冬瓜排骨汤',
      main_ingredients: [
        { name: '冬瓜', amount: '500g' },
        { name: '排骨', amount: '300g' },
      ],
      ingredients: [
        { name: '冬瓜', amount: '500g', note: '切块' },
        { name: '排骨', amount: '300g' },
        { name: '姜', amount: '1块' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '料酒', amount: '1勺' },
      ],
      steps: [
        { step: 1, action: '排骨焯水', time: 5 },
        { step: 2, action: '排骨加水炖煮40分钟', time: 40 },
        { step: 3, action: '加冬瓜煮20分钟', time: 20 },
        { step: 4, action: '调味出锅', time: 2 },
      ],
      tags: ['汤类', '清淡'],
    }),
    baby_version: JSON.stringify({
      name: '冬瓜肉泥',
      age_range: '9-24个月',
      main_ingredients: [
        { name: '冬瓜', amount: '50g' },
        { name: '排骨', amount: '30g肉' },
      ],
      ingredients: [
        { name: '冬瓜', amount: '50g' },
        { name: '排骨肉', amount: '30g', note: '炖烂后取肉' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '从汤中取冬瓜和肉', time: 2 },
        { step: 2, action: '肉切碎，冬瓜压泥', time: 3 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: ['排骨焯水', '炖煮'],
        time_saving: '共用炖煮，节省1小时',
        tips: '宝宝食材从汤中取出加工',
      },
      nutrition_tips: '冬瓜清热解暑，排骨补钙',
      allergy_alert: '',
    }),
    cooking_tips: JSON.stringify(['冬瓜选青皮更嫩', '排骨选小排']),
    tags: JSON.stringify(['一菜两吃', '汤类']),
    is_active: true,
  },
  {
    id: 'recipe_p10',
    name: '紫菜蛋花汤 / 紫菜泥',
    name_en: 'Seaweed Egg Soup / Seaweed Puree',
    type: 'dinner',
    category: JSON.stringify(['汤类', '快手', '一菜两吃']),
    prep_time: 5,
    cook_time: 5,
    total_time: 10,
    difficulty: '简单',
    servings: '2人份',
    adult_version: JSON.stringify({
      name: '紫菜蛋花汤',
      main_ingredients: [
        { name: '紫菜', amount: '1张' },
        { name: '鸡蛋', amount: '2个' },
      ],
      ingredients: [
        { name: '紫菜', amount: '1张' },
        { name: '鸡蛋', amount: '2个' },
        { name: '虾皮', amount: '适量' },
      ],
      seasonings: [
        { name: '盐', amount: '适量' },
        { name: '香油', amount: '适量' },
      ],
      steps: [
        { step: 1, action: '水烧开', time: 3 },
        { step: 2, action: '放紫菜、虾皮', time: 1 },
        { step: 3, action: '淋入蛋液', time: 1 },
        { step: 4, action: '调味出锅', time: 1 },
      ],
      tags: ['快手汤', '补钙'],
    }),
    baby_version: JSON.stringify({
      name: '紫菜泥',
      age_range: '12-24个月',
      main_ingredients: [
        { name: '紫菜', amount: '少量' },
      ],
      ingredients: [
        { name: '紫菜', amount: '少量', note: '撕碎' },
      ],
      seasonings: [],
      steps: [
        { step: 1, action: '紫菜撕碎', time: 1 },
        { step: 2, action: '煮软', time: 3 },
        { step: 3, action: '压成泥', time: 1 },
      ],
      sync_cooking: {
        can_cook_together: true,
        shared_steps: [],
        time_saving: '分别制作',
        tips: '宝宝紫菜单独煮',
      },
      nutrition_tips: '紫菜富含碘和铁',
      allergy_alert: '对海鲜过敏的宝宝慎用',
    }),
    cooking_tips: JSON.stringify(['紫菜不用煮太久', '蛋液淋入要慢']),
    tags: JSON.stringify(['一菜两吃', '快手汤']),
    is_active: true,
  },
];

// 导入函数
async function importRecipes() {
  console.log('[开始] 导入配对菜谱...\n');

  // 先统计当前数量
  const beforeCount = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
  console.log(`[信息] 导入前菜谱数量: ${beforeCount}`);

  // 插入数据
  let successCount = 0;
  let errorCount = 0;

  for (const recipe of pairedRecipes) {
    try {
      await new Promise((resolve, reject) => {
        const sql = `
          INSERT OR REPLACE INTO recipes 
          (id, name, name_en, type, category, prep_time, cook_time, total_time, difficulty, servings,
           adult_version, baby_version, cooking_tips, tags, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        const params = [
          recipe.id,
          recipe.name,
          recipe.name_en,
          recipe.type,
          recipe.category,
          recipe.prep_time,
          recipe.cook_time,
          recipe.total_time,
          recipe.difficulty,
          recipe.servings,
          recipe.adult_version,
          recipe.baby_version,
          recipe.cooking_tips,
          recipe.tags,
          recipe.is_active,
        ];

        db.run(sql, params, function(err) {
          if (err) {
            console.error(`[错误] 导入 ${recipe.id} 失败:`, err.message);
            reject(err);
          } else {
            console.log(`[成功] 导入: ${recipe.name}`);
            resolve();
          }
        });
      });
      successCount++;
    } catch (err) {
      errorCount++;
    }
  }

  // 统计最终数量
  const afterCount = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });

  console.log('\n========================================');
  console.log('[完成] 导入统计:');
  console.log(`  - 成功: ${successCount}`);
  console.log(`  - 失败: ${errorCount}`);
  console.log(`  - 导入前: ${beforeCount}`);
  console.log(`  - 导入后: ${afterCount}`);
  console.log('========================================\n');

  db.close((err) => {
    if (err) {
      console.error('[错误] 关闭数据库失败:', err.message);
    } else {
      console.log('[成功] 数据库连接已关闭');
    }
  });
}

// 执行导入
importRecipes().catch(err => {
  console.error('[错误] 导入过程出错:', err);
  db.close();
  process.exit(1);
});
