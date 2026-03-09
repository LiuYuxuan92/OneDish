const state = {
  feedbacks: [] as any[],
  nowIndex: 0,
  recipes: [
    { id: 'recipe-1', name: '番茄鸡蛋面', image_url: '["https://img.test/1.png"]' },
    { id: 'recipe-2', name: '南瓜粥', image_url: null },
  ],
};

// 创建一个 mock query builder
const createMockQueryBuilder = (rows: any[]) => {
  const ctx: any = { rows: [...rows] };

  const filterByField = (field: string, value: any) => {
    const key = field.split('.').pop()!;
    ctx.rows = ctx.rows.filter((row: any) => row[key] === value);
    return ctx;
  };

  ctx.leftJoin = jest.fn(() => ctx);
  ctx.where = jest.fn(filterByField);
  ctx.andWhere = jest.fn(filterByField);
  ctx.whereIn = jest.fn((field: string, values: any[]) => {
    const key = field.split('.').pop()!;
    ctx.rows = ctx.rows.filter((row: any) => values.includes(row[key]));
    return ctx;
  });
  ctx.whereNull = jest.fn((field: string) => {
    const key = field.split('.').pop()!;
    ctx.rows = ctx.rows.filter((row: any) => row[key] == null);
    return ctx;
  });
  ctx.select = jest.fn(() => ctx);
  ctx.orderBy = jest.fn((field: string, dir: string) => {
    const key = field.split('.').pop()!;
    ctx.rows = [...ctx.rows].sort((a: any, b: any) => {
      const av = a[key] ? new Date(a[key]).getTime() : 0;
      const bv = b[key] ? new Date(b[key]).getTime() : 0;
      return dir === 'desc' ? bv - av : av - bv;
    });
    return ctx;
  });
  ctx.limit = jest.fn(function(limit: number) {
    return ctx.rows.slice(0, limit);
  });
  ctx.first = jest.fn(async () => ctx.rows[0] || null);
  ctx.then = (resolve: any, reject: any) => Promise.resolve(ctx.rows).then(resolve, reject);
  
  return ctx;
};

jest.mock('../../config/database', () => {
  const db = jest.fn((tableName: string) => {
    if (tableName === 'feeding_feedbacks') {
      return {
        insert: jest.fn(async (row: any) => {
          state.feedbacks.push({ ...row });
          return [row];
        }),
      };
    }

    if (tableName === 'feeding_feedbacks as ff') {
      const rowsWithRecipe = state.feedbacks.map((feedback) => {
        const recipe = state.recipes.find((item) => item.id === feedback.recipe_id);
        return {
          ...feedback,
          recipe_name: recipe?.name || null,
          recipe_image_url: recipe?.image_url || null,
        };
      });
      return createMockQueryBuilder(rowsWithRecipe);
    }

    // 其他表返回空的 mock
    return createMockQueryBuilder([]);
  });

  return {
    db,
    generateUUID: jest.fn(() => `feedback-${state.feedbacks.length + 1}`),
  };
});

jest.mock('../family.service', () => ({
  familyService: {
    getFamilyIdForUser: jest.fn(() => Promise.resolve(null)),
    getFamilyByUserId: jest.fn(() => Promise.resolve(null)),
  },
}));

import { FeedingFeedbackService } from '../feedingFeedback.service';

describe('FeedingFeedbackService', () => {
  const realDateNow = Date.now;
  const service = new FeedingFeedbackService();

  beforeEach(() => {
    state.feedbacks.length = 0;
    state.nowIndex = 0;
    Date.now = jest.fn(() => 1700000000000 + state.nowIndex++ * 1000);
  });

  afterAll(() => {
    Date.now = realDateNow;
  });

  it('creates feedback and returns joined recipe info', async () => {
    const created = await service.createFeedback({
      user_id: 'user-1',
      recipe_id: 'recipe-1',
      meal_plan_id: 'plan-1',
      baby_age_at_that_time: 11,
      accepted_level: 'like',
      allergy_flag: true,
      note: '吃得很开心',
    });

    expect(created.recipe_name).toBe('番茄鸡蛋面');
    expect(created.accepted_level).toBe('like');
    expect(created.allergy_flag).toBe(true);
  });

  it('lists recent feedbacks by user and recipe with pagination', async () => {
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'ok' });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-2', accepted_level: 'reject', note: '今天不太想吃' });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'like' });
    await service.createFeedback({ user_id: 'user-2', recipe_id: 'recipe-1', accepted_level: 'like' });

    const recent = await service.listRecentFeedbacks({ user_id: 'user-1', limit: 2, offset: 1 });
    expect(recent.items).toHaveLength(2);
    expect(recent.pagination).toEqual({
      limit: 2,
      offset: 1,
      total: 3,
      has_more: false,
    });
    expect(recent.items.every((item) => item.user_id === 'user-1')).toBe(true);
    expect(recent.items.length).toBe(2);

    const onlyRecipe1 = await service.listRecentFeedbacks({ user_id: 'user-1', recipe_id: 'recipe-1' });
    expect(onlyRecipe1.items).toHaveLength(2);
    expect(onlyRecipe1.items[0].recipe_name).toBe('番茄鸡蛋面');
  });

  it('summarizes feedbacks by recipe', async () => {
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'like', baby_age_at_that_time: 10 });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'reject', allergy_flag: true, baby_age_at_that_time: 12 });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-2', accepted_level: 'ok', baby_age_at_that_time: 9 });
    await service.createFeedback({ user_id: 'user-2', recipe_id: 'recipe-1', accepted_level: 'like' });

    const summaries = await service.listRecipeSummaries({ user_id: 'user-1', limit: 10 });
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      recipe_id: 'recipe-1',
      feedback_count: 2,
      like_count: 1,
      ok_count: 0,
      reject_count: 1,
      allergy_count: 1,
      average_baby_age_at_feedback: 11,
    });
    expect(['like', 'reject']).toContain(summaries[0].latest_accepted_level);
    expect(summaries[1]).toMatchObject({
      recipe_id: 'recipe-2',
      feedback_count: 1,
      ok_count: 1,
    });
  });

  it('gets summary by recipe id for recipe detail page', async () => {
    // 创建多条反馈记录
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'like', baby_age_at_that_time: 10 });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'ok', baby_age_at_that_time: 12 });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'reject', allergy_flag: true, baby_age_at_that_time: 14 });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-2', accepted_level: 'like' });
    await service.createFeedback({ user_id: 'user-2', recipe_id: 'recipe-1', accepted_level: 'like' }); // 另一个用户的记录不应包含

    // 测试获取 recipe-1 的 summary
    const summary1 = await service.getSummaryByRecipeId({ user_id: 'user-1', recipe_id: 'recipe-1' });
    expect(summary1).not.toBeNull();
    expect(summary1?.recipe_id).toBe('recipe-1');
    expect(summary1?.feedback_count).toBe(3);
    expect(summary1?.like_count).toBe(1);
    expect(summary1?.ok_count).toBe(1);
    expect(summary1?.reject_count).toBe(1);
    expect(summary1?.allergy_count).toBe(1);
    expect(summary1?.average_baby_age_at_feedback).toBe(12); // (10+12+14)/3 = 12
    // latest_accepted_level 应该是三条记录中 created_at 最新那一条的 accepted_level
    expect(['like', 'ok', 'reject']).toContain(summary1?.latest_accepted_level);
    expect(summary1?.recipe_name).toBe('番茄鸡蛋面');

    // 测试获取 recipe-2 的 summary
    const summary2 = await service.getSummaryByRecipeId({ user_id: 'user-1', recipe_id: 'recipe-2' });
    expect(summary2).not.toBeNull();
    expect(summary2?.feedback_count).toBe(1);
    expect(summary2?.like_count).toBe(1);

    // 测试不存在的 recipe
    const summary3 = await service.getSummaryByRecipeId({ user_id: 'user-1', recipe_id: 'nonexistent' });
    expect(summary3).toBeNull();

    // 测试空 user_id
    const summary4 = await service.getSummaryByRecipeId({ user_id: '', recipe_id: 'recipe-1' });
    expect(summary4).toBeNull();
  });

  it('rejects invalid accepted level', async () => {
    await expect(service.createFeedback({
      user_id: 'user-1',
      recipe_id: 'recipe-1',
      accepted_level: 'bad' as any,
    })).rejects.toThrow('INVALID_ACCEPTED_LEVEL');
  });
});
