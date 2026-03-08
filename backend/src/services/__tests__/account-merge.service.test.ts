jest.mock('../../config/database', () => {
  const transaction = jest.fn();
  const db = Object.assign(jest.fn(), {
    transaction,
  });
  return { db };
});

import { AccountMergeService } from '../account-merge.service';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../mealPlan.service', () => ({
  MealPlanService: jest.fn().mockImplementation(() => ({
    recomputeRecommendationLearning: jest.fn().mockResolvedValue({ affected_profiles: 3 }),
  })),
}));

describe('AccountMergeService', () => {
  let service: AccountMergeService;
  let trx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountMergeService();

    trx = jest.fn((tableName: string) => {
      switch (tableName) {
        case 'users':
          return usersTable();
        case 'favorites':
          return favoritesTable();
        case 'meal_plans':
          return mealPlansTable();
        case 'shopping_lists':
          return shoppingListsTable();
        case 'ingredient_inventory':
          return inventoryTable();
        case 'recommendation_feedbacks':
          return recommendationFeedbacksTable();
        case 'recommendation_learning_profiles':
          return learningProfilesTable();
        default:
          throw new Error(`Unexpected table: ${tableName}`);
      }
    });

    const dbModule = require('../../config/database');
    dbModule.db.transaction.mockImplementation(async (handler: any) => handler(trx));
  });

  function usersTable() {
    return {
      where: jest.fn((column: string, value: string) => ({
        first: jest.fn().mockImplementation(async () => {
          if (column !== 'id') return null;
          if (value === 'guest-user') {
            return { id: 'guest-user', username: 'guest_1', email: 'guest@example.com', preferences: JSON.stringify({ is_guest: true, guest_device_id: 'dev-1', prefer_ingredients: ['鸡蛋'] }) };
          }
          if (value === 'target-user') {
            return { id: 'target-user', username: 'formal', email: 'formal@example.com', preferences: JSON.stringify({ prefer_ingredients: ['牛肉'], exclude_ingredients: ['辣椒'], cooking_time_limit: 20 }) };
          }
          return null;
        }),
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: value, preferences: JSON.stringify({ prefer_ingredients: ['牛肉', '鸡蛋'], exclude_ingredients: ['辣椒'], cooking_time_limit: 20, merged_guest_sources: ['guest-user'] }) }]),
        }),
      })),
    };
  }

  function favoritesTable() {
    return {
      where: jest.fn((column: string, value: string) => {
        if (column === 'user_id' && value === 'guest-user') {
          return {
            select: jest.fn().mockResolvedValue([
              { id: 'fav1', recipe_id: 'recipe-1' },
              { id: 'fav2', recipe_id: 'recipe-2' },
            ]),
          };
        }
        if (column === 'user_id' && value === 'target-user') {
          return {
            select: jest.fn().mockResolvedValue([{ recipe_id: 'recipe-2' }]),
          };
        }
        if (column === 'id') {
          return {
            update: jest.fn().mockResolvedValue(1),
            delete: jest.fn().mockResolvedValue(1),
          };
        }
        return { select: jest.fn().mockResolvedValue([]) };
      }),
    };
  }

  function mealPlansTable() {
    return {
      where: jest.fn((column: string, value: string) => {
        if (column === 'user_id' && value === 'guest-user') {
          return {
            select: jest.fn().mockResolvedValue([
              { id: 'plan1', plan_date: '2026-03-10', meal_type: 'lunch' },
              { id: 'plan2', plan_date: '2026-03-11', meal_type: 'dinner' },
            ]),
          };
        }
        if (column === 'user_id' && value === 'target-user') {
          return {
            select: jest.fn().mockResolvedValue([{ plan_date: '2026-03-11', meal_type: 'dinner' }]),
          };
        }
        if (column === 'id') {
          return {
            update: jest.fn().mockResolvedValue(1),
            delete: jest.fn().mockResolvedValue(1),
          };
        }
        return { select: jest.fn().mockResolvedValue([]) };
      }),
    };
  }

  function shoppingListsTable() {
    return {
      where: jest.fn(() => ({
        update: jest.fn().mockResolvedValue(2),
      })),
    };
  }

  function inventoryTable() {
    return {
      where: jest.fn((column: string, value: string) => {
        if (column === 'user_id' && value === 'guest-user') {
          return {
            select: jest.fn().mockResolvedValue([
              { id: 'inv1', ingredient_name: '牛奶', unit: '盒', expiry_date: '2026-03-12', quantity: 1 },
              { id: 'inv2', ingredient_name: '鸡蛋', unit: '个', expiry_date: '2026-03-13', quantity: 3 },
            ]),
          };
        }
        if (column === 'user_id' && value === 'target-user') {
          return {
            select: jest.fn().mockResolvedValue([
              { id: 'inv-target', ingredient_name: '鸡蛋', unit: '个', expiry_date: '2026-03-13', quantity: 2 },
            ]),
          };
        }
        if (column === 'id' && value === 'inv-target') {
          return {
            update: jest.fn().mockResolvedValue(1),
          };
        }
        if (column === 'id') {
          return {
            update: jest.fn().mockResolvedValue(1),
            delete: jest.fn().mockResolvedValue(1),
          };
        }
        return { select: jest.fn().mockResolvedValue([]) };
      }),
    };
  }

  function recommendationFeedbacksTable() {
    return {
      where: jest.fn(() => ({
        update: jest.fn().mockResolvedValue(4),
      })),
    };
  }

  function learningProfilesTable() {
    return {
      where: jest.fn(() => ({
        delete: jest.fn().mockResolvedValue(1),
      })),
    };
  }

  it('merges guest assets into formal account with conflict handling', async () => {
    const result = await service.mergeGuestIntoUser('guest-user', 'target-user');

    expect(result.favorites).toEqual({ moved: 1, skipped: 1 });
    expect(result.meal_plans).toEqual({ moved: 1, skipped: 1 });
    expect(result.shopping_lists).toEqual({ moved: 2 });
    expect(result.inventory).toEqual({ moved: 1, merged: 1 });
    expect(result.recommendation_feedbacks).toEqual({ moved: 4 });
    expect(result.preferences.updated).toBe(true);
    expect(result.preferences.preferences.prefer_ingredients).toEqual(['牛肉', '鸡蛋']);
  });

  it('rejects non-guest source user', async () => {
    trx = jest.fn((tableName: string) => {
      if (tableName !== 'users') throw new Error('Unexpected table');
      return {
        where: jest.fn((column: string, value: string) => ({
          first: jest.fn().mockResolvedValue(
            value === 'guest-user'
              ? { id: 'guest-user', preferences: JSON.stringify({ is_guest: false }) }
              : { id: 'target-user', preferences: JSON.stringify({}) }
          ),
        })),
      };
    });
    const dbModule = require('../../config/database');
    dbModule.db.transaction.mockImplementation(async (handler: any) => handler(trx));

    await expect(service.mergeGuestIntoUser('guest-user', 'target-user')).rejects.toThrow('MERGE_SOURCE_NOT_GUEST');
  });
});
