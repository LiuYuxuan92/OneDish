const {
  buildExecutionSeedFromPlan,
  buildTodayExecutionState,
  countExecutionDone,
  normalizeExecutionEntry,
  shouldReplaceEntryWithSeed,
} = require('../pages/plan/plan-execution-state');

describe('plan execution state helpers', () => {
  it('builds today execution seed from generated plan slots', () => {
    const entries = buildExecutionSeedFromPlan({
      plans: {
        '2026-03-19': {
          breakfast: { id: 'r1', name: '南瓜米糊', ingredients: ['南瓜', { name: '大米' }] },
          dinner: { recipe_id: 'r3', title: '鳕鱼蔬菜粥', ingredients: [{ item_name: '鳕鱼' }] },
        },
      },
    }, '2026-03-19');

    expect(entries).toEqual([
      expect.objectContaining({
        slot: 'breakfast',
        slotLabel: '早餐',
        title: '南瓜米糊',
        recipeId: 'r1',
        ingredients: ['南瓜', '大米'],
        done: false,
      }),
      expect.objectContaining({
        slot: 'lunch',
        slotLabel: '午餐',
        title: '待安排',
        recipeId: '',
        ingredients: [],
      }),
      expect.objectContaining({
        slot: 'dinner',
        slotLabel: '晚餐',
        title: '鳕鱼蔬菜粥',
        recipeId: 'r3',
        ingredients: ['鳕鱼'],
      }),
    ]);
  });

  it('prefers stored execution state while backfilling missing slots', () => {
    const state = buildTodayExecutionState({
      '2026-03-19': [
        {
          date: '2026-03-19',
          slot: 'breakfast',
          title: '已保存早餐',
          recipeId: 'saved-1',
          done: true,
        },
      ],
    }, [
      {
        date: '2026-03-19',
        slot: 'breakfast',
        title: '新早餐',
        recipeId: 'generated-1',
      },
      {
        date: '2026-03-19',
        slot: 'lunch',
        title: '新午餐',
        recipeId: 'generated-2',
      },
    ], '2026-03-19');

    expect(state).toEqual([
      expect.objectContaining({ slot: 'breakfast', title: '已保存早餐', recipeId: 'saved-1', done: true }),
      expect.objectContaining({ slot: 'lunch', title: '新午餐', recipeId: 'generated-2', done: false }),
      expect.objectContaining({ slot: 'dinner', title: '待安排', recipeId: '', done: false }),
    ]);
    expect(state[1].source).toBe('generated');
  });

  it('re-seeds generated slots while preserving completed or manual entries', () => {
    const state = buildTodayExecutionState({
      '2026-03-19': [
        {
          date: '2026-03-19',
          slot: 'breakfast',
          title: '旧早餐',
          recipeId: 'old-breakfast',
          source: 'generated',
          done: false,
        },
        {
          date: '2026-03-19',
          slot: 'lunch',
          title: '手动午餐',
          recipeId: 'manual-lunch',
          source: 'manual',
          done: false,
        },
        {
          date: '2026-03-19',
          slot: 'dinner',
          title: '已完成晚餐',
          recipeId: 'done-dinner',
          source: 'generated',
          done: true,
        },
      ],
    }, [
      {
        date: '2026-03-19',
        slot: 'breakfast',
        title: '新早餐',
        recipeId: 'new-breakfast',
        recipe: { recipe_id: 'new-breakfast', title: '新早餐' },
      },
      {
        date: '2026-03-19',
        slot: 'lunch',
        title: '新午餐',
        recipeId: 'new-lunch',
      },
      {
        date: '2026-03-19',
        slot: 'dinner',
        title: '新晚餐',
        recipeId: 'new-dinner',
      },
    ], '2026-03-19');

    expect(state[0]).toEqual(expect.objectContaining({
      slot: 'breakfast',
      title: '新早餐',
      recipeId: 'new-breakfast',
      done: false,
      source: 'generated',
    }));
    expect(state[1]).toEqual(expect.objectContaining({
      slot: 'lunch',
      title: '手动午餐',
      recipeId: 'manual-lunch',
      source: 'manual',
    }));
    expect(state[2]).toEqual(expect.objectContaining({
      slot: 'dinner',
      title: '已完成晚餐',
      recipeId: 'done-dinner',
      done: true,
    }));
  });

  it('normalizes sparse execution entries and preserves recipe context for navigation', () => {
    const entry = normalizeExecutionEntry({
      slot: 'lunch',
      recipe: { recipe_id: 'recipe-2', title: '番茄鸡蛋面' },
      done: 1,
    }, '2026-03-19');

    expect(entry).toEqual(expect.objectContaining({
      date: '2026-03-19',
      slot: 'lunch',
      slotLabel: '午餐',
      title: '番茄鸡蛋面',
      recipeId: 'recipe-2',
      ingredients: [],
      done: true,
    }));
    expect(entry.recipe).toEqual(expect.objectContaining({
      id: 'recipe-2',
      recipe_id: 'recipe-2',
      name: '番茄鸡蛋面',
      title: '番茄鸡蛋面',
    }));

    expect(shouldReplaceEntryWithSeed(
      { slot: 'breakfast', title: '旧早餐', recipeId: 'old', source: 'generated' },
      { slot: 'breakfast', title: '新早餐', recipeId: 'new' }
    )).toBe(true);
    expect(shouldReplaceEntryWithSeed(
      { slot: 'dinner', title: '手动晚餐', recipeId: 'manual', source: 'manual' },
      { slot: 'dinner', title: '新晚餐', recipeId: 'new' }
    )).toBe(false);

    expect(countExecutionDone([
      entry,
      normalizeExecutionEntry({ slot: 'breakfast' }, '2026-03-19'),
    ])).toBe(1);
  });
});
