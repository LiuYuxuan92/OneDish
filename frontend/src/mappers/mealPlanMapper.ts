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

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner'];

function getReadiness(recipeId: string | undefined, context: MealPlanAdapterContext): MealReadiness {
  if (!recipeId) return 'unknown';
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
    case 'ready':
      return '食材齐了';
    case 'partial':
      return '还差一点';
    case 'needs-shopping':
      return '需要采购';
    default:
      return '待确认';
  }
}

function getOrderedSlots(daily: Record<string, MealPlan> | undefined): string[] {
  const dynamicSlots = Object.keys(daily || {});
  return Array.from(new Set([...SLOT_ORDER, ...dynamicSlots]));
}

export function mapMealPlanToCardViewModel(meal: MealPlan | null | undefined, slotKey: string, context: MealPlanAdapterContext): PlannedMealCardViewModel {
  if (!meal) {
    return {
      slotKey,
      slotLabel: SLOT_LABELS[slotKey] || slotKey,
      completionStatus: 'empty',
      readiness: 'unknown',
      readinessLabel: '待安排',
    };
  }

  const extendedMeal = meal as MealPlan & {
    prep_time?: number;
    is_completed?: boolean;
    is_baby_suitable?: boolean;
  };
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
    completionStatus: extendedMeal.is_completed ? 'completed' : 'planned',
    acceptance: mapFeedbackAcceptance(feedback),
    isBabyFriendly: extendedMeal.is_baby_suitable ?? (displayRecipe ? displayRecipe.dualType !== 'family-only' : undefined),
    prepMinutes: extendedMeal.prep_time,
    readiness,
    readinessLabel: readinessLabel(readiness),
    adaptation: displayRecipe?.adaptation,
  };
}

export function mapWeeklyPlanToDays(source: WeeklyPlanResponse | null, context: MealPlanAdapterContext): WeeklyPlanDayViewModel[] {
  if (!source?.plans) return [];

  return Object.entries(source.plans)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, daily]) => ({
    date,
    meals: getOrderedSlots(daily).map(slotKey => mapMealPlanToCardViewModel(daily?.[slotKey] || null, slotKey, context)),
  }));
}
