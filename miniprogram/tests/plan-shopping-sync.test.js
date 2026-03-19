const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadPlanPage(overrides = {}) {
  const pagePath = path.resolve(__dirname, '../pages/plan/plan.js');
  const code = fs.readFileSync(pagePath, 'utf8');

  const api = overrides.api || {
    addShoppingListItem: jest.fn(() => Promise.resolve({})),
    generateMealPlanFromPrompt: jest.fn(() => Promise.resolve({ ingredients: [] })),
    getBillingSummary: jest.fn(() => Promise.resolve(null)),
  };

  const executionState = overrides.executionState || {
    buildExecutionSeedFromPlan: jest.fn(() => []),
    buildTodayExecutionState: jest.fn(() => []),
    countExecutionDone: jest.fn(() => 0),
    loadExecutionStateFromStorage: jest.fn(() => ({})),
    normalizeExecutionEntry: jest.fn((entry) => entry),
    saveExecutionStateToStorage: jest.fn(),
    shouldPersistExecutionSeed: jest.fn(() => false),
  };

  const wx = overrides.wx || {
    getStorageSync: jest.fn((key) => {
      if (key === 'token') return '';
      if (key === 'baseURL') return '';
      return [];
    }),
    setStorageSync: jest.fn(),
    removeStorageSync: jest.fn(),
    showToast: jest.fn(),
    navigateTo: jest.fn(),
    showModal: jest.fn(),
  };

  let pageConfig = null;
  const context = {
    require: (request) => {
      if (request === '../../utils/api') return api;
      if (request === '../../utils/config') {
        return {
          getBaseURL: jest.fn(() => ''),
          getToken: jest.fn(() => ''),
          setBaseURL: jest.fn(),
          setToken: jest.fn(),
        };
      }
      if (request === '../../utils/analytics') return { trackEvent: jest.fn() };
      if (request === '../../utils/entitlements') {
        return {
          buildQuotaCard: jest.fn(() => null),
          buildBannerModel: jest.fn(() => ({})),
          handleQuotaUpgradeError: jest.fn(() => false),
        };
      }
      if (request === '../../utils/navigation') return { openRecipeDetail: jest.fn() };
      if (request === './plan-execution-state') return executionState;
      throw new Error(`Unexpected require: ${request}`);
    },
    module: { exports: {} },
    exports: {},
    console,
    wx,
    getApp: () => ({ globalData: { userInfo: null } }),
    Page: (config) => { pageConfig = config; },
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(code, context, { filename: pagePath });
  return { page: pageConfig, api, wx };
}

describe('plan shopping list sync behavior', () => {
  it('adds execution ingredients to the active cloud shopping list in server mode', async () => {
    const { page, api } = loadPlanPage();
    const ctx = {
      data: {
        todayExecutionEntries: [{ slot: 'breakfast', slotLabel: '早餐', ingredients: ['南瓜', '鸡蛋'] }],
        listMode: 'server',
        activeListId: 'list-1',
      },
      loadData: jest.fn(() => Promise.resolve()),
      loadLocalData: jest.fn(),
      importItems: jest.fn(),
      setActionFeedback: jest.fn(),
    };

    await page.onExecutionAddToShopping.call(ctx, { currentTarget: { dataset: { index: 0 } } });

    expect(api.addShoppingListItem).toHaveBeenCalledTimes(2);
    expect(api.addShoppingListItem).toHaveBeenNthCalledWith(1, 'list-1', {
      item_name: '南瓜',
      amount: '',
      area: 'other',
      source_meal_type: '早餐',
    });
    expect(api.addShoppingListItem).toHaveBeenNthCalledWith(2, 'list-1', {
      item_name: '鸡蛋',
      amount: '',
      area: 'other',
      source_meal_type: '早餐',
    });
    expect(ctx.loadData).toHaveBeenCalled();
    expect(ctx.importItems).not.toHaveBeenCalled();
    expect(ctx.loadLocalData).not.toHaveBeenCalled();
  });

  it('keeps generated ingredients on the cloud list without forcing local mode', async () => {
    const generated = { ingredients: ['南瓜', '鳕鱼'] };
    const { page, api, wx } = loadPlanPage({
      api: {
        addShoppingListItem: jest.fn(() => Promise.resolve({})),
        generateMealPlanFromPrompt: jest.fn(() => Promise.resolve(generated)),
        getBillingSummary: jest.fn(() => Promise.resolve(null)),
      },
    });

    const ctx = {
      data: {
        isSmartMode: false,
        smartPrompt: '',
        babyAge: null,
        excludeIngredients: '',
        listMode: 'server',
        activeListId: 'list-1',
      },
      setData: jest.fn(function setData(patch) {
        this.data = { ...this.data, ...patch };
      }),
      restoreTodayExecutionState: jest.fn(),
      loadBillingSnapshot: jest.fn(() => Promise.resolve()),
      loadData: jest.fn(() => Promise.resolve()),
      loadLocalData: jest.fn(),
      importItems: jest.fn(),
      setActionFeedback: jest.fn(),
      goToMembership: jest.fn(),
    };

    await page.generateMealPlan.call(ctx);

    expect(api.generateMealPlanFromPrompt).toHaveBeenCalled();
    expect(api.addShoppingListItem).toHaveBeenCalledTimes(2);
    expect(api.addShoppingListItem).toHaveBeenNthCalledWith(1, 'list-1', {
      item_name: '南瓜',
      amount: '',
      area: 'other',
    });
    expect(api.addShoppingListItem).toHaveBeenNthCalledWith(2, 'list-1', {
      item_name: '鳕鱼',
      amount: '',
      area: 'other',
    });
    expect(ctx.loadData).toHaveBeenCalled();
    expect(ctx.loadLocalData).not.toHaveBeenCalled();
    expect(ctx.importItems).not.toHaveBeenCalled();
    expect(wx.showToast).toHaveBeenCalledWith({ title: '周计划已生成并同步清单', icon: 'success' });
  });

  it('does not show premature success toast when cloud shopping-list sync fails', async () => {
    const { page, wx } = loadPlanPage({
      api: {
        addShoppingListItem: jest.fn(() => Promise.reject(new Error('sync failed'))),
        generateMealPlanFromPrompt: jest.fn(() => Promise.resolve({ ingredients: ['南瓜'] })),
        getBillingSummary: jest.fn(() => Promise.resolve(null)),
      },
    });

    const ctx = {
      data: {
        isSmartMode: false,
        smartPrompt: '',
        babyAge: null,
        excludeIngredients: '',
        listMode: 'server',
        activeListId: 'list-1',
      },
      setData: jest.fn(function setData(patch) {
        this.data = { ...this.data, ...patch };
      }),
      restoreTodayExecutionState: jest.fn(),
      loadBillingSnapshot: jest.fn(() => Promise.resolve()),
      loadData: jest.fn(() => Promise.resolve()),
      loadLocalData: jest.fn(),
      importItems: jest.fn(),
      setActionFeedback: jest.fn(),
      goToMembership: jest.fn(),
    };

    await page.generateMealPlan.call(ctx);

    expect(wx.showToast).toHaveBeenCalledTimes(1);
    expect(wx.showToast).toHaveBeenCalledWith({ title: '周计划已生成，但同步清单失败', icon: 'none' });
    expect(ctx.setActionFeedback).toHaveBeenCalledWith('周计划已生成，但追加到云端采购清单失败。', 'error');
  });
});
