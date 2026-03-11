import type { MealPlan, WeeklyPlanResponse } from '../api/mealPlans';
import type { Recipe, RecipeSummary } from '../types';
import type { PlannedMealCardViewModel, WeeklyPlanDayViewModel, MealPlanAdapterContext, MealReadiness } from '../viewmodels/uiMigration';
import { mapRecipeToDisplayModel, mapFeedbackAcceptance } from './recipeDisplayMapper';

const SLOT_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

function getReadiness(recipeId: string, context: MealPlanAdapterContext): MealReadiness {
  const shoppingList = context.shoppingList;
  if (!shoppingList) return 'unknown';
  const items = Object.values(shoppingList.items || {}).flat();
  const linked = items.filter(item => item.source_recipe_id === recipeId || item.recipes?.includes(recipeId));
  if (!linked.length) return 'ready';
  const unchecked = linked.filter(item => !item.checked).length;
  if (unchecked === 0) return 'ready';
  if (unchecked < linked.length) return 'partial';
  return 'needs-shopping';
}

function readinessLabel(readiness: MealReadiness): string {
  switch (readiness) {
    case 'ready': return '食材齐了';
    case 'partial': return '还差一点';
    case 'needs-shopping': return '需要采购';
    default: return '待确认';
  }
}

export function mapMealPlanToCardViewModel(meal: MealPlan, slotKey: string, context: MealPlanAdapterContext): PlannedMealCardViewModel {
  const recipe = context.recipesById?.[meal.recipe_id] as Recipe | RecipeSummary | undefined;
  const readiness = getReadiness(meal.recipe_id, context);
  const feedback = context.feedbackByRecipeId?.[meal.recipe_id];
  const displayRecipe = recipe ? mapRecipeToDisplayModel(recipe, {
    babyAgeMonths: context.babyAgeMonths,
    inPlan: true,
    onShoppingList: readiness !== 'unknown' && readiness !== 'ready',
    latestFeedback: feedback,
    shoppingReadiness: readiness,
  }) : undefined;

  return {
    planId: meal.id,
    slotKey,
    slotLabel: SLOT_LABELS[slotKey] || slotKey,
    recipe: displayRecipe,
    completionStatus: 'planned',
    acceptance: mapFeedbackAcceptance(feedback),
    readiness,
    readinessLabel: readinessLabel(readiness),
    adaptation: displayRecipe?.adaptation,
  };
}

export function mapWeeklyPlanToDays(source: WeeklyPlanResponse | null, context: MealPlanAdapterContext): WeeklyPlanDayViewModel[] {
  if (!source?.plans) return [];
  return Object.entries(source.plans).map(([date, daily]) => ({
    date,
    meals: Object.entries(daily || {}).map(([slotKey, meal]) => mapMealPlanToCardViewModel(meal, slotKey, context)),
  }));
}
