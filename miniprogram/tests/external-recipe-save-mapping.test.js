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

describe('external recipe save mapping', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.getApp = jest.fn(() => ({}));
    global.Page = jest.fn();
    global.wx = {
      getStorageSync: jest.fn(() => ''),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn(),
      showToast: jest.fn(),
      showModal: jest.fn(),
      navigateTo: jest.fn(),
      switchTab: jest.fn(),
    };
  });

  it('maps external detail into minimal user recipe payload', () => {
    const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

    const payload = buildUserRecipePayloadFromExternalDetail({
      id: 'ext-1',
      title: '番茄牛肉',
      description: '酸甜开胃',
      source: 'external',
      cover_url: 'https://img.example.com/a.jpg',
      cook_time: 25,
      difficulty: '简单',
      ingredients: [{ name: '番茄' }, { name: '牛肉' }],
      adult_version: {
        steps: [{ step: 1, action: '切番茄' }, { step: 2, action: '炖牛肉' }],
      },
    });

    expect(payload).toMatchObject({
      name: '番茄牛肉',
      source: 'external',
      prep_time: 25,
      difficulty: '简单',
      image_url: ['https://img.example.com/a.jpg'],
      adult_version: {
        description: '酸甜开胃',
        ingredients: [{ name: '番茄' }, { name: '牛肉' }],
        steps: [{ step: 1, action: '切番茄' }, { step: 2, action: '炖牛肉' }],
      },
      original_data: expect.objectContaining({ id: 'ext-1' }),
    });
  });

  it('falls back to root steps when adult_version.steps is missing', () => {
    const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

    const payload = buildUserRecipePayloadFromExternalDetail({
      id: 'ext-2',
      name: '清蒸鳕鱼',
      source: 'external',
      prep_time: 18,
      ingredients: [{ name: '鳕鱼' }],
      steps: [{ step: 1, action: '腌制' }, { step: 2, action: '清蒸' }],
      adult_version: {
        description: '保留鲜味',
      },
    });

    expect(payload.adult_version).toEqual({
      description: '保留鲜味',
      ingredients: [{ name: '鳕鱼' }],
      steps: [{ step: 1, action: '腌制' }, { step: 2, action: '清蒸' }],
    });
  });

  it('falls back from title to name and from cook_time to total_time', () => {
    const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

    const payload = buildUserRecipePayloadFromExternalDetail({
      id: 'ext-3',
      name: '南瓜粥',
      total_time: 35,
      cover_url: 'https://img.example.com/c.jpg',
      ingredients: [],
      adult_version: {},
    });

    expect(payload.name).toBe('南瓜粥');
    expect(payload.prep_time).toBe(35);
    expect(payload.image_url).toEqual(['https://img.example.com/c.jpg']);
  });

  it('falls back from total_time to prep_time and from cover_url to image_url', () => {
    const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

    const payload = buildUserRecipePayloadFromExternalDetail({
      id: 'ext-4',
      title: '鸡茸豆腐',
      prep_time: 12,
      image_url: ['https://img.example.com/d.jpg'],
      ingredients: [],
      adult_version: {},
    });

    expect(payload.name).toBe('鸡茸豆腐');
    expect(payload.prep_time).toBe(12);
    expect(payload.image_url).toEqual(['https://img.example.com/d.jpg']);
  });

  it('uses minimal defaults when source and difficulty are missing', () => {
    const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

    const payload = buildUserRecipePayloadFromExternalDetail({
      id: 'ext-5',
      title: '山药排骨汤',
      ingredients: [],
      adult_version: {},
    });

    expect(payload.source).toBe('external');
    expect(payload.difficulty).toBe('medium');
    expect(payload.image_url).toEqual([]);
    expect(payload.prep_time).toBe(0);
  });
});
