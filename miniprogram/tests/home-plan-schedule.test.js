describe('home add-to-plan execution-state integration', () => {
  beforeEach(() => {
    jest.resetModules();
    global.Page = jest.fn();
  });

  it('builds a today dinner pending execution payload from recommendation', () => {
    require('../pages/home/home');
    const config = global.Page.mock.calls[0][0];

    const payload = config.buildPendingPlanExecution({
      id: 'recipe-1',
      title: '番茄牛肉',
      cook_time: 25,
      cover_url: 'https://img.example.com/cover.jpg',
      description: '酸甜开胃',
      difficulty: '简单',
      ingredients: ['番茄', { name: '牛肉' }],
    });

    expect(payload).toMatchObject({
      source: 'home_recommendation',
      slot: {
        date: expect.any(String),
        mealType: 'dinner',
        mealLabel: '晚餐',
        label: '今天晚餐',
      },
      recipe: {
        id: 'recipe-1',
        title: '番茄牛肉',
        cookTime: 25,
        coverUrl: 'https://img.example.com/cover.jpg',
        description: '酸甜开胃',
        difficulty: '简单',
      },
    });
  });

  it('returns null when recommendation id is missing', () => {
    require('../pages/home/home');
    const config = global.Page.mock.calls[0][0];

    expect(config.buildPendingPlanExecution({ title: '无 id 菜谱' })).toBeNull();
  });

  it('merges pending payload into plan execution state instead of plan_local_items', () => {
    global.wx = {
      getStorageSync: jest.fn(() => ({})),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn(),
      showToast: jest.fn(),
      navigateTo: jest.fn(),
      switchTab: jest.fn(),
    };
    global.getApp = jest.fn(() => ({ globalData: {} }));

    const planModule = require('../pages/plan/plan-execution-state');
    const pending = {
      source: 'home_recommendation',
      slot: {
        date: '2026-03-19',
        mealType: 'dinner',
        mealLabel: '晚餐',
        label: '今天晚餐',
      },
      recipe: {
        id: 'recipe-1',
        title: '番茄牛肉',
        coverUrl: 'https://img.example.com/cover.jpg',
        description: '酸甜开胃',
        difficulty: '简单',
        ingredients: ['番茄', '牛肉'],
      },
      createdAt: '2026-03-19T12:00:00.000Z',
    };

    const state = {
      '2026-03-19': [
        planModule.normalizeExecutionEntry({
          date: '2026-03-19',
          slot: 'lunch',
          slotLabel: '午餐',
          title: '旧午餐',
          recipeId: 'recipe-old',
          recipe: { id: 'recipe-old', title: '旧午餐' },
          source: 'manual',
        }, '2026-03-19'),
      ],
    };

    const nextDinner = planModule.normalizeExecutionEntry({
      date: pending.slot.date,
      slot: pending.slot.mealType,
      slotLabel: pending.slot.mealLabel,
      title: pending.recipe.title,
      recipeId: pending.recipe.id,
      recipe: {
        id: pending.recipe.id,
        title: pending.recipe.title,
        name: pending.recipe.title,
        cover_url: pending.recipe.coverUrl,
        description: pending.recipe.description,
        difficulty: pending.recipe.difficulty,
        ingredients: pending.recipe.ingredients,
      },
      ingredients: pending.recipe.ingredients,
      source: pending.source,
    }, pending.slot.date);

    const nextEntries = (state['2026-03-19'] || []).slice();
    const existingIndex = nextEntries.findIndex((entry) => entry.slot === pending.slot.mealType);
    if (existingIndex >= 0) {
      nextEntries[existingIndex] = nextDinner;
    } else {
      nextEntries.push(nextDinner);
    }

    expect(nextEntries.find((entry) => entry.slot === 'lunch').recipeId).toBe('recipe-old');
    expect(nextEntries.find((entry) => entry.slot === 'dinner')).toEqual(expect.objectContaining({
      recipeId: 'recipe-1',
      slotLabel: '晚餐',
      title: '番茄牛肉',
      source: 'home_recommendation',
    }));
  });
});
