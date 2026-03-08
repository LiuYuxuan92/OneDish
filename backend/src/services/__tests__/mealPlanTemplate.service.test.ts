jest.mock('../../config/database', () => {
  const data = {
    templates: [] as any[],
    recipes: [
      { id: 'recipe-1', name: '番茄鸡蛋面' },
      { id: 'recipe-2', name: '南瓜粥' },
    ],
    mealPlans: [
      { plan_date: '2026-03-02', meal_type: 'breakfast', recipe_id: 'recipe-1', servings: 2, recipe_name: '番茄鸡蛋面' },
      { plan_date: '2026-03-03', meal_type: 'dinner', recipe_id: 'recipe-missing', servings: 3, recipe_name: null },
    ],
  };

  const builder = (table: string) => {
    const state: any = { table, rows: [], insertPayload: null, whereInValues: [] };
    const api: any = {};

    api.leftJoin = jest.fn().mockReturnValue(api);
    api.whereBetween = jest.fn().mockReturnValue(api);
    api.orderBy = jest.fn().mockImplementation((_field?: string, direction?: string) => {
      if (table === 'meal_plans as mp') {
        state.orderByCalls = (state.orderByCalls || 0) + 1;
        if (state.orderByCalls >= 2) {
          return Promise.resolve(state.rows);
        }
      }
      return api;
    });
    api.offset = jest.fn().mockReturnValue(api);
    api.limit = jest.fn().mockReturnValue(api);
    api.increment = jest.fn().mockReturnValue(api);
    api.update = jest.fn().mockResolvedValue(1);
    api.del = jest.fn().mockResolvedValue(1);
    api.clone = jest.fn().mockImplementation(() => api);
    api.count = jest.fn().mockResolvedValue([{ count: data.templates.length }]);

    api.where = jest.fn().mockImplementation((...args: any[]) => {
      if (typeof args[0] === 'function') {
        const nested: any = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
        args[0](nested);
        return api;
      }
      if (table === 'meal_plan_templates') {
        state.rows = data.templates.filter((row) => row[args[0]] === args[1]);
        return api;
      }
      return api;
    });

    api.whereIn = jest.fn().mockImplementation((_field: string, values: any[]) => {
      state.whereInValues = values;
      return api;
    });

    api.select = jest.fn().mockImplementation((..._args: any[]) => {
      if (table === 'meal_plans as mp') {
        state.rows = data.mealPlans;
        return api;
      }
      return Promise.resolve(
        table === 'meal_plan_templates'
          ? (state.rows.length ? state.rows : data.templates)
          : table === 'recipes'
            ? data.recipes.filter((row) => state.whereInValues.includes(row.id))
            : []
      );
    });

    api.first = jest.fn().mockImplementation(async () => {
      if (table === 'meal_plan_templates') {
        return state.rows[0];
      }
      return undefined;
    });

    api.insert = jest.fn().mockImplementation((payload: any) => {
      state.insertPayload = payload;
      return api;
    });

    api.returning = jest.fn().mockImplementation(async () => {
      const row = {
        id: 'template-1',
        clone_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        ...state.insertPayload,
      };
      data.templates.push(row);
      return [row];
    });

    if (table === 'meal_plan_templates') {
      state.rows = [...data.templates];
    }

    return api;
  };

  const db: any = jest.fn((table: string) => builder(table));
  db.fn = { now: jest.fn(() => new Date()) };

  return { db };
});

jest.mock('../mealPlan.service', () => ({
  MealPlanService: jest.fn().mockImplementation(() => ({
    setMealPlan: jest.fn().mockResolvedValue({ id: 'plan-new' }),
  })),
}));

jest.mock('../family.service', () => ({
  familyService: {
    getFamilyIdForUser: jest.fn().mockResolvedValue('family-1'),
    getOwnerIdForUser: jest.fn().mockResolvedValue('user-1'),
  },
}));

jest.mock('../../utils/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

import { MealPlanTemplateService } from '../mealPlanTemplate.service';

describe('MealPlanTemplateService', () => {
  let service: MealPlanTemplateService;

  beforeEach(() => {
    service = new MealPlanTemplateService();
  });

  it('creates template from weekly meal plans with snapshot fields', async () => {
    const result = await service.createTemplate({
      userId: 'user-1',
      title: '工作日晚餐模板',
      tags: ['快手', '家庭'],
      sourceStartDate: '2026-03-02',
      sourceEndDate: '2026-03-08',
    });

    expect(result.title).toBe('工作日晚餐模板');
    expect(result.family_id).toBe('family-1');
    expect(result.plan_data[0]).toMatchObject({
      source_date: '2026-03-02',
      day_offset: 0,
      meal_type: 'breakfast',
      recipe_id: 'recipe-1',
      recipe_name_snapshot: '番茄鸡蛋面',
      servings: 2,
      status: 'active',
    });
    expect(result.plan_data[1].status).toBe('missing_recipe');
  });

  it('applies template to target week and skips missing recipes gracefully', async () => {
    await service.createTemplate({
      userId: 'user-1',
      title: '模板A',
      sourceStartDate: '2026-03-02',
      sourceEndDate: '2026-03-08',
    });

    const result = await service.applyTemplate('user-1', 'template-1', { targetStartDate: '2026-03-09' });

    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(1);
    expect(result.skippedMissingRecipeCount).toBe(1);
    expect(result.skippedEntries[0]).toMatchObject({
      target_date: '2026-03-10',
      recipe_id: 'recipe-missing',
      reason: 'missing_recipe',
    });
  });
});
