describe('feature matrix config', () => {
  it('includes app upsell items for miniprogram view', async () => {
    const { getFeatureMatrix } = await import('../../config/feature-matrix');
    const items = getFeatureMatrix('miniprogram');

    expect(items.some((item) => item.feature_code === 'ai_baby_recipe')).toBe(true);
    expect(items.some((item) => item.feature_code === 'inventory_advanced')).toBe(true);
    expect(items.find((item) => item.feature_code === 'inventory_advanced')?.platform_experience.miniprogram).toBe('upsell');
  });

  it('returns app-only features as full for app platform', async () => {
    const { getFeatureMatrix } = await import('../../config/feature-matrix');
    const items = getFeatureMatrix('app');
    expect(items.find((item) => item.feature_code === 'weekly_review')?.platform_experience.app).toBe('full');
  });
});
