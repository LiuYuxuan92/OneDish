import { buildPreferredCategories, DEFAULT_SWAP_WEIGHTS, getSwapCandidate } from '../swapStrategy';

describe('swapStrategy', () => {
  const currentRecipe = {
    id: 'r1',
    type: 'dinner',
    category: ['家常', '鸡肉'],
    prep_time: 30,
  };

  it('分类优先：命中偏好分类时优先返回', () => {
    const candidate = getSwapCandidate({
      currentRecipe,
      preferredCategories: ['鱼类'],
      allRecipesItems: [
        currentRecipe,
        { id: 'r2', type: 'dinner', category: ['鱼类'], prep_time: 60 },
        { id: 'r3', type: 'dinner', category: ['家常'], prep_time: 30 },
      ],
      currentStage: { stage: 'mid' },
    });

    expect(candidate?.id).toBe('r2');
  });

  it('同时长窗口优先：无分类命中时选同时间窗候选', () => {
    const candidate = getSwapCandidate({
      currentRecipe,
      preferredCategories: [],
      allRecipesItems: [
        currentRecipe,
        { id: 'r2', type: 'dinner', category: ['面食'], prep_time: 38 }, // 时间窗内
        { id: 'r3', type: 'dinner', category: ['炖菜'], prep_time: 80 },
      ],
      currentStage: { stage: 'late' },
    });

    expect(candidate?.id).toBe('r2');
  });

  it('阶段匹配优先：无分类/时间窗命中时选阶段匹配', () => {
    const candidate = getSwapCandidate({
      currentRecipe,
      preferredCategories: [],
      allRecipesItems: [
        currentRecipe,
        { id: 'r2', type: 'dinner', category: ['汤'], prep_time: 80, stage: 'early' },
        { id: 'r3', type: 'dinner', category: ['粥'], prep_time: 80, stage: 'mid' },
      ],
      currentStage: { stage: 'mid' },
    });

    expect(candidate?.id).toBe('r3');
  });

  it('候选为空时返回 null（降级兜底）', () => {
    const candidate = getSwapCandidate({
      currentRecipe,
      allRecipesItems: [currentRecipe],
      preferredCategories: ['家常'],
    });

    expect(candidate).toBeNull();
  });

  it('真实偏好源优先：收藏分类可用时覆盖本地记忆', () => {
    const preferred = buildPreferredCategories({
      favoritesItems: [{ recipe: { id: 'r2', category: ['鱼类', '清淡'] } }],
      allRecipes: [
        { id: 'r2', category: ['鱼类', '清淡'] },
        { id: 'r9', category: ['家常'] },
      ],
      localMemory: ['家常'],
    });

    expect(preferred).toEqual(['鱼类', '清淡']);
  });

  it('真实源不可用时回退本地记忆', () => {
    const preferred = buildPreferredCategories({
      favoritesItems: [],
      allRecipes: [],
      localMemory: ['家常', '快手'],
    });

    expect(preferred).toEqual(['家常', '快手']);
  });

  it('支持可配置权重，默认值保持兼容', () => {
    expect(DEFAULT_SWAP_WEIGHTS.preference).toBe(180);

    const candidate = getSwapCandidate({
      currentRecipe,
      preferredCategories: [],
      allRecipesItems: [
        currentRecipe,
        { id: 'r2', type: 'dinner', category: ['家常'], prep_time: 40 },
        { id: 'r3', type: 'dinner', category: ['甜品'], prep_time: 30, stage: 'mid' },
      ],
      currentStage: { stage: 'mid' },
      weights: {
        stage: 500,
      },
    });

    expect(candidate?.id).toBe('r3');
  });
});
