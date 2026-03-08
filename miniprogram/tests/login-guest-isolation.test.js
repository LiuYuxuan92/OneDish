const path = require('path');

describe('miniprogram guest device isolation', () => {
  let pageConfig;
  let storage;
  let toastMock;
  let switchTabMock;
  let guestLoginMock;

  beforeEach(() => {
    jest.resetModules();
    storage = {};
    pageConfig = null;
    toastMock = jest.fn();
    switchTabMock = jest.fn();
    guestLoginMock = jest.fn(() => Promise.resolve({
      token: 'guest-token',
      refresh_token: 'guest-refresh',
      user: { id: 'guest-user', is_guest: true },
    }));

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
      showToast: toastMock,
      switchTab: switchTabMock,
      showModal: jest.fn(),
    };

    jest.doMock('../utils/api', () => ({
      guestLogin: guestLoginMock,
      wechatLogin: jest.fn(),
    }));

    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    require('../pages/login/login.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function buildPageInstance() {
    return {
      data: { ...pageConfig.data },
      setData(update) {
        this.data = { ...this.data, ...update };
      },
      ...pageConfig,
    };
  }

  it('reuses persisted guest device id when guest login is called repeatedly', async () => {
    const page = buildPageInstance();

    await page.guestLogin();
    await Promise.resolve();

    expect(guestLoginMock).toHaveBeenCalledWith('wx_1700000000000_4fzzzxjylr');
    expect(storage.guest_device_id).toBe('wx_1700000000000_4fzzzxjylr');

    guestLoginMock.mockClear();
    page.setData({ loading: false });

    await page.guestLogin();
    await Promise.resolve();

    expect(guestLoginMock).toHaveBeenCalledWith('wx_1700000000000_4fzzzxjylr');
    expect(Object.keys(storage).filter((key) => key === 'guest_device_id')).toHaveLength(1);
  });
});
