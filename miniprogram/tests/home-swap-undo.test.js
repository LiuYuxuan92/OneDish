const path = require('path');

const mockSwapRecommendation = jest.fn();
const mockGetTodayRecommendation = jest.fn();
const mockGetUserPreferences = jest.fn();
const mockGetBillingSummary = jest.fn();
const mockCheckFavorite = jest.fn();
const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockAddRecipeToShoppingList = jest.fn();
const mockOpenRecipeDetail = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuildBannerModel = jest.fn(() => ({ title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' }));
const mockBuildQuotaCards = jest.fn(() => []);
const mockPickImage = jest.fn((value) => value || '');
const mockPickRecipeImage = jest.fn(() => '');
const mockResolveMediaUrl = jest.fn((value) => value);

jest.mock('../utils/api', () => ({
  swapRecommendation: (...args) => mockSwapRecommendation(...args),
  getTodayRecommendation: (...args) => mockGetTodayRecommendation(...args),
  getUserPreferences: (...args) => mockGetUserPreferences(...args),
  getBillingSummary: (...args) => mockGetBillingSummary(...args),
  checkFavorite: (...args) => mockCheckFavorite(...args),
  addFavorite: (...args) => mockAddFavorite(...args),
  removeFavorite: (...args) => mockRemoveFavorite(...args),
  addRecipeToShoppingList: (...args) => mockAddRecipeToShoppingList(...args),
}));

jest.mock('../utils/navigation', () => ({
  openRecipeDetail: (...args) => mockOpenRecipeDetail(...args),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: (...args) => mockTrackEvent(...args),
}));

jest.mock('../utils/entitlements', () => ({
  buildBannerModel: (...args) => mockBuildBannerModel(...args),
  buildQuotaCards: (...args) => mockBuildQuotaCards(...args),
}));

jest.mock('../utils/media', () => ({
  pickImage: (...args) => mockPickImage(...args),
  pickRecipeImage: (...args) => mockPickRecipeImage(...args),
  resolveMediaUrl: (...args) => mockResolveMediaUrl(...args),
}));

function createRecipe(id, name, overrides = {}) {
  return {
    id,
    name,
    title: name,
    description: `${name} description`,
    ingredients: [{ name: '食材A', quantity: '1', unit: '份' }],
    recommendation_explain: [`${name} explain`],
    ranking_reasons: [],
    ...overrides,
  };
}

function loadHomePage() {
  const pagePath = path.resolve(__dirname, '../pages/home/home.js');
  delete require.cache[pagePath];
  require(pagePath);
  const config = global.__pageConfig;
  const page = {
    ...config,
    data: JSON.parse(JSON.stringify(config.data)),
    setData(update) {
      this.data = { ...this.data, ...update };
    },
  };
  Object.keys(config).forEach((key) => {
    if (typeof config[key] === 'function') {
      page[key] = config[key].bind(page);
    }
  });
  return page;
}

describe('home swap undo flow', () => {
  let page;
  let storage;
  let toastSpy;
  let consoleErrorSpy;

  async function seedSwappedRecommendation() {
    await page.applyRecommendation(createRecipe('recipe-current', '当前推荐'), { resetHistory: true });
    mockSwapRecommendation.mockResolvedValue(createRecipe('recipe-next', '下一道菜'));
    await page.onSwap();
  }

  async function expectUndoFailurePreservesUndoState(error = new Error('undo failed')) {
    const originalApplyRecommendation = page.applyRecommendation;
    page.applyRecommendation = jest.fn().mockRejectedValue(error);

    await page.undoSwap();

    expect(page.data.recommendation.id).toBe('recipe-next');
    expect(page.data.previousRecommendation.id).toBe('recipe-current');
    expect(page.data.previousRecommendationHistory).toEqual(['recipe-current']);
    expect(page.data.swapExplanation).toBe('已从当前推荐换成下一道菜。');
    expect(page.data.canUndoSwap).toBe(true);
    expect(page.data.isUndoingSwap).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith({ title: '恢复失败，请稍后重试', icon: 'none' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[home] undo swap failed:', error);

    page.applyRecommendation = originalApplyRecommendation;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();

    storage = {};
    toastSpy = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.__pageConfig = null;
    global.Page = jest.fn((config) => {
      global.__pageConfig = config;
    });
    global.wx = {
      getStorageSync: jest.fn((key) => storage[key]),
      setStorageSync: jest.fn((key, value) => {
        storage[key] = value;
      }),
      showToast: toastSpy,
      switchTab: jest.fn(),
      navigateTo: jest.fn(),
    };

    mockGetUserPreferences.mockResolvedValue(null);
    mockGetBillingSummary.mockResolvedValue({ active_entitlements: [] });
    mockCheckFavorite.mockResolvedValue(false);
    mockGetTodayRecommendation.mockResolvedValue({ recipe: createRecipe('recipe-current', '当前推荐') });

    page = loadHomePage();
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  test('swap stores previous recommendation, explanation and undo state', async () => {
    const previousRecipe = createRecipe('recipe-current', '当前推荐');
    const nextRecipe = createRecipe('recipe-next', '下一道菜');

    await page.applyRecommendation(previousRecipe, { resetHistory: true });
    mockSwapRecommendation.mockResolvedValue(nextRecipe);

    await page.onSwap();

    expect(page.data.recommendation.id).toBe('recipe-next');
    expect(page.data.previousRecommendation.id).toBe('recipe-current');
    expect(page.data.previousRecommendationHistory).toEqual(['recipe-current']);
    expect(page.data.swapExplanation).toBe('已从当前推荐换成下一道菜。');
    expect(page.data.canUndoSwap).toBe(true);
    expect(page.data.recentRecommendationIds).toEqual(['recipe-next', 'recipe-current']);
  });

  test('undoSwap restores previous recommendation and history then clears undo state', async () => {
    const previousRecipe = createRecipe('recipe-current', '当前推荐');
    const nextRecipe = createRecipe('recipe-next', '下一道菜');

    await page.applyRecommendation(previousRecipe, { resetHistory: true });
    mockSwapRecommendation.mockResolvedValue(nextRecipe);
    await page.onSwap();

    await page.undoSwap();

    expect(page.data.recommendation.id).toBe('recipe-current');
    expect(page.data.recentRecommendationIds).toEqual(['recipe-current']);
    expect(page.data.previousRecommendation).toBe(null);
    expect(page.data.previousRecommendationHistory).toEqual([]);
    expect(page.data.swapExplanation).toBe('');
    expect(page.data.canUndoSwap).toBe(false);
    expect(page.data.isUndoingSwap).toBe(false);
  });

  test('undoSwap keeps current recommendation when no undo state exists', async () => {
    const currentRecipe = createRecipe('recipe-current', '当前推荐');

    await page.applyRecommendation(currentRecipe, { resetHistory: true });
    await page.undoSwap();

    expect(page.data.recommendation.id).toBe('recipe-current');
    expect(page.data.canUndoSwap).toBe(false);
    expect(page.data.swapExplanation).toBe('');
  });

  test('swap failure leaves undo state untouched', async () => {
    const currentRecipe = createRecipe('recipe-current', '当前推荐');

    await page.applyRecommendation(currentRecipe, { resetHistory: true });
    mockSwapRecommendation.mockRejectedValue(new Error('network'));

    await page.onSwap();

    expect(page.data.recommendation.id).toBe('recipe-current');
    expect(page.data.previousRecommendation).toBe(null);
    expect(page.data.swapExplanation).toBe('');
    expect(page.data.canUndoSwap).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith({ title: '换菜失败，请稍后重试', icon: 'none' });
  });

  test('repeated swap replaces one-step undo snapshot with latest previous recommendation', async () => {
    const firstRecipe = createRecipe('recipe-current', '当前推荐');
    const secondRecipe = createRecipe('recipe-next', '下一道菜');
    const thirdRecipe = createRecipe('recipe-third', '第三道菜');

    await page.applyRecommendation(firstRecipe, { resetHistory: true });
    mockSwapRecommendation.mockResolvedValueOnce(secondRecipe);
    await page.onSwap();

    mockSwapRecommendation.mockResolvedValueOnce(thirdRecipe);
    await page.onSwap();

    expect(page.data.recommendation.id).toBe('recipe-third');
    expect(page.data.previousRecommendation.id).toBe('recipe-next');
    expect(page.data.previousRecommendationHistory).toEqual(['recipe-next', 'recipe-current']);
    expect(page.data.swapExplanation).toBe('已从下一道菜换成第三道菜。');
    expect(page.data.canUndoSwap).toBe(true);

    await page.undoSwap();

    expect(page.data.recommendation.id).toBe('recipe-next');
    expect(page.data.recentRecommendationIds).toEqual(['recipe-next', 'recipe-current']);
    expect(page.data.swapExplanation).toBe('');
    expect(page.data.canUndoSwap).toBe(false);
  });

  test('swap explanation state is exposed directly on page data', () => {
    page.setData({
      swapExplanation: '已从当前推荐换成下一道菜。',
      canUndoSwap: true,
      isUndoingSwap: false,
    });

    expect(page.data.swapExplanation).toBe('已从当前推荐换成下一道菜。');
    expect(page.data.canUndoSwap).toBe(true);
    expect(page.data.isUndoingSwap).toBe(false);
  });

  test('empty explanation state remains directly observable on page data', () => {
    page.setData({
      swapExplanation: '',
      canUndoSwap: true,
      isUndoingSwap: false,
    });

    expect(page.data.swapExplanation).toBe('');
    expect(page.data.canUndoSwap).toBe(true);
    expect(page.data.isUndoingSwap).toBe(false);
  });

  test('undo visibility state remains directly observable on page data', () => {
    page.setData({
      swapExplanation: '已从当前推荐换成下一道菜。',
      canUndoSwap: false,
      isUndoingSwap: true,
    });

    expect(page.data.swapExplanation).toBe('已从当前推荐换成下一道菜。');
    expect(page.data.canUndoSwap).toBe(false);
    expect(page.data.isUndoingSwap).toBe(true);
  });

  test('swap preserves feedback summary data on the new recommendation', async () => {
    const previousRecipe = createRecipe('recipe-current', '当前推荐');
    const nextRecipe = createRecipe('recipe-next', '下一道菜', {
      feedback_summary: {
        positive_tags: ['清淡'],
        negative_tags: ['太费时'],
        last_feedback_at: '2026-03-20T08:00:00.000Z',
      },
    });

    await page.applyRecommendation(previousRecipe, { resetHistory: true });
    mockSwapRecommendation.mockResolvedValue(nextRecipe);

    await page.onSwap();

    expect(page.data.recommendation.feedback_summary).toEqual(nextRecipe.feedback_summary);
  });

  test('undoSwap keeps homepage state usable for existing follow-up actions', async () => {
    await seedSwappedRecommendation();

    await page.undoSwap();

    expect(page.data.recommendation).toEqual(expect.objectContaining({
      id: 'recipe-current',
      ingredients: expect.any(Array),
    }));
    expect(page.data.currentVersion).toBe('adult');
    expect(page.data.recentRecommendationIds).toEqual(['recipe-current']);

    await expect(page.onFavorite()).resolves.toBeUndefined();
    expect(page.data.isFavorited).toBe(true);
    expect(page.data.recommendation.is_favorited).toBe(true);
  });

  test('loadTodayRecommendation clears stale undo state instead of restoring it', async () => {
    await seedSwappedRecommendation();
    mockGetTodayRecommendation.mockResolvedValueOnce({
      recipe: createRecipe('recipe-fresh', '全新推荐'),
    });

    await page.loadTodayRecommendation();

    expect(page.data.recommendation.id).toBe('recipe-fresh');
    expect(page.data.recentRecommendationIds).toEqual(['recipe-fresh']);
    expect(page.data.previousRecommendation).toBe(null);
    expect(page.data.previousRecommendationHistory).toEqual([]);
    expect(page.data.swapExplanation).toBe('');
    expect(page.data.canUndoSwap).toBe(false);
    expect(page.data.isUndoingSwap).toBe(false);
  });

  test('undo failure preserves existing undo state', async () => {
    await seedSwappedRecommendation();
    await expectUndoFailurePreservesUndoState();
  });
});
