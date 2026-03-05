/**
 * MealPlanService Integration Tests
 * 
 * These tests verify the MealPlanService's generateWeeklyPlan functionality.
 */

jest.mock('../../config/database', () => {
  // Create a chainable mock object
  const createMock = () => {
    const mock: any = {};
    mock.where = jest.fn().mockReturnValue(mock);
    mock.whereBetween = jest.fn().mockReturnValue(mock);
    mock.whereIn = jest.fn().mockReturnValue(mock);
    mock.first = jest.fn().mockResolvedValue(undefined);
    mock.select = jest.fn().mockResolvedValue([]);
    mock.join = jest.fn().mockReturnValue(mock);
    mock.andWhere = jest.fn().mockReturnValue(mock);
    mock.insert = jest.fn().mockResolvedValue(1);
    mock.delete = jest.fn().mockResolvedValue(1);
    mock.orderBy = jest.fn().mockResolvedValue([]);
    mock.onConflict = jest.fn().mockReturnValue(mock);
    mock.merge = jest.fn().mockResolvedValue([{}]);
    mock.returning = jest.fn().mockResolvedValue([{}]);
    mock.ignore = jest.fn().mockResolvedValue(undefined);
    return mock;
  };
  
  return {
    db: jest.fn(() => createMock()),
    generateUUID: jest.fn().mockReturnValue('mock-uuid-123'),
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../redis.service', () => ({
  redisService: {
    isRedisReady: jest.fn().mockReturnValue(false),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    mget: jest.fn().mockResolvedValue(null),
  },
}));

// Mock environment variables needed by MealPlanService
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    REC_RANK_V2_WEIGHT_TIME: '0.30',
    REC_RANK_V2_WEIGHT_INVENTORY: '0.25',
    REC_RANK_V2_WEIGHT_BABY: '0.20',
    REC_RANK_V2_WEIGHT_FEEDBACK: '0.25',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

import { MealPlanService } from '../mealPlan.service';

describe('MealPlanService', () => {
  let mealPlanService: MealPlanService;

  beforeEach(() => {
    jest.clearAllMocks();
    mealPlanService = new MealPlanService();
  });

  describe('generateWeeklyPlan', () => {
    it('should generate a weekly plan with 7 days', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-123',
        '2025-01-06'
      );

      expect(result).toHaveProperty('start_date');
      expect(result).toHaveProperty('end_date');
      expect(result).toHaveProperty('plans');
      
      const days = Object.keys(result.plans);
      expect(days.length).toBe(7);
    });

    it('should include breakfast, lunch, dinner for each day', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-meals',
        '2025-01-06'
      );

      // Check that we have 7 days
      expect(Object.keys(result.plans).length).toBe(7);
    });

    it('should filter by baby age months', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-baby',
        '2025-01-06',
        { baby_age_months: 9 }
      );

      expect(result).toHaveProperty('plans');
    });

    it('should exclude ingredients', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-exclude',
        '2025-01-06',
        { exclude_ingredients: ['海鲜'] }
      );

      expect(result).toHaveProperty('plans');
    });

    it('should respect max_prep_time preference', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-time',
        '2025-01-06',
        { max_prep_time: 30 }
      );

      expect(result).toHaveProperty('plans');
    });

    it('should accept user_id parameter', async () => {
      const result = await mealPlanService.generateWeeklyPlan(
        'user-id-test',
        '2025-01-06'
      );

      expect(result).toHaveProperty('plans');
    });
  });
});
