const api = require('../utils/api');

jest.mock('../utils/request', () => jest.fn((options) => Promise.resolve(options)));
const request = require('../utils/request');

describe('miniprogram login upgrade api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wechatLogin uses guest upgrade endpoint when requested', async () => {
    const result = await api.wechatLogin('code-1', { nickName: 'u' }, { upgradeGuest: true });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/auth/upgrade-guest/wechat',
      withAuth: true,
    }));
    expect(result.url).toBe('/auth/upgrade-guest/wechat');
  });

  it('upgradeGuestLogin calls dedicated endpoint with auth', async () => {
    const result = await api.upgradeGuestLogin({ email: 'a@test.com', password: '123456' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/auth/upgrade-guest/login',
      method: 'POST',
      withAuth: true,
    }));
    expect(result.url).toBe('/auth/upgrade-guest/login');
  });
});
