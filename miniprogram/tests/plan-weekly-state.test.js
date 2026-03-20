const path = require('path');

const mockGenerateMealPlanFromPrompt = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuildQuotaCard = jest.fn(() => null);
const mockBuildBannerModel = jest.fn(() => ({ title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' }));
const mockHandleQuotaUpgradeError = jest.fn(() => false);

jest.mock('../utils/api', () => ({
  generateMealPlanFromPrompt: (...args) => mockGenerateMealPlanFromPrompt(...args),
  getBillingSummary: jest.fn(() => Promise.resolve({ active_entitlements: [] })),
  getShoppingLists: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../utils/config', () => ({
  getBaseURL: jest.fn(() => ''),
  getToken: jest.fn(() => ''),
  setBaseURL: jest.fn(),
  setToken: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: (...args) => mockTrackEvent(...args),
}));

jest.mock('../utils/entitlements', () => ({
  buildQuotaCard: (...args) => mockBuildQuotaCard(...args),
  buildBannerModel: (...args) => mockBuildBannerModel(...args),
  handleQuotaUpgradeError: (...args) => mockHandleQuotaUpgradeError(...args),
}));

function loadPlanPage() {
  const pagePath = path.resolve(__dirname, '../pages/plan/plan.js');
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
  page.loadHistory = jest.fn();
  page.loadData = jest.fn().mockResolvedValue(undefined);
  page.loadBillingSnapshot = jest.fn().mockResolvedValue(undefined);
  page.consumePendingImport = jest.fn();
  page.importItems = jest.fn();
  page.loadLocalData = jest.fn();
  page.setActionFeedback = jest.fn();
  return page;
}

describe('plan weekly state persistence', () => {
  let page;
  let storage;
  let toastSpy;
  let realDate;

  function mockCurrentDate(isoString) {
    global.Date = class extends realDate {
      constructor(...args) {
        return args.length ? new realDate(...args) : new realDate(isoString);
      }

      static now() {
        return new realDate(isoString).getTime();
      }
    };
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    realDate = global.Date;
    storage = {};
    toastSpy = jest.fn();

    global.__pageConfig = null;
    global.Page = jest.fn((config) => {
      global.__pageConfig = config;
    });
    global.wx = {
      getStorageSync: jest.fn((key) => storage[key]),
      setStorageSync: jest.fn((key, value) => {
        storage[key] = value;
      }),
      removeStorageSync: jest.fn((key) => {
        delete storage[key];
      }),
      showToast: toastSpy,
      showModal: jest.fn(),
      setClipboardData: jest.fn(),
      navigateTo: jest.fn(),
      switchTab: jest.fn(),
    };

    page = loadPlanPage();
  });

  afterEach(() => {
    global.Date = realDate;
  });

  test('generateMealPlan persists weekly state and derives today execution', async () => {
    mockGenerateMealPlanFromPrompt.mockResolvedValue({
      plans: {
        '2026-03-19': {
          dinner: { id: 'r1', name: '番茄牛肉' },
        },
      },
    });

    mockCurrentDate('2026-03-19T08:00:00Z');

    await page.generateMealPlan();

    expect(wx.setStorageSync).toHaveBeenCalledWith('plan_weekly_state', expect.any(Object));
    expect(page.data.todayExecutionEntries[0].mealType).toBe('dinner');
    expect(page.data.todayExecutionEntries[0].recipeId).toBe('r1');
    expect(page.data.generatedMealPlan).toMatchObject({
      plans: {
        '2026-03-19': {
          dinner: { id: 'r1', name: '番茄牛肉' },
        },
      },
    });
    expect(page.loadLocalData).not.toHaveBeenCalled();
  });

  test('generateMealPlan refreshes through the standard page data path after ingredient import', async () => {
    mockGenerateMealPlanFromPrompt.mockResolvedValue({
      plans: {
        '2026-03-19': {
          dinner: { id: 'r1', name: '番茄牛肉' },
        },
      },
      ingredients: ['番茄', '牛肉'],
    });

    mockCurrentDate('2026-03-19T08:00:00Z');

    await page.generateMealPlan();

    expect(page.importItems).toHaveBeenCalledWith([
      { name: '番茄', checked: false },
      { name: '牛肉', checked: false },
    ]);
    expect(page.loadData).toHaveBeenCalled();
    expect(page.loadLocalData).not.toHaveBeenCalled();
  });

  test('onShow restores persisted weekly state and derives today execution from storage', () => {
    storage.plan_weekly_state = {
      '2026-03-20': {
        breakfast: null,
        lunch: {
          date: '2026-03-20',
          mealType: 'lunch',
          mealLabel: '午餐',
          title: '鸡肉泥',
          recipeId: 'r2',
          recipe: { id: 'r2', title: '鸡肉泥' },
          ingredients: [],
          done: false,
          source: 'generated',
        },
        dinner: null,
      },
    };

    mockCurrentDate('2026-03-20T08:00:00Z');

    page.onShow();

    expect(wx.getStorageSync).toHaveBeenCalledWith('plan_weekly_state');
    expect(page.data.todayExecutionEntries).toHaveLength(1);
    expect(page.data.todayExecutionEntries[0].recipeId).toBe('r2');
    expect(page.data.generatedMealPlan).toBeNull();
  });

  test('today execution restores from weekly state instead of transient preview', () => {
    storage.plan_weekly_state = {
      '2026-03-20': {
        breakfast: null,
        lunch: null,
        dinner: {
          date: '2026-03-20',
          mealType: 'dinner',
          mealLabel: '晚餐',
          title: '三文鱼南瓜泥',
          recipeId: 'r9',
          recipe: { id: 'r9', title: '三文鱼南瓜泥' },
          ingredients: [],
          done: false,
          source: 'generated',
        },
      },
    };

    page.setData({
      generatedMealPlan: {
        plans: {
          '2026-03-20': {
            dinner: { id: 'preview-only', name: '预览晚餐' },
          },
        },
      },
      generatedPlanPreviewDays: [
        {
          date: '2026-03-20',
          label: '周四 · 3/20',
          meals: [{ mealType: 'dinner', mealLabel: '晚餐', name: '预览晚餐' }],
        },
      ],
    });

    mockCurrentDate('2026-03-20T08:00:00Z');

    page.onShow();

    expect(page.data.todayExecutionEntries).toHaveLength(1);
    expect(page.data.todayExecutionEntries[0].recipeId).toBe('r9');
    expect(page.data.todayExecutionEntries[0].title).toBe('三文鱼南瓜泥');
  });

  test('weekly plan panel shows persisted day cards after generation', async () => {
    mockGenerateMealPlanFromPrompt.mockResolvedValue({
      plans: {
        '2026-03-19': {
          dinner: { id: 'r1', name: '番茄牛肉' },
        },
      },
    });

    mockCurrentDate('2026-03-19T08:00:00Z');

    await page.generateMealPlan();

    expect(page.data.weeklyPlanDays).toHaveLength(1);
    expect(page.data.weeklyPlanDays[0]).toMatchObject({
      date: '2026-03-19',
      label: '周四 · 3/19',
    });
    expect(page.data.weeklyPlanDays[0].meals[2]).toMatchObject({
      mealType: 'dinner',
      mealLabel: '晚餐',
      title: '番茄牛肉',
      recipeId: 'r1',
    });
  });

  test('weekly plan panel stays empty when persisted weekly state is empty', () => {
    page.restoreWeeklyPlanState();

    expect(page.data.weeklyPlanState).toEqual({});
    expect(page.data.weeklyPlanDays).toEqual([]);
  });

  test('weekly plan panel derives stable day cards from weekly state instead of preview-only fields', () => {
    storage.plan_weekly_state = {
      '2026-03-20': {
        breakfast: null,
        lunch: {
          date: '2026-03-20',
          mealType: 'lunch',
          mealLabel: '午餐',
          title: '鸡肉泥',
          recipeId: 'r2',
          recipe: { id: 'r2', title: '鸡肉泥' },
          ingredients: [],
          done: false,
          source: 'generated',
        },
        dinner: null,
      },
    };

    page.setData({
      generatedPlanPreviewDays: [
        {
          date: '2026-03-20',
          label: '周四 · 3/20',
          meals: [{ mealType: 'dinner', mealLabel: '晚餐', name: '预览晚餐' }],
        },
      ],
    });

    page.restoreWeeklyPlanState();

    expect(page.data.weeklyPlanDays).toHaveLength(1);
    expect(page.data.weeklyPlanDays[0].meals).toHaveLength(3);
    expect(page.data.weeklyPlanDays[0].meals[1]).toMatchObject({
      mealType: 'lunch',
      title: '鸡肉泥',
      recipeId: 'r2',
    });
    expect(page.data.weeklyPlanDays[0].meals[2].title).toBe('');
  });


  test('marking today dinner done in weekly panel updates today execution entries', () => {
    storage.plan_weekly_state = {
      '2026-03-20': {
        breakfast: null,
        lunch: null,
        dinner: {
          date: '2026-03-20',
          mealType: 'dinner',
          mealLabel: '晚餐',
          title: '番茄牛肉',
          recipeId: 'r3',
          recipe: { id: 'r3', title: '番茄牛肉' },
          ingredients: [],
          done: false,
          source: 'generated',
        },
      },
    };

    mockCurrentDate('2026-03-20T08:00:00Z');
    page.onShow();

    page.toggleWeeklyMealDone({
      currentTarget: { dataset: { date: '2026-03-20', mealType: 'dinner' } },
    });

    expect(page.data.weeklyPlanState['2026-03-20'].dinner.done).toBe(true);
    expect(page.data.todayExecutionEntries).toHaveLength(1);
    expect(page.data.todayExecutionEntries[0]).toMatchObject({
      mealType: 'dinner',
      title: '番茄牛肉',
      done: true,
    });
    expect(wx.setStorageSync).toHaveBeenCalledWith('plan_weekly_state', expect.objectContaining({
      '2026-03-20': expect.objectContaining({
        dinner: expect.objectContaining({ done: true }),
      }),
    }));
  });

  test('generateMealPlan replaces generated slots but keeps completed and manual slots', async () => {
    storage.plan_weekly_state = {
      '2026-03-20': {
        breakfast: {
          date: '2026-03-20',
          mealType: 'breakfast',
          mealLabel: '早餐',
          title: '手动米糊',
          recipeId: 'manual-1',
          recipe: { id: 'manual-1', title: '手动米糊' },
          ingredients: [],
          done: false,
          source: 'manual',
        },
        lunch: {
          date: '2026-03-20',
          mealType: 'lunch',
          mealLabel: '午餐',
          title: '旧午餐',
          recipeId: 'generated-old',
          recipe: { id: 'generated-old', title: '旧午餐' },
          ingredients: [],
          done: false,
          source: 'generated',
        },
        dinner: {
          date: '2026-03-20',
          mealType: 'dinner',
          mealLabel: '晚餐',
          title: '已完成晚餐',
          recipeId: 'done-1',
          recipe: { id: 'done-1', title: '已完成晚餐' },
          ingredients: [],
          done: true,
          source: 'generated',
        },
      },
    };

    mockGenerateMealPlanFromPrompt.mockResolvedValue({
      plans: {
        '2026-03-20': {
          breakfast: { id: 'generated-breakfast', name: '新早餐' },
          lunch: { id: 'generated-lunch', name: '新午餐' },
          dinner: { id: 'generated-dinner', name: '新晚餐' },
        },
      },
    });

    mockCurrentDate('2026-03-20T08:00:00Z');
    page.onShow();

    await page.generateMealPlan();

    expect(page.data.weeklyPlanState['2026-03-20'].breakfast).toMatchObject({
      title: '手动米糊',
      recipeId: 'manual-1',
      source: 'manual',
    });
    expect(page.data.weeklyPlanState['2026-03-20'].lunch).toMatchObject({
      title: '新午餐',
      recipeId: 'generated-lunch',
      source: 'generated',
      done: false,
    });
    expect(page.data.weeklyPlanState['2026-03-20'].dinner).toMatchObject({
      title: '已完成晚餐',
      recipeId: 'done-1',
      done: true,
    });
  });
});
