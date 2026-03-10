import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mealPlansApi } from '../../api/mealPlans';
import { shoppingListsApi } from '../../api/shoppingLists';
import { feedingFeedbackApi } from '../../api/feedingFeedback';
import { useHomeRecommendation } from './useHomeRecommendation';

const mealTypeLabelMap: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function useHomeDashboardViewModel() {
  const recommendation = useHomeRecommendation();
  const todayKey = getTodayDateKey();
  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);
  const weekEnd = endOfWeek(new Date()).toISOString().slice(0, 10);

  const weeklyQuery = useQuery({
    queryKey: ['home-dashboard', 'weekly-plan', weekStart, weekEnd],
    queryFn: async () => {
      const res = await mealPlansApi.getWeekly({ start_date: weekStart, end_date: weekEnd });
      return (res as any)?.data ?? res;
    },
  });

  const shoppingQuery = useQuery({
    queryKey: ['home-dashboard', 'shopping-lists', weekStart, weekEnd],
    queryFn: async () => {
      const res = await shoppingListsApi.getAll({ start_date: weekStart, end_date: weekEnd });
      return (res as any)?.data ?? res;
    },
  });

  const feedingQuery = useQuery({
    queryKey: ['home-dashboard', 'feeding-recent'],
    queryFn: async () => {
      const res = await feedingFeedbackApi.recent({ limit: 20 });
      return (res as any)?.data ?? res;
    },
  });

  const viewModel = useMemo(() => {
    const plansByDate = weeklyQuery.data?.plans || {};
    const todayPlans = plansByDate[todayKey] || {};
    const todayMeals = Object.entries(todayPlans).map(([mealType, plan]: [string, any]) => ({
      id: plan?.id || `${todayKey}-${mealType}`,
      mealType,
      mealLabel: mealTypeLabelMap[mealType] || mealType,
      recipeId: plan?.recipe_id,
      done: !!plan?.completed_at,
    }));

    const plannedCount = todayMeals.length;
    const cookedCount = todayMeals.filter((meal) => meal.done).length;
    const undecidedCount = Math.max(0, 3 - plannedCount);

    const shoppingLists = shoppingQuery.data?.items || [];
    const latestShopping = shoppingLists[0];
    const unchecked = latestShopping?.unchecked_items ?? latestShopping?.inventory_summary?.missing_count ?? 0;
    const totalItems = latestShopping?.total_items ?? latestShopping?.inventory_summary?.total_required_items ?? 0;
    const readiness = totalItems > 0 ? Math.max(0, Math.round(((totalItems - unchecked) / totalItems) * 100)) : 0;

    const feedbackItems = feedingQuery.data?.items || [];
    const recentFeedbackCount = feedbackItems.length;
    const unloggedFeedingCount = Math.max(0, cookedCount - recentFeedbackCount);
    const retrySuggestedCount = feedbackItems.filter((item: any) => item?.accepted_level === 'reject').length;

    const recommendationCards = [recommendation.recipe].filter(Boolean).map((recipe: any) => ({
      id: recipe.id,
      title: recipe.name,
      recipe,
      reason: recommendation.recommendationReasons?.[0]?.detail || recommendation.recommendationReasons?.[0]?.title || '适合今天安排的一菜两吃候选',
      tags: (recommendation.recommendationReasons || []).map((item) => item.title).slice(0, 3),
      isPrimary: true,
    }));

    return {
      header: {
        greeting: '今天吃点什么？',
        subtitle: '把推荐、计划、购物和喂养线索收拢到一屏。',
      },
      dashboard: {
        plannedCount,
        cookedCount,
        undecidedCount,
        meals: todayMeals,
      },
      reminders: [
        unloggedFeedingCount > 0 ? { key: 'feeding', tone: 'warning' as const, title: `还有 ${unloggedFeedingCount} 条喂养待记录`, cta: '去记录' } : null,
        unchecked > 0 ? { key: 'shopping', tone: 'accent' as const, title: `购物清单还有 ${unchecked} 项未处理`, cta: `${readiness}% 已准备` } : null,
        retrySuggestedCount > 0 ? { key: 'retry', tone: 'success' as const, title: `${retrySuggestedCount} 道菜建议后续重试`, cta: '查看线索' } : null,
      ].filter(Boolean),
      quickFilters: [
        { key: 'dual', label: '一菜两吃' },
        { key: 'quick', label: '快手晚餐' },
        { key: 'baby', label: '宝宝可吃' },
        { key: 'adapt', label: '易改造' },
      ],
      recommendationCards,
      shoppingSummary: {
        unchecked,
        totalItems,
        readiness,
      },
      isLoading: recommendation.isLoading || weeklyQuery.isLoading,
      refresh: recommendation.onRefresh,
      recommendation,
    };
  }, [weeklyQuery.data, shoppingQuery.data, feedingQuery.data, recommendation, todayKey]);

  return viewModel;
}
