jest.mock('../utils/request', () => jest.fn((options) => Promise.resolve(options)));
jest.mock('../utils/api', () => ({
  addFavorite: jest.fn(() => Promise.resolve()),
  removeFavorite: jest.fn(() => Promise.resolve()),
  addRecipeToShoppingList: jest.fn(() => Promise.resolve()),
  searchRecipes: jest.fn(),
}));
jest.mock('../utils/navigation', () => ({
  openRecipeDetail: jest.fn(),
}));
jest.mock('../utils/media', () => ({
  pickImage: jest.fn((value) => value || ''),
  pickRecipeImage: jest.fn(() => ''),
}));

const fs = require('fs');
const request = require('../utils/request');
const api = require('../utils/api');
const { openRecipeDetail } = require('../utils/navigation');

let pageConfig;
let storage;
let toastCalls;
let modalCalls;
let switchTabCalls;

function createPageInstance(overrides = {}) {
  const instance = {
    data: JSON.parse(JSON.stringify(pageConfig.data)),
    setData(update) {
      this.data = { ...this.data, ...update };
    },
    ...pageConfig,
    ...overrides,
  };

  Object.keys(pageConfig).forEach((key) => {
    if (typeof pageConfig[key] === 'function') {
      instance[key] = pageConfig[key].bind(instance);
    }
  });

  return instance;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('miniprogram search quick actions and state handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    storage = {};
    toastCalls = [];
    modalCalls = [];
    switchTabCalls = [];
    pageConfig = null;

    delete global.Page;
    delete global.wx;

    jest.isolateModules(() => {
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
        showToast: jest.fn((payload) => {
          toastCalls.push(payload);
        }),
        showModal: jest.fn((payload) => {
          modalCalls.push(payload);
        }),
        switchTab: jest.fn((payload) => {
          switchTabCalls.push(payload);
        }),
      };

      require('../pages/search/search');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds a favorite with auth', async () => {
    await request({ url: '/favorites', method: 'POST', withAuth: true, data: { recipe_id: 'recipe-1' } });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/favorites',
      method: 'POST',
      withAuth: true,
      data: { recipe_id: 'recipe-1' },
    }));
  });

  it('removes a favorite with auth', async () => {
    await request({ url: '/favorites/recipe-1', method: 'DELETE', withAuth: true });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/favorites/recipe-1',
      method: 'DELETE',
      withAuth: true,
    }));
  });

  it('adds a recipe to the shopping list with default servings', async () => {
    await request({
      url: '/shopping-lists/add-recipe',
      method: 'POST',
      withAuth: true,
      data: {
        recipe_id: 'recipe-1',
        list_date: undefined,
        servings: 2,
      },
    });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/shopping-lists/add-recipe',
      method: 'POST',
      withAuth: true,
      data: {
        recipe_id: 'recipe-1',
        list_date: undefined,
        servings: 2,
      },
    }));
  });

  it('ignores stale search responses from older requests', async () => {
    const first = createDeferred();
    const second = createDeferred();

    api.searchRecipes
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const page = createPageInstance({
      data: {
        ...JSON.parse(JSON.stringify(pageConfig.data)),
        inventoryIngredients: [],
        preferenceSummaryText: '',
      },
      searchRequestSeq: 0,
    });

    const firstSearch = page.doSearch('first');
    const secondSearch = page.doSearch('second');

    second.resolve({
      results: [{ id: 'newer', name: '后发结果', source: 'local' }],
    });
    await secondSearch;

    first.resolve({
      results: [{ id: 'older', name: '先发结果', source: 'local' }],
    });
    await firstSearch;

    expect(page.data.loading).toBe(false);
    expect(page.data.results).toHaveLength(1);
    expect(page.data.results[0].id).toBe('newer');
  });

  it('clears feedback and invalidates in-flight searches on clear', () => {
    const page = createPageInstance({ searchRequestSeq: 2 });
    page.feedbackTimer = 123;
    page.data = {
      ...page.data,
      keyword: '番茄',
      results: [{ id: 'recipe-1' }],
      hasSearched: true,
      showHistory: false,
      selectedScenario: '快手',
      actionFeedback: { message: '已收藏', tone: 'success' },
      loading: true,
    };

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});

    page.onClear();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    expect(page.searchRequestSeq).toBe(3);
    expect(page.data.keyword).toBe('');
    expect(page.data.results).toEqual([]);
    expect(page.data.actionFeedback).toBe(null);
    expect(page.data.loading).toBe(false);
    expect(page.data.showHistory).toBe(true);

    clearTimeoutSpy.mockRestore();
  });

  it('exposes favorite only for local results in markup', () => {
    const wxml = fs.readFileSync(require.resolve('../pages/search/search.wxml'), 'utf8');

    expect(wxml).toContain('wx:if="{{!item.is_external_result}}"');
    expect(wxml).toContain("{{item.is_favorite ? '取消收藏' : '收藏'}}");
    expect(wxml).toContain('catchtap="onToggleFavorite"');
    expect(wxml).toContain('catchtap="onAddToShoppingList"');
  });

  it('quick action handlers do not navigate and card tap still does', () => {
    const page = createPageInstance({
      data: {
        ...JSON.parse(JSON.stringify(pageConfig.data)),
        results: [
          { id: 'local-1', title: '本地菜谱', is_external_result: false, is_favorite: false, favorite_loading: false },
          { id: 'external-1', title: '外部菜谱', is_external_result: true, shopping_loading: false, ingredients: [] },
        ],
      },
    });

    const stopPropagationFavorite = jest.fn();
    const stopPropagationList = jest.fn();

    page.onToggleFavorite({
      stopPropagation: stopPropagationFavorite,
      currentTarget: { dataset: { index: 0 } },
    });

    expect(stopPropagationFavorite).toHaveBeenCalled();
    expect(openRecipeDetail).not.toHaveBeenCalled();

    page.onAddToShoppingList({
      stopPropagation: stopPropagationList,
      currentTarget: { dataset: { index: 1 } },
    });

    expect(stopPropagationList).toHaveBeenCalled();
    expect(openRecipeDetail).not.toHaveBeenCalled();

    page.goToRecipe({ currentTarget: { dataset: { index: 0 } } });

    expect(openRecipeDetail).toHaveBeenCalledTimes(1);
    expect(openRecipeDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-1' }));
  });
});
