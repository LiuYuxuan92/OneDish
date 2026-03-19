const LOCAL_FAVORITES_KEY = 'local_favorites';

jest.mock('../utils/api', () => ({
  checkFavorite: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  getRecipeDetail: jest.fn(),
  getRecipeList: jest.fn(),
  getRecentFeedingFeedback: jest.fn(),
  createFeedingFeedback: jest.fn(),
  addRecipeToShoppingList: jest.fn(),
  getBillingSummary: jest.fn(),
  generateAIBabyVersion: jest.fn(),
}));

jest.mock('../utils/cache', () => ({
  checkNetworkStatus: jest.fn(() => Promise.resolve(true)),
  setCache: jest.fn(),
  getCache: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('../utils/entitlements', () => ({
  buildQuotaCard: jest.fn(() => null),
  buildBannerModel: jest.fn(() => ({ title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' })),
  handleQuotaUpgradeError: jest.fn(() => false),
}));

jest.mock('../utils/media', () => ({
  normalizeRecipeImageList: jest.fn((_id, value) => value || ''),
  pickImage: jest.fn((value) => value || ''),
  pickRecipeImage: jest.fn(() => ''),
}));

describe('recipe detail favorite behavior', () => {
  let pageConfig;
  let page;
  let storage;
  let api;
  let cache;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    storage = {};
    pageConfig = null;

    global.getApp = jest.fn(() => ({}));
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
      navigateTo: jest.fn(),
      switchTab: jest.fn(),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    require('../pages/recipe/recipe');
    api = require('../utils/api');
    cache = require('../utils/cache');

    page = {
      ...pageConfig,
      data: JSON.parse(JSON.stringify(pageConfig.data)),
      setData(update) {
        this.data = { ...this.data, ...update };
      },
      setActionFeedback: jest.fn(),
      loadRecentFeedingFeedbacks: jest.fn(),
      updateRecipeInList: jest.fn(),
    };
  });

  it('uses local favorites for guest favorite state on supported local recipes', async () => {
    storage[LOCAL_FAVORITES_KEY] = [{ id: 'recipe-1' }];

    const result = await page.syncDetailFavoriteState.call(page, {
      id: 'recipe-1',
      is_external_result: false,
    });

    expect(result).toBe(true);
    expect(api.checkFavorite).not.toHaveBeenCalled();
  });

  it('ignores favorite state for unsupported external recipes', async () => {
    storage[LOCAL_FAVORITES_KEY] = [{ id: 'recipe-1' }];

    const result = await page.syncDetailFavoriteState.call(page, {
      id: 'recipe-1',
      is_external_result: true,
    });

    expect(result).toBe(false);
    expect(api.checkFavorite).not.toHaveBeenCalled();
  });

  it('checks cloud favorite state for logged-in supported recipes even when incoming detail is stale', async () => {
    storage.token = 'token';
    api.checkFavorite.mockResolvedValue({ is_favorited: true });

    const result = await page.syncDetailFavoriteState.call(page, {
      id: 'recipe-2',
      is_external_result: false,
      is_favorited: false,
    });

    expect(result).toBe(true);
    expect(api.checkFavorite).toHaveBeenCalledWith('recipe-2');
  });

  it('re-syncs open detail favorite state from storage instead of trusting stale guest detail data', async () => {
    page.data.detail = {
      id: 'recipe-stale-guest',
      is_external_result: false,
      is_favorited: false,
    };
    storage[LOCAL_FAVORITES_KEY] = [{ id: 'recipe-stale-guest' }];

    await page.refreshOpenDetailFavoriteState.call(page);

    expect(page.data.detail.is_favorited).toBe(true);
  });

  it('re-syncs open detail favorite state from api instead of trusting stale logged-in detail data', async () => {
    storage.token = 'token';
    api.checkFavorite.mockResolvedValue({ is_favorited: true });
    page.data.detail = {
      id: 'recipe-stale-cloud',
      is_external_result: false,
      is_favorited: false,
    };

    await page.refreshOpenDetailFavoriteState.call(page);

    expect(api.checkFavorite).toHaveBeenCalledWith('recipe-stale-cloud');
    expect(page.data.detail.is_favorited).toBe(true);
  });

  it('falls back to false when logged-in cloud favorite check fails', async () => {
    storage.token = 'token';
    api.checkFavorite.mockRejectedValue(new Error('network'));

    const result = await page.syncDetailFavoriteState.call(page, {
      id: 'recipe-2b',
      is_external_result: false,
    });

    expect(result).toBe(false);
  });

  it('keeps scroll target while refreshing open detail favorite state', async () => {
    storage[LOCAL_FAVORITES_KEY] = [{ id: 'recipe-scroll' }];
    page.data.detail = {
      id: 'recipe-scroll',
      is_external_result: false,
      is_favorited: false,
    };
    page.data.detailScrollTarget = 'baby-version-card';

    await page.refreshOpenDetailFavoriteState.call(page);

    expect(page.data.detailScrollTarget).toBe('baby-version-card');
  });

  it('refreshes visible detail on show when no pending detail id exists', async () => {
    page.checkNetworkStatus = jest.fn();
    page.loadBillingSnapshot = jest.fn();
    page.loadRecipes = jest.fn();
    page.consumePendingRecipeDetail = jest.fn();
    page.refreshOpenDetailFavoriteState = jest.fn();
    page.data.detail = { id: 'recipe-visible' };

    await page.onShow.call(page);

    expect(page.refreshOpenDetailFavoriteState).toHaveBeenCalled();
  });

  it('opens pending detail on show before refresh logic', async () => {
    page.checkNetworkStatus = jest.fn();
    page.loadBillingSnapshot = jest.fn();
    page.loadRecipes = jest.fn();
    page.consumePendingRecipeDetail = jest.fn();
    page.refreshOpenDetailFavoriteState = jest.fn();
    page.openRecipeDetail = jest.fn();
    page.pendingDetailId = 'recipe-pending';
    page.data.detail = { id: 'recipe-visible' };

    await page.onShow.call(page);

    expect(page.openRecipeDetail).toHaveBeenCalledWith('recipe-pending');
    expect(page.refreshOpenDetailFavoriteState).not.toHaveBeenCalled();
  });

  it('keeps authenticated favorite state unchanged when add api fails', async () => {
    storage.token = 'token';
    api.addFavorite.mockRejectedValue(new Error('network'));
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    const detail = {
      id: 'recipe-failure-add',
      title: '豆腐羹',
      is_external_result: false,
      is_favorited: false,
    };
    page.data.detail = detail;

    await page.onToggleFavorite.call(page);

    expect(storage[LOCAL_FAVORITES_KEY]).toBeUndefined();
    expect(api.checkFavorite).toHaveBeenCalledWith('recipe-failure-add');
    expect(page.data.detail.is_favorited).toBe(false);
    expect(page.setActionFeedback).not.toHaveBeenCalled();
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '收藏失败', icon: 'none' });
  });

  it('keeps authenticated favorite state unchanged when remove api fails', async () => {
    storage.token = 'token';
    api.removeFavorite.mockRejectedValue(new Error('network'));
    api.checkFavorite.mockResolvedValue({ is_favorited: true });
    const detail = {
      id: 'recipe-failure-remove',
      title: '南瓜粥',
      is_external_result: false,
      is_favorited: true,
    };
    page.data.detail = detail;

    await page.onToggleFavorite.call(page);

    expect(storage[LOCAL_FAVORITES_KEY]).toBeUndefined();
    expect(api.checkFavorite).toHaveBeenCalledWith('recipe-failure-remove');
    expect(page.data.detail.is_favorited).toBe(true);
    expect(page.setActionFeedback).not.toHaveBeenCalled();
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '取消收藏失败', icon: 'none' });
  });

  it('authenticated failure remains stable after a later refresh', async () => {
    storage.token = 'token';
    api.addFavorite.mockRejectedValue(new Error('network'));
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    page.data.detail = {
      id: 'recipe-failure-stable',
      title: '西兰花泥',
      is_external_result: false,
      is_favorited: false,
    };

    await page.onToggleFavorite.call(page);
    await page.refreshOpenDetailFavoriteState.call(page);

    expect(page.data.detail.is_favorited).toBe(false);
    expect(api.checkFavorite).toHaveBeenCalledTimes(2);
  });

  it('guards against duplicate favorite submissions', async () => {
    page.data.favoriteSubmitting = true;
    page.data.detail = {
      id: 'recipe-guard',
      is_external_result: false,
      is_favorited: false,
    };

    await page.onToggleFavorite.call(page);

    expect(api.addFavorite).not.toHaveBeenCalled();
    expect(global.wx.showToast).not.toHaveBeenCalled();
  });

  it('updates cache when favorite mutation succeeds', async () => {
    const detail = {
      id: 'recipe-cache',
      title: '鸡蛋羹',
      is_external_result: false,
      is_favorited: false,
    };
    page.data.detail = detail;

    await page.onToggleFavorite.call(page);

    expect(cache.setCache).toHaveBeenCalledWith('recipe_recipe-cache', expect.objectContaining({ is_favorited: true }));
  });

  it('re-syncs cache-backed detail to cloud truth after authenticated toggle failure', async () => {
    storage.token = 'token';
    api.addFavorite.mockRejectedValue(new Error('network'));
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    page.data.detail = {
      id: 'recipe-cache-failure',
      title: '西兰花泥',
      is_external_result: false,
      is_favorited: false,
    };

    await page.onToggleFavorite.call(page);

    expect(cache.setCache).not.toHaveBeenCalledWith('recipe_recipe-cache-failure', expect.objectContaining({ is_favorited: true }));
    expect(page.data.detail.is_favorited).toBe(false);
  });

  it('awaits pending detail open on show before returning', async () => {
    page.checkNetworkStatus = jest.fn();
    page.loadBillingSnapshot = jest.fn();
    page.loadRecipes = jest.fn();
    page.consumePendingRecipeDetail = jest.fn();
    let resolved = false;
    page.openRecipeDetail = jest.fn(async () => {
      expect(resolved).toBe(false);
      resolved = true;
    });
    page.pendingDetailId = 'recipe-await';

    await page.onShow.call(page);

    expect(resolved).toBe(true);
  });

  it('awaits detail refresh on authenticated failure before clearing submitting state', async () => {
    storage.token = 'token';
    api.addFavorite.mockRejectedValue(new Error('network'));
    let refreshSawSubmitting = false;
    page.data.detail = {
      id: 'recipe-await-failure',
      is_external_result: false,
      is_favorited: false,
    };
    page.refreshOpenDetailFavoriteState = jest.fn(async () => {
      refreshSawSubmitting = page.data.favoriteSubmitting;
    });

    await page.onToggleFavorite.call(page);

    expect(refreshSawSubmitting).toBe(true);
    expect(page.data.favoriteSubmitting).toBe(false);
  });

  it('uses cache fallback when opening detail fails and re-syncs favorite state', async () => {
    storage[LOCAL_FAVORITES_KEY] = [{ id: 'recipe-open-cache' }];
    api.getRecipeDetail.mockRejectedValue(new Error('offline'));
    cache.getCache.mockReturnValue({
      id: 'recipe-open-cache',
      title: '缓存菜谱',
      is_external_result: false,
      is_favorited: false,
    });

    await page.openRecipeDetail.call(page, 'recipe-open-cache');

    expect(page.data.detail.is_favorited).toBe(true);
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '网络不可用，已显示缓存', icon: 'none' });
  });

  it('toggles guest favorite via local storage and updates detail state', async () => {
    const detail = {
      id: 'recipe-3',
      title: '番茄蛋汤',
      is_external_result: false,
      is_favorited: false,
    };
    page.data.detail = detail;

    await page.onToggleFavorite.call(page);

    expect(storage[LOCAL_FAVORITES_KEY]).toEqual([expect.objectContaining({ id: 'recipe-3' })]);
    expect(page.data.detail.is_favorited).toBe(true);
    expect(page.setActionFeedback).toHaveBeenCalledWith('这道菜已加入收藏，后续可在收藏页快速找回。', 'success');
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '已加入收藏', icon: 'success' });
  });

  it('toggles logged-in favorite via api and updates detail state', async () => {
    storage.token = 'token';
    const detail = {
      id: 'recipe-4',
      title: '青菜粥',
      is_external_result: false,
      is_favorited: true,
    };
    page.data.detail = detail;

    await page.onToggleFavorite.call(page);

    expect(api.removeFavorite).toHaveBeenCalledWith('recipe-4');
    expect(page.data.detail.is_favorited).toBe(false);
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '已取消收藏', icon: 'success' });
  });

  it('does not toggle favorite for unsupported external recipes', async () => {
    page.data.detail = {
      id: 'recipe-5',
      is_external_result: true,
      is_favorited: false,
    };

    await page.onToggleFavorite.call(page);

    expect(api.addFavorite).not.toHaveBeenCalled();
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '联网菜谱暂不支持收藏', icon: 'none' });
  });
});
