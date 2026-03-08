jest.mock('../utils/request', () => jest.fn((options) => Promise.resolve(options)));

const request = require('../utils/request');
const api = require('../utils/api');

describe('miniprogram feeding feedback api', () => {
  beforeEach(() => {
    request.mockClear();
  });

  it('submits feeding feedback with auth', async () => {
    await api.createFeedingFeedback({
      recipe_id: 'recipe-1',
      accepted_level: 'like',
      allergy_flag: false,
      note: '很喜欢',
    });

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/feeding-feedbacks',
      method: 'POST',
      withAuth: true,
      data: expect.objectContaining({ recipe_id: 'recipe-1', accepted_level: 'like' }),
    }));
  });
});
