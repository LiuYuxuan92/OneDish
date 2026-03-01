import { buildRecommendationReasons, scoreRecommendationQuality } from '../recommendationInsights';

describe('recommendationInsights', () => {
  const recipe = {
    id: 'r10',
    category: ['家常', '鸡肉'],
    prep_time: 25,
    stage: 'mid',
    nutrition_info: { protein: 20 },
    adult_version: {
      ingredients: ['鸡肉', '土豆', '胡萝卜'],
    },
  };

  it('生成统一结构推荐理由（2-3条）', () => {
    const reasons = buildRecommendationReasons({
      recipe,
      currentStage: { key_nutrients: ['铁', '锌'] },
      preferredCategories: ['鸡肉'],
    });

    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons.length).toBeLessThanOrEqual(3);
    expect(reasons[0]).toEqual(
      expect.objectContaining({
        key: expect.any(String),
        title: expect.any(String),
        detail: expect.any(String),
        strength: expect.stringMatching(/high|medium|low/),
      }),
    );
  });

  it('输出质量评分及维度分', () => {
    const scored = scoreRecommendationQuality({
      recipe,
      currentRecipe: { prep_time: 30 },
      currentStage: { stage: 'mid' },
      preferredCategories: ['鸡肉'],
      timeWindowMinutes: 10,
    });

    expect(scored.total).toBeGreaterThanOrEqual(0);
    expect(scored.total).toBeLessThanOrEqual(100);
    expect(scored.dimensions).toEqual(
      expect.objectContaining({
        timeFit: expect.any(Number),
        nutritionFit: expect.any(Number),
        preferenceFit: expect.any(Number),
        stageFit: expect.any(Number),
      }),
    );
  });
});
