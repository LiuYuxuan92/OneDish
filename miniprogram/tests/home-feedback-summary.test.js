const path = require('path');

const mockGetRecentFeedingFeedback = jest.fn();
const mockGetTodayRecommendation = jest.fn();
const mockPickImage = jest.fn((value) => value || '');
const mockPickRecipeImage = jest.fn(() => '');

jest.mock('../utils/api', () => ({
  getRecentFeedingFeedback: (...args) => mockGetRecentFeedingFeedback(...args),
  getTodayRecommendation: (...args) => mockGetTodayRecommendation(...args),
  getUserPreferences: jest.fn().mockResolvedValue(null),
  getBillingSummary: jest.fn().mockResolvedValue({ active_entitlements: [] }),
  checkFavorite: jest.fn().mockResolvedValue(false),
}));

jest.mock('../utils/navigation', () => ({
  openRecipeDetail: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('../utils/entitlements', () => ({
  buildBannerModel: jest.fn(() => ({ title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' })),
  buildQuotaCards: jest.fn(() => []),
}));

jest.mock('../utils/media', () => ({
  pickImage: (...args) => mockPickImage(...args),
  pickRecipeImage: (...args) => mockPickRecipeImage(...args),
  resolveMediaUrl: jest.fn((value) => value),
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

describe('home recommendation feedback summary', () => {
  let page;
  let storage;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    storage = {};
    global.__pageConfig = null;
    global.Page = jest.fn((config) => {
      global.__pageConfig = config;
    });
    global.wx = {
      getStorageSync: jest.fn((key) => storage[key]),
      setStorageSync: jest.fn((key, value) => {
        storage[key] = value;
      }),
      showToast: jest.fn(),
      switchTab: jest.fn(),
      navigateTo: jest.fn(),
    };

    page = loadHomePage();
  });

  test('recap stays hidden when recommendationFeedbackSummary is null', () => {
    expect(page.data.recommendationFeedbackSummary).toBeNull();
  });

  test('loadTodayRecommendation provides state and label for accepted recap rendering', async () => {
    mockGetTodayRecommendation.mockResolvedValue({
      recipe: createRecipe('recipe-liked', '宝宝喜欢'),
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([
      { accepted_level: 'like' },
      { accepted_level: 'reject' },
    ]);

    await page.loadTodayRecommendation();

    expect(page.data.recommendationFeedbackSummary).toMatchObject({
      state: 'accepted',
      label: '宝宝接受过',
    });
    expect(Object.keys(page.data.recommendationFeedbackSummary).sort()).toEqual(['label', 'state']);
  });

  test('applyRecommendation provides state and label for rejected recap rendering', async () => {
    mockGetRecentFeedingFeedback.mockResolvedValue([
      { accepted_level: 'reject' },
      { accepted_level: 'like' },
    ]);

    await page.applyRecommendation(createRecipe('recipe-rejected', '宝宝拒绝'), { resetHistory: true });

    expect(page.data.recommendationFeedbackSummary).toMatchObject({
      state: 'rejected',
      label: '之前拒绝过',
    });
    expect(Object.keys(page.data.recommendationFeedbackSummary).sort()).toEqual(['label', 'state']);
  });

  test('home uses the latest reject rule even when older feedback was positive', async () => {
    mockGetTodayRecommendation.mockResolvedValue({
      recipe: createRecipe('recipe-home-latest-reject', '最新拒绝'),
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([
      { accepted_level: 'reject' },
      { accepted_level: 'ok' },
      { accepted_level: 'like' },
    ]);

    await page.loadTodayRecommendation();

    expect(page.data.recommendationFeedbackSummary).toEqual({
      state: 'rejected',
      label: '之前拒绝过',
    });
  });

  test('home keeps recommendation feedback quiet when there is no feedback history', async () => {
    mockGetTodayRecommendation.mockResolvedValue({
      recipe: createRecipe('recipe-home-no-feedback', '暂无反馈'),
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([]);

    await page.loadTodayRecommendation();

    expect(page.data.recommendationFeedbackSummary).toBeNull();
  });
});
