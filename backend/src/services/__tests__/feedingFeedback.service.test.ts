const state = {
  feedbacks: [] as any[],
  nowIndex: 0,
  recipes: [
    { id: 'recipe-1', name: '番茄鸡蛋面', image_url: '["https://img.test/1.png"]' },
    { id: 'recipe-2', name: '南瓜粥', image_url: null },
  ],
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
      const ctx: any = {
        rows: state.feedbacks.map((feedback) => {
          const recipe = state.recipes.find((item) => item.id === feedback.recipe_id);
          return {
            ...feedback,
            recipe_name: recipe?.name || null,
            recipe_image_url: recipe?.image_url || null,
          };
        }),
      };

      const resolveRows = async () => ctx.rows;

      ctx.leftJoin = jest.fn(() => ctx);
      ctx.where = jest.fn((field: string, value: any) => {
        ctx.rows = ctx.rows.filter((row: any) => row[field.split('.').pop()!] === value);
        return ctx;
      });
      ctx.andWhere = jest.fn((field: string, value: any) => {
        ctx.rows = ctx.rows.filter((row: any) => row[field.split('.').pop()!] === value);
        return ctx;
      });
      ctx.select = jest.fn(() => ctx);
      ctx.orderBy = jest.fn((field: string, dir: string) => {
        const key = field.split('.').pop()!;
        ctx.rows = [...ctx.rows].sort((a: any, b: any) => {
          const av = new Date(a[key]).getTime();
          const bv = new Date(b[key]).getTime();
          return dir === 'desc' ? bv - av : av - bv;
        });
        return ctx;
      });
      ctx.limit = jest.fn(async (limit: number) => ctx.rows.slice(0, limit));
      ctx.first = jest.fn(async () => ctx.rows[0]);
      ctx.then = (resolve: any, reject: any) => resolveRows().then(resolve, reject);
      return ctx;
    }

    throw new Error(`Unexpected table ${tableName}`);
  });

  return {
    db,
    generateUUID: jest.fn(() => `feedback-${state.feedbacks.length + 1}`),
  };
});

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

  it('rejects invalid accepted level', async () => {
    await expect(service.createFeedback({
      user_id: 'user-1',
      recipe_id: 'recipe-1',
      accepted_level: 'bad' as any,
    })).rejects.toThrow('INVALID_ACCEPTED_LEVEL');
  });
});
