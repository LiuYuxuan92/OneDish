import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mealPlansApi } from '../../api/mealPlans';
import { feedingFeedbackApi } from '../../api/feedingFeedback';
import {
  buildMockFeedingFeedback,
  buildMockShoppingList,
  buildMockWeeklyPlan,
  shouldShortCircuitWebMock,
  shouldUseWebMockFallback,
} from '../../mock/webFallback';
import { useHomeRecommendation } from './useHomeRecommendation';
import { mapRecommendationToCardViewModel } from '../../mappers/recipeDisplayMapper';
import { resolveRecipeImageUrl } from '../../utils/media';
import type { RecommendationCardViewModel } from '../../viewmodels/uiMigration';

const mealTypeLabelMap: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const isWeb = Platform.OS === 'web';

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

function buildShoppingFallback() {
  return { items: [buildMockShoppingList()] };
}

async function runHomeQueryWithFallback<T>(query: () => Promise<T>, fallback: () => T): Promise<T> {
  if (isWeb && shouldShortCircuitWebMock()) {
    return fallback();
  }

  try {
    return await query();
  } catch (error) {
    if (isWeb && shouldUseWebMockFallback(error)) {
      return fallback();
    }
    throw error;
  }
}

export function useHomeDashboardViewModel() {
  const recommendation = useHomeRecommendation();
  const todayKey = getTodayDateKey();
  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);
  const weekEnd = endOfWeek(new Date()).toISOString().slice(0, 10);
  const shoppingData = buildShoppingFallback();

  const weeklyQuery = useQuery({
    queryKey: ['home-dashboard', 'weekly-plan', weekStart, weekEnd],
    queryFn: async () =>
      runHomeQueryWithFallback(async () => {
        const res = await mealPlansApi.getWeekly({ start_date: weekStart, end_date: weekEnd });
        return (res as any)?.data ?? res ?? buildMockWeeklyPlan();
      }, buildMockWeeklyPlan),
    retry: isWeb ? 0 : 1,
  });

  const feedingQuery = useQuery({
    queryKey: ['home-dashboard', 'feeding-recent'],
    queryFn: async () =>
      runHomeQueryWithFallback(async () => {
        const res = await feedingFeedbackApi.recent({ limit: 20 });
        return (res as any)?.data ?? res ?? { items: [] };
      }, buildMockFeedingFeedback),
    retry: isWeb ? 0 : 1,
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
    const nextMeal = todayMeals.find((meal) => !meal.done) || todayMeals[0] || null;

    const shoppingLists = shoppingData.items || [];
    const latestShopping = shoppingLists[0];
    const unchecked = latestShopping?.unchecked_items ?? latestShopping?.inventory_summary?.missing_count ?? 0;
    const totalItems = latestShopping?.total_items ?? latestShopping?.inventory_summary?.total_required_items ?? 0;
    const readiness = totalItems > 0 ? Math.max(0, Math.round(((totalItems - unchecked) / totalItems) * 100)) : 0;

    const feedbackItems = feedingQuery.data?.items || [];
    const recentFeedbackCount = feedbackItems.length;
    const unloggedFeedingCount = Math.max(0, cookedCount - recentFeedbackCount);
    const retrySuggestedCount = feedbackItems.filter((item: any) => item?.accepted_level === 'reject').length;

    const recommendationCards = [recommendation.recipe].filter(Boolean).map((recipe: any) => {
      const display = mapRecommendationToCardViewModel(recipe, {
        recommendationReason: recommendation.recommendationReasons?.[0]?.detail || recommendation.recommendationReasons?.[0]?.title || '适合今天安排的一菜两吃候选',
        recommendationTags: (recommendation.recommendationReasons || []).map((item) => item.title).slice(0, 3),
        babyAgeMonths: recommendation.currentStage?.age_min,
      });

      return {
        id: recipe.id,
        title: display.recipe.title,
        recipe,
        display,
        reason: display.recipe.whyItFits || '适合今天安排的一菜两吃候选',
        tags: display.tags,
        image: display.recipe.image || resolveRecipeImageUrl(recipe.id, recipe.image_url),
        isPrimary: true,
      };
    });

    const summaryPrimary = nextMeal
      ? `下一顿先看${nextMeal.mealLabel}`
      : plannedCount > 0
        ? '今天已有安排，先顺着做'
        : '今天还没定，先挑一道共享菜';

    const summarySecondary = nextMeal?.done
      ? `${nextMeal.mealLabel} 已完成`
      : nextMeal
        ? `${nextMeal.mealLabel}${nextMeal.done ? '已完成' : '还可继续补细节'}`
        : undecidedCount > 0
          ? `还有 ${undecidedCount} 餐待决定`
          : '可以直接去搜索补一顿';

    const quickEntries = [
      { key: 'search', label: '找共享菜', hint: '从一菜两吃开始，先把下一顿定下来', target: 'search' as const },
      { key: 'plan', label: '补今天安排', hint: plannedCount > 0 ? '继续完善今天和本周计划' : '先把今天至少定一顿', target: 'plan' as const },
      { key: 'shopping', label: '看采购缺口', hint: unchecked > 0 ? `还有 ${unchecked} 项未处理` : '采购准备度不错，顺手再确认一次', target: 'shopping' as const },
    ];

    const todaySummaryCards = [
      { key: 'planned', label: '已计划', value: plannedCount, tone: 'warm' as const },
      { key: 'cooked', label: '已完成', value: cookedCount, tone: 'soft' as const },
      { key: 'undecided', label: '待决定', value: undecidedCount, tone: 'plain' as const },
    ];

    return {
      header: {
        greeting: '今天吃点什么？',
        subtitle: '先看今天安排，再决定下一顿。',
      },
      todaySummary: {
        primary: summaryPrimary,
        secondary: summarySecondary,
        nextMealLabel: nextMeal?.mealLabel || null,
      },
      dashboard: {
        plannedCount,
        cookedCount,
        undecidedCount,
        meals: todayMeals,
      },
      reminders: [
        unloggedFeedingCount > 0 ? { key: 'feeding', tone: 'warning' as const, title: `还有 ${unloggedFeedingCount} 条喂养待记录`, cta: '去记录' } : null,
        unchecked > 0 ? { key: 'shopping', tone: 'accent' as const, title: `购物准备还有 ${unchecked} 项缺口`, cta: `${readiness}% 已准备` } : null,
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
      quickEntries,
      todaySummaryCards,
      isLoading: recommendation.isLoading || weeklyQuery.isLoading,
      refresh: recommendation.onRefresh,
      recommendation,
      isShoppingRequestShortCircuitedOnHome: true,
    };
  }, [weeklyQuery.data, feedingQuery.data, recommendation, todayKey, shoppingData]);

  return viewModel;
}
