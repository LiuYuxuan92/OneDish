import { SearchRankingService } from '../search-ranking.service';

jest.mock('../../config/database', () => ({
  db: jest.fn((table: string) => {
    if (table !== 'ingredient_inventory') throw new Error(`unexpected table ${table}`);
    return {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([{ ingredient_name: '鸡蛋' }, { ingredient_name: '番茄' }]),
    } as any;
  }),
}));

jest.mock('../user-preference.service', () => ({
  userPreferenceService: {
    getUserPreferences: jest.fn().mockResolvedValue({
      default_baby_age: 12,
      prefer_ingredients: ['鱼'],
      exclude_ingredients: ['辣椒'],
      cooking_time_limit: 25,
      difficulty_preference: 'easy',
    }),
    scoreRecipeByPreferences: jest.fn((recipe: any, prefs: any) => {
      const reasons: string[] = [];
      let score = 0;
      if ((recipe.ingredients || []).some((item: string) => item.includes('鱼'))) {
        score += 20;
        reasons.push('命中偏好食材:鱼');
      }
      if ((recipe.prep_time || 0) <= (prefs.cooking_time_limit || 999)) {
        score += 10;
        reasons.push('烹饪时间符合偏好');
      }
      return { score, reasons };
    }),
    extractRecipeIngredientNames: jest.fn((recipe: any) => recipe.ingredients || []),
  },
}));

describe('SearchRankingService', () => {
  it('prioritizes inventory coverage and scenario mapping', async () => {
    const service = new SearchRankingService();
    const ranked = await service.rank([
      {
        id: '1',
        name: '番茄炒蛋',
        source: 'local',
        prep_time: 15,
        difficulty: '简单',
        ingredients: ['番茄1个', '鸡蛋2个'],
        tags: ['家常菜', '快手菜'],
      },
      {
        id: '2',
        name: '红烧牛肉',
        source: 'ai',
        prep_time: 50,
        difficulty: '困难',
        ingredients: ['牛肉500g', '辣椒1个'],
        tags: ['下饭菜'],
      },
    ], {
      userId: 'u1',
      keyword: '赶时间',
      inventoryIngredients: ['鸡蛋', '番茄'],
      scenario: '赶时间 快手 简单点',
    });

    expect(ranked[0].name).toBe('番茄炒蛋');
    expect(ranked[0].ranking_reasons?.some((item) => item.code === 'inventory')).toBe(true);
    expect(ranked[0].ranking_reasons?.some((item) => item.code === 'scenario')).toBe(true);
    expect(ranked[0].recommendation_explain?.length).toBeGreaterThan(0);
    expect(ranked[1].ranking_reasons?.some((item) => item.code === 'source')).toBe(true);
  });
});
