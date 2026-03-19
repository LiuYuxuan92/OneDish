const wxStorage = {};
const toastMock = jest.fn();

jest.mock('../utils/api', () => ({
  saveExternalRecipe: jest.fn(),
  checkFavorite: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  createFeedingFeedback: jest.fn(),
}));

jest.mock('../utils/cache', () => ({
  setCache: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('../utils/entitlements', () => ({
  buildQuotaCard: jest.fn(() => null),
  buildBannerModel: jest.fn(() => ({})),
  handleQuotaUpgradeError: jest.fn(() => false),
}));

jest.mock('../utils/media', () => ({
  normalizeRecipeImageList: jest.fn((_id, imageUrl) => imageUrl || []),
  pickImage: jest.fn(() => ''),
  pickRecipeImage: jest.fn(() => ''),
}));

let api;
let cache;
let pageConfig;
let page;

function bindPageMethods(instance) {
  Object.keys(instance).forEach((key) => {
    if (typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
  return instance;
}

function createPage(config) {
  return {
    ...config,
    data: JSON.parse(JSON.stringify(config.data || {})),
    setData(updates) {
      this.data = { ...this.data, ...updates };
    },
  };
}

describe('external recipe save detail flow', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(wxStorage).forEach((key) => delete wxStorage[key]);

    global.wx = {
      getStorageSync: jest.fn((key) => wxStorage[key]),
      setStorageSync: jest.fn((key, value) => {
        wxStorage[key] = value;
      }),
      removeStorageSync: jest.fn((key) => {
        delete wxStorage[key];
      }),
      showToast: toastMock,
      navigateTo: jest.fn(),
      switchTab: jest.fn(),
      showModal: jest.fn(),
      stopPullDownRefresh: jest.fn(),
    };

    global.Page = jest.fn((config) => {
      pageConfig = config;
    });

    require('../pages/recipe/recipe');
    api = require('../utils/api');
    cache = require('../utils/cache');
    page = bindPageMethods(createPage(pageConfig));
    page.setActionFeedback = jest.fn();
    page.updateRecipeInList = jest.fn();
    page.loadRecentFeedingFeedbacks = jest.fn();
  });

  test('favorite remains blocked before save for external detail', async () => {
    page.data.detail = {
      id: 'ext-1',
      title: '番茄牛肉',
      source: 'external',
      is_external_result: true,
      adult_version: {
        ingredients: [{ name: '番茄' }],
        steps: [{ step: 1, action: '炒' }],
      },
    };

    await page.onToggleFavorite();

    expect(toastMock).toHaveBeenCalledWith({ title: '联网菜谱暂不支持收藏', icon: 'none' });
    expect(api.addFavorite).not.toHaveBeenCalled();
  });

  test('saving external detail falls back to adult_version ingredients and upgrades favorite gating', async () => {
    api.saveExternalRecipe.mockResolvedValue({
      id: 'local-1',
      name: '番茄牛肉',
      source: 'local',
      ingredients: [{ name: '番茄' }],
      adult_version: { ingredients: [{ name: '番茄' }], steps: [{ step: 1, action: '炒' }] },
    });
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    api.addFavorite.mockResolvedValue({});
    wxStorage.token = 'token';

    page.data.detail = {
      id: 'ext-1',
      title: '番茄牛肉',
      source: 'external',
      is_external_result: true,
      ingredients: [],
      adult_version: {
        ingredients: [{ name: '番茄', amount: '2个' }],
        steps: [{ step: 1, action: '炒' }],
      },
    };

    await page.saveExternalRecipeToLocal();

    expect(api.saveExternalRecipe).toHaveBeenCalledWith(expect.objectContaining({
      name: '番茄牛肉',
      source: 'external',
      adult_version: expect.objectContaining({
        ingredients: [{ name: '番茄', amount: '2个' }],
      }),
    }));
    expect(page.data.detail.is_external_result).toBe(false);
    expect(page.data.detail.id).toBe('local-1');
    expect(page.data.detail.is_favorited).toBe(false);

    await page.onToggleFavorite();

    expect(api.addFavorite).toHaveBeenCalledWith('local-1');
    expect(page.data.detail.is_favorited).toBe(true);
    expect(page.setActionFeedback).toHaveBeenCalledWith(
      '已保存为本地菜谱，下面可以继续收藏、反馈或生成宝宝版。',
      'success'
    );
    expect(toastMock).toHaveBeenCalledWith({ title: '已保存为本地菜谱', icon: 'success' });
    expect(cache.setCache).toHaveBeenCalledWith('recipe_local-1', expect.objectContaining({ id: 'local-1' }));
  });

  test('openAIGenerateModal becomes available after save upgrades detail to local', async () => {
    api.saveExternalRecipe.mockResolvedValue({
      id: 'local-1',
      name: '番茄牛肉',
      source: 'local',
      ingredients: [{ name: '番茄' }],
      adult_version: { ingredients: [{ name: '番茄' }], steps: [{ step: 1, action: '炒' }] },
    });
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    wxStorage.token = 'token';

    page.data.detail = {
      id: 'ext-1',
      title: '番茄牛肉',
      source: 'external',
      is_external_result: true,
      adult_version: {
        ingredients: [{ name: '番茄' }],
        steps: [{ step: 1, action: '炒' }],
      },
    };

    page.openAIGenerateModal();
    expect(toastMock).toHaveBeenCalledWith({ title: '联网菜谱暂不支持生成宝宝版', icon: 'none' });
    expect(page.data.showAIGenerateModal).toBe(false);

    toastMock.mockClear();
    await page.saveExternalRecipeToLocal();
    page.openAIGenerateModal();

    expect(page.data.detail.is_external_result).toBe(false);
    expect(page.data.showAIGenerateModal).toBe(true);
    expect(toastMock).not.toHaveBeenCalledWith({ title: '联网菜谱暂不支持生成宝宝版', icon: 'none' });
  });

  test('submitFeedingFeedback becomes available after save upgrades detail to local', async () => {
    api.saveExternalRecipe.mockResolvedValue({
      id: 'local-1',
      name: '番茄牛肉',
      source: 'local',
      ingredients: [{ name: '番茄' }],
      adult_version: { ingredients: [{ name: '番茄' }], steps: [{ step: 1, action: '炒' }] },
    });
    api.checkFavorite.mockResolvedValue({ is_favorited: false });
    api.createFeedingFeedback.mockResolvedValue({});
    wxStorage.token = 'token';

    page.data.detail = {
      id: 'ext-1',
      title: '番茄牛肉',
      source: 'external',
      is_external_result: true,
      adult_version: {
        ingredients: [{ name: '番茄' }],
        steps: [{ step: 1, action: '炒' }],
      },
    };

    await page.submitFeedingFeedback();
    expect(toastMock).toHaveBeenCalledWith({ title: '联网菜谱暂不支持反馈', icon: 'none' });

    toastMock.mockClear();
    await page.saveExternalRecipeToLocal();
    await page.submitFeedingFeedback();

    expect(api.createFeedingFeedback).toHaveBeenCalledWith(expect.objectContaining({ recipe_id: 'local-1' }));
    expect(toastMock).toHaveBeenCalledWith({ title: '反馈已记录', icon: 'success' });
  });

  test('save failure keeps external state unchanged', async () => {
    api.saveExternalRecipe.mockRejectedValue(new Error('保存失败'));

    page.data.detail = {
      id: 'ext-1',
      title: '番茄牛肉',
      source: 'external',
      is_external_result: true,
      ingredients: [{ name: '番茄' }],
      adult_version: { steps: [{ step: 1, action: '炒' }] },
    };
    const original = { ...page.data.detail };

    await page.saveExternalRecipeToLocal();

    expect(page.data.detail.is_external_result).toBe(true);
    expect(page.data.detail.id).toBe(original.id);
    expect(toastMock).toHaveBeenCalledWith({ title: '保存失败', icon: 'none' });
  });
});
