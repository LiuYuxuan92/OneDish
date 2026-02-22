// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealPlansApi, WeeklyPlanResponse, MealPlan, SmartRecommendationParams, RecommendationFeedbackParams } from '../api/mealPlans';

/**
 * 获取一周计划
 * @param params - 可选的日期范围参数
 */
export function useWeeklyPlan(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['mealPlans', 'weekly', params],
    queryFn: () => mealPlansApi.getWeekly(params).then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 24 * 60 * 60 * 1000, // 24h 离线缓存
  });
}

/**
 * 设置餐食计划
 */
export function useSetMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      date: string;
      meal_type: string;
      recipe_id: string;
      servings?: number;
    }) => mealPlansApi.setMealPlan(data).then(res => res.data),
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
    mutationFn: (params?: { start_date?: string; preferences?: any }) =>
      mealPlansApi.generateWeekly(params).then(res => res.data),

    onSuccess: (newData, variables) => {
      // 策略：直接使用返回的新数据更新缓存
      // 这样可以立即显示新数据，无需等待额外的refetch请求

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

      // 使其他相关查询失效（确保数据一致性）
      queryClient.invalidateQueries({
        queryKey: ['mealPlans'],
        refetchType: 'none', // 不立即refetch，使用新数据
      });
    },

    onError: (error: any) => {
      // 对于429错误（速率限制），不要让React Query缓存错误状态
      // 这样用户可以稍后立即重试，而不会被错误状态阻塞
      if (error?.response?.status === 429 || error?.statusCode === 429) {
        console.warn('请求过于频繁，请稍后再试');
        // 重置mutation状态，允许立即重试
        queryClient.resetQueries({ mutationKey: ['generateWeeklyPlan'] });
      }
    },
  });
}

/**
 * 三餐智能推荐 V1（A/B方案）
 */
export function useSmartRecommendations() {
  return useMutation({
    mutationFn: (params?: SmartRecommendationParams) =>
      mealPlansApi.getSmartRecommendations(params).then(res => res.data),
  });
}

export function useSubmitRecommendationFeedback() {
  return useMutation({
    mutationFn: (params: RecommendationFeedbackParams) =>
      mealPlansApi.submitRecommendationFeedback(params).then(res => res.data),
  });
}

export function useRecommendationFeedbackStats(days = 7) {
  return useQuery({
    queryKey: ['mealPlans', 'recommendationFeedbackStats', days],
    queryFn: () => mealPlansApi.getRecommendationFeedbackStats(days).then(res => res.data),
    staleTime: 60 * 1000,
  });
}

/**
 * 标记餐食为已完成（扣减库存）
 */
export function useMarkMealComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => mealPlansApi.markMealComplete(planId).then(res => res.data),
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
    mutationFn: (planId: string) => mealPlansApi.deleteMealPlan(planId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}
