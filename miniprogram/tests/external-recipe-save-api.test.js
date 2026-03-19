jest.mock('../utils/request', () => jest.fn((options) => Promise.resolve(options)));

const request = require('../utils/request');
const api = require('../utils/api');

describe('miniprogram external recipe save api', () => {
  beforeEach(() => {
    request.mockClear();
  });

  it('posts to /user-recipes with auth', async () => {
    await api.saveExternalRecipe({ name: '番茄牛肉' });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/user-recipes',
      method: 'POST',
      withAuth: true,
      data: { name: '番茄牛肉' },
    }));
  });
});
