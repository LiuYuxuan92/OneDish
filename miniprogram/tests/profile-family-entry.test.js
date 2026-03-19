const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createPageLoader(relativePagePath, options = {}) {
  const pagePath = path.resolve(__dirname, relativePagePath);
  const code = fs.readFileSync(pagePath, 'utf8');
  const wx = options.wx || {
    getStorageSync: jest.fn(() => ''),
    setStorageSync: jest.fn(),
    removeStorageSync: jest.fn(),
    showToast: jest.fn(),
    showModal: jest.fn(),
    navigateTo: jest.fn(),
    switchTab: jest.fn(),
  };

  let pageConfig = null;
  const context = {
    require: (request) => {
      if (request === '../../utils/api') {
        return options.api || {
          getUserPreferences: jest.fn(() => Promise.resolve(null)),
          updateUserPreferences: jest.fn(() => Promise.resolve({})),
        };
      }
      throw new Error(`Unexpected require: ${request}`);
    },
    module: { exports: {} },
    exports: {},
    console,
    wx,
    Page: (config) => { pageConfig = config; },
    getApp: () => ({ globalData: { userInfo: null } }),
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(code, context, { filename: pagePath });
  return { page: pageConfig, wx, pagePath };
}

function loadProfilePage(overrides = {}) {
  return createPageLoader('../pages/profile/profile.js', overrides);
}

function loadFamilyPage(overrides = {}) {
  return createPageLoader('../pages/family/family.js', overrides);
}

describe('profile family entry', () => {
  it('provides a family hub action', () => {
    const { page } = loadProfilePage();
    expect(typeof page.goToFamily).toBe('function');
  });

  it('navigates to the family placeholder page', () => {
    const { page, wx } = loadProfilePage();
    page.goToFamily();
    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/family/family' });
  });
});

describe('family placeholder page', () => {
  it('declares the page as placeholder/building state', () => {
    const { page } = loadFamilyPage();
    expect(page.data.statusTag).toBe('建设中');
    expect(page.data.supportText).toContain('仅提供家庭入口与占位说明');
    expect(page.data.placeholderNotice).toContain('不会创建家庭');
    expect(page.data.placeholderNotice).toContain('不会生成真实邀请码');
  });

  it('exposes four honest family actions', () => {
    const { page } = loadFamilyPage();
    expect(page.data.familyActions).toHaveLength(4);
    expect(page.data.familyActions.map((item) => item.title)).toEqual([
      '创建家庭',
      '加入家庭',
      '查看邀请码',
      '查看成员',
    ]);
  });

  it('shows honest placeholder toast instead of faking a flow', () => {
    const { page, wx } = loadFamilyPage();
    const ctx = { data: page.data };

    page.onActionTap.call(ctx, { currentTarget: { dataset: { title: '加入家庭' } } });

    expect(wx.showToast).toHaveBeenCalledWith({
      title: '当前仅提供入口占位，加入家庭待后端支持',
      icon: 'none',
    });
  });
});
