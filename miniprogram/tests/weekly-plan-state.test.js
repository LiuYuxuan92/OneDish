const {
  buildWeeklyPlanStateFromResult,
  deriveTodayExecutionFromWeeklyState,
  normalizeWeeklyPlanEntry,
} = require('../pages/plan/plan-execution-state');

describe('weekly plan state helpers', () => {
  test('builds stable weekly plan state from generated result', () => {
    const state = buildWeeklyPlanStateFromResult({
      plans: {
        '2026-03-19': {
          breakfast: { id: 'r1', name: '南瓜米糊' },
          dinner: { recipe_id: 'r3', title: '鳕鱼粥' },
        },
      },
    });

    expect(state['2026-03-19'].breakfast.title).toBe('南瓜米糊');
    expect(state['2026-03-19'].dinner.recipeId).toBe('r3');
    expect(state['2026-03-19'].dinner.recipe).toMatchObject({ recipe_id: 'r3', title: '鳕鱼粥' });
  });

  test('normalizes missing meal slots to null', () => {
    const state = buildWeeklyPlanStateFromResult({
      plans: {
        '2026-03-19': {
          breakfast: { id: 'r1', name: '南瓜米糊' },
        },
      },
    });

    expect(state['2026-03-19'].lunch).toBeNull();
    expect(state['2026-03-19'].dinner).toBeNull();
    expect(state['2026-03-19'].breakfast).toMatchObject({
      date: '2026-03-19',
      mealType: 'breakfast',
      mealLabel: '早餐',
      title: '南瓜米糊',
      recipeId: 'r1',
      ingredients: [],
      done: false,
      source: 'generated',
    });
    expect(state['2026-03-19'].breakfast.recipe).toMatchObject({ id: 'r1', name: '南瓜米糊' });
  });

  test('derives today execution entries in breakfast lunch dinner order', () => {
    const state = buildWeeklyPlanStateFromResult({
      plans: {
        '2026-03-19': {
          dinner: { recipe_id: 'r3', title: '鳕鱼粥', ingredients: ['鳕鱼'] },
          breakfast: { id: 'r1', name: '南瓜米糊' },
          lunch: { recipe: { id: 'r2', title: '鸡肉泥' } },
        },
      },
    });

    const todayExecution = deriveTodayExecutionFromWeeklyState(state, '2026-03-19');

    expect(todayExecution.map((item) => item.mealType)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(todayExecution[0]).toMatchObject({
      date: '2026-03-19',
      mealType: 'breakfast',
      mealLabel: '早餐',
      title: '南瓜米糊',
      recipeId: 'r1',
      ingredients: [],
      done: false,
      source: 'generated',
    });
    expect(todayExecution[1]).toMatchObject({
      date: '2026-03-19',
      mealType: 'lunch',
      mealLabel: '午餐',
      title: '鸡肉泥',
      recipeId: 'r2',
      ingredients: [],
      done: false,
      source: 'generated',
    });
    expect(todayExecution[2]).toMatchObject({
      date: '2026-03-19',
      mealType: 'dinner',
      mealLabel: '晚餐',
      title: '鳕鱼粥',
      recipeId: 'r3',
      ingredients: ['鳕鱼'],
      done: false,
      source: 'generated',
    });
    expect(todayExecution[1].recipe).toMatchObject({ id: 'r2', title: '鸡肉泥' });
    expect(todayExecution[2].recipe).toMatchObject({ recipe_id: 'r3', title: '鳕鱼粥', ingredients: ['鳕鱼'] });
  });

  test('preserves existing done and source values when normalizing', () => {
    const normalized = normalizeWeeklyPlanEntry({
      recipe: { id: 'r1', title: '南瓜米糊', ingredients: ['南瓜'] },
      done: true,
      source: 'saved',
    }, '2026-03-19', 'breakfast');

    expect(normalized).toMatchObject({
      date: '2026-03-19',
      mealType: 'breakfast',
      mealLabel: '早餐',
      title: '南瓜米糊',
      recipeId: 'r1',
      ingredients: ['南瓜'],
      done: true,
      source: 'saved',
    });
    expect(normalized.recipe).toMatchObject({ id: 'r1', title: '南瓜米糊', ingredients: ['南瓜'] });
  });
});
