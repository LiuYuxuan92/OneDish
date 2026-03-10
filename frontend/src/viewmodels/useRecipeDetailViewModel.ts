import { useMemo } from 'react';
import { useRecipeDetail } from '../hooks/useRecipes';
import { useAIBabyVersion } from '../hooks/useAIBabyVersion';
import { useTimeline } from '../hooks/useTimeline';
import { useRecentFeedingFeedback } from '../hooks/useFeedingFeedback';
import { useWeeklyPlan } from '../hooks/useMealPlans';
import { useLatestShoppingList } from '../hooks/useShoppingLists';
import { mapRecipeToDisplayModel, mapFeedbackAcceptance } from '../mappers/recipeDisplayMapper';
import type { RecipeDetailViewModel } from './uiMigration';

export function useRecipeDetailViewModel(recipeId: string, babyAgeMonths?: number, timelineEnabled = false): {
  data: RecipeDetailViewModel;
  isLoading: boolean;
  aiActions: ReturnType<typeof useAIBabyVersion>;
} {
  const recipeQuery = useRecipeDetail(recipeId);
  const aiActions = useAIBabyVersion();
  const timelineQuery = useTimeline(recipeId, babyAgeMonths || 0, timelineEnabled);
  const feedbackQuery = useRecentFeedingFeedback({ recipe_id: recipeId, limit: 1 });
  const weeklyPlanQuery = useWeeklyPlan();
  const shoppingListQuery = useLatestShoppingList();

  const data = useMemo<RecipeDetailViewModel>(() => {
    const recipe = recipeQuery.data;
    const weeklyData = (weeklyPlanQuery.data as any)?.data || weeklyPlanQuery.data;
    const inPlan = Object.values(weeklyData?.plans || {}).some((day: any) => Object.values(day || {}).some((meal: any) => meal.recipe_id === recipeId));
    const onShoppingList = Object.values(shoppingListQuery.data?.items || {}).flat().some(item => item.source_recipe_id === recipeId || item.recipes?.includes(recipeId));
    const latestFeedback = feedbackQuery.data?.[0];

    return {
      recipe: recipe ? mapRecipeToDisplayModel(recipe, {
        babyAgeMonths,
        inPlan,
        onShoppingList,
        latestFeedback,
        aiBabyVersion: aiActions.lastResult,
        timeline: timelineQuery.data,
      }) : undefined,
      adultVersion: recipe?.adult_version,
      babyVersion: recipe?.baby_version,
      aiBabyVersion: aiActions.lastResult,
      timeline: timelineQuery.data,
      inPlan,
      onShoppingList,
      latestFeedback: mapFeedbackAcceptance(latestFeedback),
    };
  }, [recipeQuery.data, weeklyPlanQuery.data, shoppingListQuery.data, feedbackQuery.data, aiActions.lastResult, timelineQuery.data, babyAgeMonths, recipeId]);

  return {
    data,
    isLoading: recipeQuery.isLoading || feedbackQuery.isLoading,
    aiActions,
  };
}
