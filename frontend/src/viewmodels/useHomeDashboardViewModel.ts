import { useMemo } from 'react';
import { useWeeklyPlan } from '../hooks/useMealPlans';
import { useLatestShoppingList } from '../hooks/useShoppingLists';
import { useRecentFeedingFeedback } from '../hooks/useFeedingFeedback';
import type { HomeDashboardViewModel } from './uiMigration';

export function useHomeDashboardViewModel(): { data: HomeDashboardViewModel; isLoading: boolean } {
  const weeklyPlan = useWeeklyPlan();
  const shoppingList = useLatestShoppingList();
  const feedback = useRecentFeedingFeedback({ limit: 20 });

  const data = useMemo<HomeDashboardViewModel>(() => {
    const weeklyData = (weeklyPlan.data as any)?.data || weeklyPlan.data;
    const meals = Object.values(weeklyData?.plans || {}).flatMap((day: any) => Object.values(day || {}));
    const plannedCount = meals.length;
    const completedCount = 0;
    const undecidedCount = Math.max(0, 21 - plannedCount);
    const shoppingUncheckedCount = shoppingList.data?.unchecked_items ?? 0;
    const shoppingTotal = shoppingList.data?.total_items ?? 0;
    const shoppingProgress = shoppingTotal > 0 ? 1 - shoppingUncheckedCount / shoppingTotal : 0;
    const retrySuggestedCount = (feedback.data || []).filter((item: any) => ['ok', 'reject'].includes(item.accepted_level)).length;

    return {
      plannedCount,
      completedCount,
      undecidedCount,
      shoppingUncheckedCount,
      shoppingProgress,
      retrySuggestedCount,
    };
  }, [weeklyPlan.data, shoppingList.data, feedback.data]);

  return {
    data,
    isLoading: weeklyPlan.isLoading || shoppingList.isLoading || feedback.isLoading,
  };
}
