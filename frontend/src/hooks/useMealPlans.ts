import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealPlansApi } from '../api/mealPlans';
import type { SmartRecommendationParams, RecommendationFeedbackParams, GenerateWeeklyPlanParams } from '../api/mealPlans';
import { buildMockWeeklyPlan, isWebLocalGuestMode, shouldUseWebMockFallback } from '../mock/webFallback';

/**
 * 获取一周计划
 * @param params - 可选的日期范围参数
 */
export function useWeeklyPlan(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['mealPlans', 'weekly', params],
    queryFn: async () => {
      try {
        const result = await mealPlansApi.getWeekly(params);
        return result || null;
      } catch (error) {
        if (shouldUseWebMockFallback(error)) {
          return {
            code: 200,
            message: 'mock weekly plan for web local dev',
            data: buildMockWeeklyPlan(),
          } as any;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * 设置餐食计划
 */
export function useSetMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      meal_type: string;
      recipe_id: string;
      servings?: number;
    }) => {
      const result = await mealPlansApi.setMealPlan(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}

/**
 * 生成一周智能计划（重构版）
 * 特性：
 * 1. 使用返回的数据直接更新缓存（避免额外的网络请求）
 * 2. 支持精确的日期范围查询
 * 3. 自动使缓存失效确保数据新鲜
 * 4. 429错误不缓存，允许用户快速重试
 */
export function useGenerateWeeklyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: GenerateWeeklyPlanParams) => {
      if (isWebLocalGuestMode()) {
        return {
          code: 200,
          message: 'mock generated weekly plan for web local dev',
          data: buildMockWeeklyPlan(),
        } as any;
      }
      const result = await mealPlansApi.generateWeekly(params);
      return result;
    },

    onSuccess: (newData, variables) => {
      const startDate = variables?.start_date;

      // 更新精确的查询缓存
      queryClient.setQueryData(
        ['mealPlans', 'weekly', { start_date: startDate }],
        newData
      );

      // 同时更新不带参数的查询缓存（兼容性）
      queryClient.setQueryData(
        ['mealPlans', 'weekly', undefined],
        newData
      );

      // 使其他相关查询失效
      queryClient.invalidateQueries({
        queryKey: ['mealPlans'],
        refetchType: 'none',
      });
    },

    onError: (error: unknown) => {
      const err = error as { statusCode?: number; response?: { status?: number } };
      if (err?.statusCode === 429 || err?.response?.status === 429) {
        // 429 错误时不缓存，允许用户重试
      }
    },
  });
}

/**
 * 三餐智能推荐 V1（A/B方案）
 */
export function useSmartRecommendations() {
  return useMutation({
    mutationFn: async (params?: SmartRecommendationParams) => {
      const result = await mealPlansApi.getSmartRecommendations(params);
      return result.data || result;
    },
  });
}

export function useSubmitRecommendationFeedback() {
  return useMutation({
    mutationFn: async (params: RecommendationFeedbackParams) => {
      const result = await mealPlansApi.submitRecommendationFeedback(params);
      return result;
    },
  });
}

export function useRecommendationFeedbackStats(days = 7) {
  return useQuery({
    queryKey: ['mealPlans', 'recommendationFeedbackStats', days],
    queryFn: async () => {
      const result = await mealPlansApi.getRecommendationFeedbackStats(days);
      return result || null;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * 标记餐食为已完成（扣减库存）
 */
export function useMarkMealComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await mealPlansApi.markMealComplete(planId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientInventory'] });
    },
  });
}

/**
 * 删除餐食计划
 */
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await mealPlansApi.deleteMealPlan(planId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}

export function useCreateWeeklyShare() {
  return useMutation({
    mutationFn: async () => {
      const result = await mealPlansApi.createWeeklyShare();
      return result;
    },
  });
}

export function useJoinWeeklyShare() {
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const result = await mealPlansApi.joinWeeklyShare(inviteCode);
      return result;
    },
  });
}

export function useSharedWeeklyPlan(shareId?: string, params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['mealPlans', 'shared', shareId, params],
    queryFn: async () => {
      if (!shareId) return null;
      const result = await mealPlansApi.getSharedWeekly(String(shareId), params);
      return result || null;
    },
    enabled: !!shareId,
    refetchInterval: 20 * 1000,
  });
}

export function useMarkSharedMealComplete(shareId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      if (!shareId) throw new Error('shareId is required');
      const result = await mealPlansApi.markSharedMealComplete(String(shareId), planId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', 'shared', shareId] });
    },
  });
}

export function useRegenerateWeeklyShareInvite(shareId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!shareId) throw new Error('shareId is required');
      const result = await mealPlansApi.regenerateWeeklyShareInvite(String(shareId));
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', 'shared', shareId] });
    },
  });
}

export function useRemoveWeeklyShareMember(shareId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!shareId) throw new Error('shareId is required');
      const result = await mealPlansApi.removeWeeklyShareMember(String(shareId), memberId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans', 'shared', shareId] });
    },
  });
}

/**
 * 自然语言生成一周计划
 */
export function useGenerateFromPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prompt, baby_age_months }: { prompt: string; baby_age_months?: number }) => {
      const result = await mealPlansApi.generateFromPrompt(prompt, baby_age_months);
      return result.data || result;
    },

    onSuccess: (newData) => {
      // 更新相关查询缓存
      queryClient.setQueryData(['mealPlans', 'weekly', undefined], newData);
      queryClient.invalidateQueries({
        queryKey: ['mealPlans'],
        refetchType: 'none',
      });
    },

    onError: (error: unknown) => {
      const err = error as { statusCode?: number; response?: { status?: number } };
      if (err?.statusCode === 429 || err?.response?.status === 429) {
        // 429 错误时不缓存，允许用户重试
      }
    },
  });
}
