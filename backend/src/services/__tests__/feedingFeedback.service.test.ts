const state = {
  feedbacks: [] as any[],
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
  const service = new FeedingFeedbackService();

  beforeEach(() => {
    state.feedbacks.length = 0;
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

  it('lists recent feedbacks by user and recipe', async () => {
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-1', accepted_level: 'ok' });
    await service.createFeedback({ user_id: 'user-1', recipe_id: 'recipe-2', accepted_level: 'reject', note: '今天不太想吃' });
    await service.createFeedback({ user_id: 'user-2', recipe_id: 'recipe-1', accepted_level: 'like' });

    const recent = await service.listRecentFeedbacks({ user_id: 'user-1', limit: 5 });
    expect(recent).toHaveLength(2);
    expect(recent.map((item) => item.recipe_id).sort()).toEqual(['recipe-1', 'recipe-2']);

    const onlyRecipe1 = await service.listRecentFeedbacks({ user_id: 'user-1', recipe_id: 'recipe-1' });
    expect(onlyRecipe1).toHaveLength(1);
    expect(onlyRecipe1[0].recipe_name).toBe('番茄鸡蛋面');
  });

  it('rejects invalid accepted level', async () => {
    await expect(service.createFeedback({
      user_id: 'user-1',
      recipe_id: 'recipe-1',
      accepted_level: 'bad' as any,
    })).rejects.toThrow('INVALID_ACCEPTED_LEVEL');
  });
});
