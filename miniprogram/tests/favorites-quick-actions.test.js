jest.mock('../utils/api', () => ({
  addRecipeToShoppingList: jest.fn(() => Promise.resolve()),
  removeFavorite: jest.fn(() => Promise.resolve()),
  getFavorites: jest.fn(() => Promise.resolve({ items: [] })),
}));

jest.mock('../utils/navigation', () => ({
  openRecipeDetail: jest.fn(),
}));

jest.mock('../utils/plan-pending-execution', () => ({
  buildPendingPlanExecution: jest.fn((recipe, options = {}) => ({
    source: options.source || 'home_recommendation',
    slot: {
      date: '2026-03-19',
      mealType: 'dinner',
      mealLabel: '晚餐',
      label: '今天晚餐',
    },
    recipe: {
      id: recipe?.id,
      title: recipe?.title || recipe?.name || '',
      ingredients: Array.isArray(recipe?.ingredients) ? recipe.ingredients : [],
    },
    createdAt: '2026-03-19T00:00:00.000Z',
  })),
}));

describe('favorites quick actions', () => {
  let pageConfig;
  let page;
  let storage;
  let api;
  let navigation;
  let pendingExecution;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    storage = {};
    pageConfig = null;

    global.Page = jest.fn((config) => {
      pageConfig = config;
    });
    global.wx = {
      getStorageSync: jest.fn((key) => storage[key]),
      setStorageSync: jest.fn((key, value) => {
        storage[key] = value;
      }),
      removeStorageSync: jest.fn((key) => {
        delete storage[key];
      }),
      showToast: jest.fn(),
      showModal: jest.fn(),
      switchTab: jest.fn(),
    };

    require('../pages/favorites/favorites');
    api = require('../utils/api');
    navigation = require('../utils/navigation');
    pendingExecution = require('../utils/plan-pending-execution');

    page = {
      ...pageConfig,
      data: JSON.parse(JSON.stringify(pageConfig.data)),
      setData(update) {
        this.data = { ...this.data, ...update };
      },
      setActionFeedback: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('goToRecipe uses recipe object when favorite object is available', () => {
    const recipe = { id: 'recipe-1', title: '番茄鸡蛋面', cover_url: 'cover' };
    page.data.localFavorites = [recipe];

    page.goToRecipe({ currentTarget: { dataset: { id: 'recipe-1' } } });

    expect(navigation.openRecipeDetail).toHaveBeenCalledWith(recipe);
  });

  it('goToRecipe falls back to id when favorite object is unavailable', () => {
    page.goToRecipe({ currentTarget: { dataset: { id: 'recipe-missing' } } });

    expect(navigation.openRecipeDetail).toHaveBeenCalledWith('recipe-missing');
  });

  it('adds a favorite recipe to cloud shopping list when logged in', async () => {
    storage.token = 'token';
    const recipe = { id: 'recipe-2', title: '青菜豆腐羹' };
    page.data.favorites = [recipe];

    await page.addToShoppingList({ currentTarget: { dataset: { id: 'recipe-2' } } });

    expect(api.addRecipeToShoppingList).toHaveBeenCalledWith({ recipeId: 'recipe-2' });
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '已加入云端清单', icon: 'success' });

    jest.runAllTimers();
    expect(global.wx.switchTab).toHaveBeenCalledWith({ url: '/pages/plan/plan' });
  });

  it('falls back to pending import when guest adds favorite recipe to shopping list', () => {
    const recipe = {
      id: 'recipe-3',
      title: '南瓜小米粥',
      ingredients: [{ name: '南瓜', amount: '200', unit: 'g' }, '小米'],
    };
    page.data.localFavorites = [recipe];

    page.addToShoppingList({ currentTarget: { dataset: { id: 'recipe-3' } } });

    expect(storage.pending_import).toEqual([
      { name: '南瓜', quantity: '200', unit: 'g', checked: false },
      { name: '小米', quantity: '', unit: '', checked: false },
    ]);
    expect(global.wx.switchTab).toHaveBeenCalledWith({ url: '/pages/plan/plan' });
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '已加入待购清单', icon: 'success' });
  });

  it('delegates pending plan payload building to shared helper with favorites source', () => {
    const recipe = {
      id: 'recipe-4',
      title: '牛肉时蔬饭',
      ingredients: ['牛肉', '西兰花'],
    };
    page.data.localFavorites = [recipe];

    page.addToPlan({ currentTarget: { dataset: { id: 'recipe-4' } } });

    expect(pendingExecution.buildPendingPlanExecution).toHaveBeenCalledWith(recipe, { source: 'favorites' });
    expect(storage.pending_plan_execution).toEqual({
      source: 'favorites',
      slot: {
        date: '2026-03-19',
        mealType: 'dinner',
        mealLabel: '晚餐',
        label: '今天晚餐',
      },
      recipe: {
        id: 'recipe-4',
        title: '牛肉时蔬饭',
        ingredients: ['牛肉', '西兰花'],
      },
      createdAt: '2026-03-19T00:00:00.000Z',
    });
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '已加入今天晚餐', icon: 'success' });

    jest.runAllTimers();
    expect(global.wx.switchTab).toHaveBeenCalledWith({ url: '/pages/plan/plan' });
  });

  it('returns null when shared pending execution helper cannot build payload', () => {
    pendingExecution.buildPendingPlanExecution.mockReturnValueOnce(null);

    expect(page.buildPendingPlanExecution({ title: '无 id 菜谱' })).toBeNull();
  });
});
