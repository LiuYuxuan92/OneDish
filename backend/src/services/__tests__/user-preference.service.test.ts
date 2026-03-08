import { UserPreferenceService } from '../user-preference.service';

describe('UserPreferenceService', () => {
  const service = new UserPreferenceService();

  it('normalizes legacy string preferences into typed values', () => {
    expect(service.normalizePreferences({
      default_baby_age: '18',
      prefer_ingredients: '鸡蛋, 鱼',
      exclude_ingredients: '香菜、辣椒',
      cooking_time_limit: '25',
      difficulty_preference: '简单',
    })).toEqual({
      default_baby_age: 18,
      prefer_ingredients: ['鸡蛋', '鱼'],
      exclude_ingredients: ['香菜', '辣椒'],
      cooking_time_limit: 25,
      difficulty_preference: 'easy',
    });
  });

  it('detects excluded ingredients and baby age match', () => {
    const recipe = {
      age_min: 8,
      age_max: 18,
      adult_version: { ingredients: [{ name: '鸡蛋' }, { name: '香菜' }] },
    };

    expect(service.recipeContainsExcludedIngredient(recipe, ['香菜'])).toBe(true);
    expect(service.matchesBabyAge(recipe, 12)).toBe(true);
    expect(service.matchesBabyAge(recipe, 6)).toBe(false);
  });

  it('scores preferred ingredients, cooking time and difficulty', () => {
    const recipe = {
      prep_time: 12,
      difficulty: 'easy',
      adult_version: { ingredients: [{ name: '鸡蛋' }, { name: '番茄' }] },
    };

    const score = service.scoreRecipeByPreferences(recipe, {
      default_baby_age: 12,
      prefer_ingredients: ['鸡蛋'],
      exclude_ingredients: [],
      cooking_time_limit: 15,
      difficulty_preference: 'easy',
    });

    expect(score.score).toBeGreaterThan(0);
    expect(score.reasons).toEqual(expect.arrayContaining(['烹饪时间符合偏好', '难度符合偏好']));
  });
});
