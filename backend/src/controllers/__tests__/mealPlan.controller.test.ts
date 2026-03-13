import { MealPlanController } from '../mealPlan.controller';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MealPlanController', () => {
  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('getSmartRecommendations', () => {
    it('returns 403 when smart recommendation quota is unavailable', async () => {
      const mealPlanService = {
        getSmartRecommendations: jest.fn(),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: false, remaining_quota: 0 }),
        consumeFeatureQuota: jest.fn(),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { meal_type: 'dinner', max_prep_time: 30 },
      };
      const res = createResponse();

      await controller.getSmartRecommendations(req, res as any);

      expect(billingService.getFeatureQuotaStatus).toHaveBeenCalledWith('user-1', 'smart_recommendation');
      expect(mealPlanService.getSmartRecommendations).not.toHaveBeenCalled();
      expect(billingService.consumeFeatureQuota).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 403,
        data: expect.objectContaining({
          feature_code: 'smart_recommendation',
          upgrade_required: true,
          remaining_quota: 0,
        }),
      }));
    });

    it('consumes member quota after successful recommendation generation', async () => {
      const result = {
        meal_type: 'dinner',
        constraints: { max_prep_time: 30 },
        recommendations: {
          dinner: {
            A: { id: 'recipe-a', name: '番茄鱼片', time_estimate: 20 },
            B: { id: 'recipe-b', name: '鸡蛋豆腐', time_estimate: 18 },
          },
        },
      };
      const mealPlanService = {
        getSmartRecommendations: jest.fn().mockResolvedValue(result),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: true, remaining_quota: 30 }),
        consumeFeatureQuota: jest.fn().mockResolvedValue({ allowed: true, remaining_quota: 29 }),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { meal_type: 'dinner', baby_age_months: 14, max_prep_time: 30, exclude_ingredients: ['辣椒'], inventory: ['鸡蛋'] },
      };
      const res = createResponse();

      await controller.getSmartRecommendations(req, res as any);

      expect(mealPlanService.getSmartRecommendations).toHaveBeenCalledWith('user-1', {
        meal_type: 'dinner',
        baby_age_months: 14,
        max_prep_time: 30,
        inventory: ['鸡蛋'],
        exclude_ingredients: ['辣椒'],
      });
      expect(billingService.consumeFeatureQuota).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        featureCode: 'smart_recommendation',
        modelCode: 'smart_recommendation:auto',
        metadata: expect.objectContaining({
          meal_type: 'dinner',
          baby_age_months: 14,
          max_prep_time: 30,
          exclude_ingredient_count: 1,
          inventory_count: 1,
          entry: 'meal_plans.recommendations',
        }),
      }));
      expect(res.json).toHaveBeenCalledWith({
        code: 200,
        message: '生成成功',
        data: {
          ...result,
          quota_status: {
            feature_code: 'smart_recommendation',
            remaining_quota: 29,
          },
        },
      });
    });

    it('does not consume quota when recommendation generation fails', async () => {
      const mealPlanService = {
        getSmartRecommendations: jest.fn().mockRejectedValue(new Error('REC_FAILED')),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: true, remaining_quota: 30 }),
        consumeFeatureQuota: jest.fn(),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { meal_type: 'dinner' },
      };
      const res = createResponse();

      await controller.getSmartRecommendations(req, res as any);

      expect(billingService.consumeFeatureQuota).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '生成智能推荐失败',
        data: null,
      });
    });
  });

  describe('generateFromPrompt', () => {
    it('returns 403 when member quota is unavailable', async () => {
      const mealPlanService = {
        generateFromPrompt: jest.fn(),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: false, remaining_quota: 0 }),
        consumeFeatureQuota: jest.fn(),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { prompt: '这周想吃鱼，少油快手' },
      };
      const res = createResponse();

      await controller.generateFromPrompt(req, res as any);

      expect(billingService.getFeatureQuotaStatus).toHaveBeenCalledWith('user-1', 'weekly_plan_from_prompt');
      expect(mealPlanService.generateFromPrompt).not.toHaveBeenCalled();
      expect(billingService.consumeFeatureQuota).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 403,
        data: expect.objectContaining({
          feature_code: 'weekly_plan_from_prompt',
          upgrade_required: true,
          remaining_quota: 0,
        }),
      }));
    });

    it('consumes member quota after successful generation', async () => {
      const result = {
        start_date: '2026-03-09',
        end_date: '2026-03-15',
        plans: { '2026-03-09': { breakfast: { id: 'recipe-1', name: '鱼粥' } } },
        parsed_constraints: { prefer_ingredients: ['鱼'] },
      };
      const mealPlanService = {
        generateFromPrompt: jest.fn().mockResolvedValue(result),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: true, remaining_quota: 8 }),
        consumeFeatureQuota: jest.fn().mockResolvedValue({ allowed: true, remaining_quota: 7 }),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { prompt: '这周想吃鱼，少油快手', baby_age_months: 14 },
      };
      const res = createResponse();

      await controller.generateFromPrompt(req, res as any);

      expect(mealPlanService.generateFromPrompt).toHaveBeenCalledWith('user-1', '这周想吃鱼，少油快手', 14);
      expect(billingService.consumeFeatureQuota).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        featureCode: 'weekly_plan_from_prompt',
        modelCode: 'meal_plan_prompt:auto',
        metadata: expect.objectContaining({
          prompt_length: 10,
          baby_age_months: 14,
          entry: 'meal_plans.generate-from-prompt',
        }),
      }));
      expect(res.json).toHaveBeenCalledWith({
        code: 200,
        message: '生成成功',
        data: {
          ...result,
          quota_status: {
            feature_code: 'weekly_plan_from_prompt',
            remaining_quota: 7,
          },
        },
      });
    });

    it('does not consume quota when generation fails', async () => {
      const mealPlanService = {
        generateFromPrompt: jest.fn().mockRejectedValue(new Error('AI_FAILED')),
      } as any;
      const billingService = {
        getFeatureQuotaStatus: jest.fn().mockResolvedValue({ available: true, remaining_quota: 8 }),
        consumeFeatureQuota: jest.fn(),
      } as any;
      const controller = new MealPlanController(mealPlanService, billingService);

      const req: any = {
        user: { user_id: 'user-1' },
        body: { prompt: '这周想吃鱼，少油快手' },
      };
      const res = createResponse();

      await controller.generateFromPrompt(req, res as any);

      expect(billingService.consumeFeatureQuota).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '从自然语言生成一周计划失败',
        data: null,
      });
    });
  });
});
