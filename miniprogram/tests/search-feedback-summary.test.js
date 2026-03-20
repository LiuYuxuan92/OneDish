const path = require('path');

const mockSearchRecipes = jest.fn();
const mockGetRecentFeedingFeedback = jest.fn();
const mockPickImage = jest.fn((value) => value || '');
const mockPickRecipeImage = jest.fn(() => '');
const mockOpenRecipeDetail = jest.fn();
const mockRequest = jest.fn().mockResolvedValue({ inventory: [] });

jest.mock('../utils/api', () => ({
  searchRecipes: (...args) => mockSearchRecipes(...args),
  getRecentFeedingFeedback: (...args) => mockGetRecentFeedingFeedback(...args),
}));

jest.mock('../utils/request', () => (...args) => mockRequest(...args));

jest.mock('../utils/navigation', () => ({
  openRecipeDetail: (...args) => mockOpenRecipeDetail(...args),
}));

jest.mock('../utils/media', () => ({
  pickImage: (...args) => mockPickImage(...args),
  pickRecipeImage: (...args) => mockPickRecipeImage(...args),
}));

function loadSearchPage() {
  const pagePath = path.resolve(__dirname, '../pages/search/search.js');
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

describe('search feedback summary', () => {
  let page;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    global.__pageConfig = null;
    global.Page = jest.fn((config) => {
      global.__pageConfig = config;
    });
    global.wx = {
      getStorageSync: jest.fn(() => null),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn(),
      showToast: jest.fn(),
      showModal: jest.fn(),
    };

    page = loadSearchPage();
  });

  test('doSearch attaches a feedback summary to local recipes only', async () => {
    mockSearchRecipes.mockResolvedValue({
      results: [
        {
          id: 'local-1',
          name: '番茄鸡蛋面',
          source: 'local',
          description: '本地菜谱',
        },
        {
          id: 'external-1',
          name: '外部意面',
          source: 'xiaohongshu',
          description: '外部菜谱',
        },
      ],
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([
      { accepted_level: 'ok' },
      { accepted_level: 'reject' },
    ]);

    await page.doSearch('番茄');

    expect(mockGetRecentFeedingFeedback).toHaveBeenCalledTimes(1);
    expect(mockGetRecentFeedingFeedback).toHaveBeenCalledWith({
      recipe_id: 'local-1',
      limit: 3,
    });
    expect(page.data.results[0]).toMatchObject({
      id: 'local-1',
      feedback_summary: {
        label: expect.any(String),
      },
    });
    expect(page.data.results[0].feedback_summary).not.toBeNull();
    expect(page.data.results[1].feedback_summary).toBeUndefined();
  });

  test('doSearch keeps local result visible when feedback lookup fails', async () => {
    mockSearchRecipes.mockResolvedValue({
      results: [
        {
          id: 'local-2',
          name: '南瓜粥',
          source: 'local',
          description: '本地菜谱',
        },
      ],
    });
    mockGetRecentFeedingFeedback.mockRejectedValue(new Error('network error'));

    await page.doSearch('南瓜');

    expect(mockGetRecentFeedingFeedback).toHaveBeenCalledWith({
      recipe_id: 'local-2',
      limit: 3,
    });
    expect(page.data.loading).toBe(false);
    expect(page.data.results).toHaveLength(1);
    expect(page.data.results[0]).toMatchObject({
      id: 'local-2',
      title: '南瓜粥',
    });
    expect(page.data.results[0].feedback_summary).toBeUndefined();
  });

  test('doSearch uses the same latest reject summary rule as home', async () => {
    mockSearchRecipes.mockResolvedValue({
      results: [
        {
          id: 'local-3',
          name: '胡萝卜蒸蛋',
          source: 'local',
          description: '本地菜谱',
        },
      ],
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([
      { accepted_level: 'reject' },
      { accepted_level: 'ok' },
      { accepted_level: 'like' },
    ]);

    await page.doSearch('胡萝卜');

    expect(page.data.results[0].feedback_summary).toEqual({
      state: 'rejected',
      label: '之前拒绝过',
    });
  });

  test('doSearch keeps local recipes quiet when there is no feedback history', async () => {
    mockSearchRecipes.mockResolvedValue({
      results: [
        {
          id: 'local-4',
          name: '青菜面',
          source: 'local',
          description: '本地菜谱',
        },
        {
          id: 'external-quiet',
          name: '站外青菜面',
          source: 'douyin',
          description: '外部菜谱',
        },
      ],
    });
    mockGetRecentFeedingFeedback.mockResolvedValue([]);

    await page.doSearch('青菜');

    expect(page.data.results[0].feedback_summary).toBeNull();
    expect(page.data.results[1].feedback_summary).toBeUndefined();
  });
});
