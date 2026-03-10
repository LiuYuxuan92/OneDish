import { useMemo } from 'react';
import { useWeeklyPlan } from '../hooks/useMealPlans';
import { useAllRecipes } from '../hooks/useRecipes';
import { useLatestShoppingList } from '../hooks/useShoppingLists';
import { useRecentFeedingFeedback } from '../hooks/useFeedingFeedback';
import { mapWeeklyPlanToDays } from '../mappers/mealPlanMapper';
import { buildFeedbackLookup } from '../mappers/feedingFeedbackMapper';

export function useWeeklyPlanPageViewModel(babyAgeMonths?: number) {
  const weeklyPlan = useWeeklyPlan();
  const recipes = useAllRecipes();
  const shoppingList = useLatestShoppingList();
  const feedback = useRecentFeedingFeedback({ limit: 50 });

  const data = useMemo(() => {
    const recipesById = Object.fromEntries((recipes.data?.items || []).map(recipe => [recipe.id, recipe]));
    const feedbackByRecipeId = buildFeedbackLookup(feedback.data || []);
    const weeklyData = (weeklyPlan.data as any)?.data || weeklyPlan.data;
    return mapWeeklyPlanToDays(weeklyData || null, {
      recipesById,
      shoppingList: shoppingList.data || null,
      feedbackByRecipeId,
      babyAgeMonths,
    });
  }, [weeklyPlan.data, recipes.data, shoppingList.data, feedback.data, babyAgeMonths]);

  return {
    data,
    isLoading: weeklyPlan.isLoading || recipes.isLoading || shoppingList.isLoading,
  };
}
