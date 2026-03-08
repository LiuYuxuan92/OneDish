describe('miniprogram swapRecommendation response unwrap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns nested recipe from backend swap response', async () => {
    const requestMock = jest.fn()
      .mockResolvedValueOnce({
        recipe: { id: 'swap-1', name: '清蒸鲈鱼' },
        score: 320,
        reasons: ['符合你的偏好分类'],
      });

    jest.doMock('../utils/request', () => requestMock);

    const api = require('../utils/api');
    await expect(api.swapRecommendation('recipe_001')).resolves.toEqual({
      id: 'swap-1',
      name: '清蒸鲈鱼',
    });
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      url: '/recipes/swap',
      method: 'POST',
      data: { current_recipe_id: 'recipe_001' },
      withAuth: true,
    }));
  });
});
