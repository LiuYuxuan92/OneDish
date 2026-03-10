import { Platform } from 'react-native';
import type { SearchResult, UnifiedSearchResult } from '../api/search';
import type { WeeklyPlanResponse } from '../api/mealPlans';
import type { UserInfo, UserPreferences } from '../api/users';
import type { InventoryResponse } from '../api/ingredientInventory';
import type { FeedingFeedbackItem } from '../api/feedingFeedback';

export const isWebLocalDev = Boolean(__DEV__ && Platform.OS === 'web');

const MOCK_RECIPES: SearchResult[] = [
  {
    id: 'mock-1',
    name: '番茄鸡蛋面',
    source: 'local',
    type: '主食',
    prep_time: 15,
    difficulty: '简单',
    description: '快手家常面，酸甜开胃，适合工作日晚餐。',
    ingredients: ['番茄 2个', '鸡蛋 2个', '挂面 1把', '小葱 少许'],
    steps: ['番茄切块，鸡蛋打散。', '炒香鸡蛋后加入番茄煮出汤汁。', '另起锅煮面，捞入番茄蛋汤中拌匀即可。'],
    tags: ['快手', '家常'],
  },
  {
    id: 'mock-2',
    name: '西兰花三文鱼蒸蛋',
    source: 'local',
    type: '辅食',
    prep_time: 20,
    difficulty: '简单',
    description: '蛋白质充足，口感嫩滑，适合宝宝和大人共享。',
    ingredients: ['鸡蛋 2个', '三文鱼 80g', '西兰花 少许', '温水 150ml'],
    steps: ['三文鱼去刺切碎，西兰花焯水切末。', '鸡蛋加温水搅匀，加入配料。', '上锅蒸 12 分钟即可。'],
    tags: ['宝宝友好', '高蛋白'],
  },
  {
    id: 'mock-3',
    name: '南瓜小米粥配鸡肉丸',
    source: 'local',
    type: '早餐',
    prep_time: 30,
    difficulty: '简单',
    description: '暖胃软糯，适合清淡日和宝宝食欲差时。',
    ingredients: ['小米 50g', '南瓜 120g', '鸡胸肉 80g', '姜片 少许'],
    steps: ['南瓜切块与小米同煮。', '鸡胸肉剁泥调味成小丸子。', '粥快好时下丸子煮熟。'],
    tags: ['清淡', '暖胃'],
  },
  {
    id: 'mock-4',
    name: '土豆牛肉饭',
    source: 'local',
    type: '主食',
    prep_time: 35,
    difficulty: '中等',
    description: '一锅出，适合做周计划里的主力正餐。',
    ingredients: ['牛肉 150g', '土豆 1个', '胡萝卜 半根', '米饭 2碗'],
    steps: ['牛肉切小块焯水。', '土豆胡萝卜切丁翻炒。', '加入牛肉和米饭焖煮收汁。'],
    tags: ['一锅出', '周计划'],
  },
  {
    id: 'mock-5',
    name: '香菇青菜豆腐汤',
    source: 'local',
    type: '汤羹',
    prep_time: 18,
    difficulty: '简单',
    description: '低负担高容错，适合没胃口或想吃清淡点。',
    ingredients: ['香菇 4朵', '嫩豆腐 1盒', '青菜 1把'],
    steps: ['香菇切片炒香。', '加入清水和豆腐煮开。', '下青菜断生后调味。'],
    tags: ['清淡', '低油'],
  },
  {
    id: 'mock-6',
    name: '鳕鱼土豆饼',
    source: 'local',
    type: '辅食',
    prep_time: 25,
    difficulty: '简单',
    description: '适合想吃鱼但不想太复杂时，宝宝也能改造。',
    ingredients: ['鳕鱼 100g', '土豆 1个', '淀粉 少许'],
    steps: ['鳕鱼蒸熟压碎。', '土豆蒸熟压泥。', '混合后做成小饼煎熟。'],
    tags: ['鱼类', '易改造'],
  },
];

const pickRecipes = (keyword?: string, options?: { inventoryIngredients?: string[]; scenario?: string }): SearchResult[] => {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase();
  const inventoryTokens = (options?.inventoryIngredients || []).map((item) => item.toLowerCase());
  const scenario = String(options?.scenario || '').toLowerCase();

  let scored = MOCK_RECIPES.map((recipe) => {
    let score = 0;
    const haystack = [recipe.name, recipe.description, ...(recipe.ingredients || []), ...(recipe.tags || [])].join(' ').toLowerCase();

    if (normalizedKeyword) {
      if (haystack.includes(normalizedKeyword)) score += 5;
      normalizedKeyword.split(/\s+/).filter(Boolean).forEach((token) => {
        if (haystack.includes(token)) score += 2;
      });
    }

    inventoryTokens.forEach((token) => {
      if (haystack.includes(token)) score += 1;
    });

    if (scenario) {
      scenario.split(/\s+/).filter(Boolean).forEach((token) => {
        if (haystack.includes(token)) score += 1;
      });
    }

    return { recipe, score };
  });

  if (normalizedKeyword || inventoryTokens.length || scenario) {
    scored = scored.filter((entry) => entry.score > 0);
  }

  const results = (scored.length ? scored : MOCK_RECIPES.map((recipe) => ({ recipe, score: 0 })))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.recipe);

  return results.slice(0, 12);
};

export const buildMockSearchResult = (keyword?: string, options?: { inventoryIngredients?: string[]; scenario?: string }): UnifiedSearchResult => {
  const results = pickRecipes(keyword, options);
  return {
    results,
    total: results.length,
    source: 'local',
    route_source: 'local',
  };
};

export const buildMockWeeklyPlan = (): WeeklyPlanResponse => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const format = (date: Date) => date.toISOString().split('T')[0];
  const days = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return format(current);
  });

  return {
    start_date: days[0],
    end_date: days[6],
    plans: {
      [days[0]]: {
        breakfast: { id: 'plan-1', user_id: 'guest-web', plan_date: days[0], meal_type: 'breakfast', recipe_id: 'mock-3', servings: 2, created_at: new Date().toISOString() },
        dinner: { id: 'plan-2', user_id: 'guest-web', plan_date: days[0], meal_type: 'dinner', recipe_id: 'mock-4', servings: 2, created_at: new Date().toISOString() },
      },
      [days[1]]: {
        lunch: { id: 'plan-3', user_id: 'guest-web', plan_date: days[1], meal_type: 'lunch', recipe_id: 'mock-1', servings: 2, created_at: new Date().toISOString() },
      },
      [days[2]]: {
        dinner: { id: 'plan-4', user_id: 'guest-web', plan_date: days[2], meal_type: 'dinner', recipe_id: 'mock-6', servings: 2, created_at: new Date().toISOString() },
      },
    },
  };
};

export const buildMockUserInfo = (): UserInfo => ({
  id: 'guest-web',
  username: 'Web Guest',
  email: 'guest@local.onedish',
  family_size: 3,
  baby_age: 12,
  preferences: {
    default_baby_age: 12,
    exclude_ingredients: ['辣椒'],
    prefer_ingredients: ['鸡蛋', '番茄', '鳕鱼'],
    cooking_time_limit: 25,
    difficulty_preference: 'easy',
  } as UserPreferences,
});

export const buildMockInventory = (): InventoryResponse => ({
  inventory: [
    {
      id: 'inv-1',
      user_id: 'guest-web',
      ingredient_id: null,
      ingredient_name: '鸡蛋',
      quantity: 6,
      unit: '个',
      expiry_date: null,
      purchase_date: null,
      location: '冷藏',
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      user_id: 'guest-web',
      ingredient_id: null,
      ingredient_name: '番茄',
      quantity: 4,
      unit: '个',
      expiry_date: null,
      purchase_date: null,
      location: '冷藏',
      notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  stats: { total: 2, expiring: 0, expired: 0 },
});

export const buildMockFeedingFeedback = (): { items: FeedingFeedbackItem[] } => ({
  items: [
    {
      id: 'fb-1',
      user_id: 'guest-web',
      recipe_id: 'mock-2',
      accepted_level: 'like',
      allergy_flag: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recipe_name: '西兰花三文鱼蒸蛋',
      recipe_image_url: null,
    },
    {
      id: 'fb-2',
      user_id: 'guest-web',
      recipe_id: 'mock-5',
      accepted_level: 'ok',
      allergy_flag: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recipe_name: '香菇青菜豆腐汤',
      recipe_image_url: null,
    },
  ],
});

export const shouldUseWebMockFallback = (error: any) => {
  if (!isWebLocalDev) return false;
  const status = error?.http_status || error?.status || error?.response?.status;
  return status === 401 || status === 403 || status === 404 || status === 500 || status === 502 || status === 503 || status === undefined;
};
