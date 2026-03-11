import { useMemo } from 'react';
import { useWeeklyPlan } from '../hooks/useMealPlans';
import { useAllRecipes } from '../hooks/useRecipes';
import { useLatestShoppingList } from '../hooks/useShoppingLists';
import { useRecentFeedingFeedback } from '../hooks/useFeedingFeedback';
import { mapWeeklyPlanToDays } from '../mappers/mealPlanMapper';
import { buildFeedbackLookup } from '../mappers/feedingFeedbackMapper';
import { mapShoppingListToSummary } from '../mappers/shoppingListMapper';
import type { WeeklyPlanPageViewModel } from './uiMigration';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function useWeeklyPlanPageViewModel(babyAgeMonths?: number): { data: WeeklyPlanPageViewModel; isLoading: boolean } {
  const weeklyPlan = useWeeklyPlan();
  const recipes = useAllRecipes();
  const shoppingList = useLatestShoppingList();
  const feedback = useRecentFeedingFeedback({ limit: 50 });

  const data = useMemo<WeeklyPlanPageViewModel>(() => {
    const recipesById = Object.fromEntries((recipes.data?.items || []).map(recipe => [recipe.id, recipe]));
    const feedbackByRecipeId = buildFeedbackLookup(feedback.data || []);
    const weeklyData = (weeklyPlan.data as { data?: unknown } | null)?.data ?? weeklyPlan.data;
    const days = mapWeeklyPlanToDays((weeklyData as Parameters<typeof mapWeeklyPlanToDays>[0]) || null, {
      recipesById,
      shoppingList: shoppingList.data || null,
      feedbackByRecipeId,
      babyAgeMonths,
    });
    const today = days.find(day => day.date === getTodayKey());
    const summary = days.reduce<WeeklyPlanPageViewModel['summary']>((acc, day) => {
      const plannedMeals = day.meals.filter(meal => meal.completionStatus !== 'empty');
      acc.totalMeals += plannedMeals.length;
      acc.completedMeals += plannedMeals.filter(meal => meal.completionStatus === 'completed').length;
      acc.babyFriendlyMeals += plannedMeals.filter(meal => meal.isBabyFriendly).length;
      acc.totalPrepTime += plannedMeals.reduce((sum, meal) => sum + (meal.prepMinutes || 0), 0);
      if (day.date === getTodayKey()) {
        acc.todayCount = plannedMeals.length;
      }
      return acc;
    }, {
      totalMeals: 0,
      completedMeals: 0,
      babyFriendlyMeals: 0,
      totalPrepTime: 0,
      todayCount: 0,
      completionPercent: 0,
    });
    summary.completionPercent = summary.totalMeals > 0 ? Math.round((summary.completedMeals / summary.totalMeals) * 100) : 0;

    return {
      days,
      today,
      summary,
      shoppingSummary: mapShoppingListToSummary(shoppingList.data || null),
      hasPlans: days.some(day => day.meals.some(meal => meal.completionStatus !== 'empty')),
    };
  }, [weeklyPlan.data, recipes.data, shoppingList.data, feedback.data, babyAgeMonths]);

  return {
    data,
    isLoading: weeklyPlan.isLoading || recipes.isLoading || shoppingList.isLoading || feedback.isLoading,
  };
}
