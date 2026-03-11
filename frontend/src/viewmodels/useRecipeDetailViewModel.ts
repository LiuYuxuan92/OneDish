import { useMemo } from 'react';
import { useRecipeDetail } from '../hooks/useRecipes';
import { useAIBabyVersion } from '../hooks/useAIBabyVersion';
import { useTimeline } from '../hooks/useTimeline';
import { useRecentFeedingFeedback } from '../hooks/useFeedingFeedback';
import { useWeeklyPlan } from '../hooks/useMealPlans';
import { useLatestShoppingList } from '../hooks/useShoppingLists';
import { mapRecipeToDisplayModel, mapFeedbackAcceptance } from '../mappers/recipeDisplayMapper';
import { mapRecipeDetailPage, parseRecipeVersion } from '../mappers/recipeDetailMapper';
import type { RecipeDetailViewModel } from './uiMigration';

export function useRecipeDetailViewModel(recipeId: string, options: {
  babyAgeMonths?: number;
  timelineEnabled?: boolean;
  activeTab?: 'adult' | 'baby' | 'timeline';
  babyVersionOverride?: unknown;
} = {}): {
  data: RecipeDetailViewModel;
  isLoading: boolean;
  isTimelineLoading: boolean;
  error: unknown;
  aiActions: ReturnType<typeof useAIBabyVersion>;
} {
  const {
    babyAgeMonths,
    timelineEnabled = false,
    activeTab = 'adult',
    babyVersionOverride,
  } = options;
  const recipeQuery = useRecipeDetail(recipeId);
  const aiActions = useAIBabyVersion();
  const timelineQuery = useTimeline(recipeId, babyAgeMonths || 0, timelineEnabled);
  const feedbackQuery = useRecentFeedingFeedback({ recipe_id: recipeId, limit: 3 });
  const weeklyPlanQuery = useWeeklyPlan();
  const shoppingListQuery = useLatestShoppingList();

  const data = useMemo<RecipeDetailViewModel>(() => {
    const recipe = recipeQuery.data;
    const weeklyData = (weeklyPlanQuery.data as any)?.data || weeklyPlanQuery.data;
    const inPlan = Object.values(weeklyData?.plans || {}).some((day: any) => Object.values(day || {}).some((meal: any) => meal.recipe_id === recipeId));
    const onShoppingList = Object.values(shoppingListQuery.data?.items || {}).flat().some(item => item.source_recipe_id === recipeId || item.recipes?.includes(recipeId));
    const latestFeedback = feedbackQuery.data?.[0];

    return {
      sourceRecipe: recipe,
      recipe: recipe ? mapRecipeToDisplayModel(recipe, {
        babyAgeMonths,
        inPlan,
        onShoppingList,
        latestFeedback,
        aiBabyVersion: aiActions.lastResult,
        timeline: timelineQuery.data,
      }) : undefined,
      adultVersion: parseRecipeVersion<RecipeDetailViewModel['adultVersion']>(recipe?.adult_version),
      babyVersion: parseRecipeVersion<RecipeDetailViewModel['babyVersion']>((babyVersionOverride as RecipeDetailViewModel['babyVersion'] | string | null | undefined) ?? recipe?.baby_version),
      aiBabyVersion: aiActions.lastResult,
      timeline: timelineQuery.data,
      inPlan,
      onShoppingList,
      latestFeedback: mapFeedbackAcceptance(latestFeedback),
      page: recipe ? mapRecipeDetailPage({
        recipe,
        babyAgeMonths,
        activeTab,
        babyVersion: babyVersionOverride,
        feedbacks: feedbackQuery.data || [],
        timeline: timelineQuery.data,
        aiBabyVersion: aiActions.lastResult,
        inPlan,
        onShoppingList,
      }) : undefined,
    };
  }, [recipeQuery.data, weeklyPlanQuery.data, shoppingListQuery.data, feedbackQuery.data, aiActions.lastResult, timelineQuery.data, babyAgeMonths, recipeId, activeTab, babyVersionOverride]);

  return {
    data,
    isLoading: recipeQuery.isLoading || feedbackQuery.isLoading,
    isTimelineLoading: timelineQuery.isLoading,
    error: recipeQuery.error,
    aiActions,
  };
}
