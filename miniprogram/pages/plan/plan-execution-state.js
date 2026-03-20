const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'];

const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

function normalizeWeeklyPlanEntry(entry, date, mealType) {
  if (!entry) return null;

  const hasNestedRecipe = entry.recipe && typeof entry.recipe === 'object';
  const recipe = hasNestedRecipe ? entry.recipe : entry;
  const title = recipe.title || recipe.name || entry.title || entry.name || '';
  const recipeId = recipe.recipeId || recipe.recipe_id || recipe.id || entry.recipeId || entry.recipe_id || entry.id || '';
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : Array.isArray(entry.ingredients)
      ? entry.ingredients
      : [];

  return {
    date,
    mealType,
    mealLabel: MEAL_LABELS[mealType] || mealType,
    title,
    recipeId,
    recipe,
    ingredients,
    done: entry.done === undefined ? false : entry.done,
    source: entry.source || 'generated',
  };
}

function buildWeeklyPlanStateFromResult(result) {
  const plans = result && result.plans && typeof result.plans === 'object' ? result.plans : {};

  return Object.keys(plans).reduce((weeklyState, date) => {
    const dayPlan = plans[date] || {};

    weeklyState[date] = MEAL_ORDER.reduce((dayState, mealType) => {
      dayState[mealType] = normalizeWeeklyPlanEntry(dayPlan[mealType], date, mealType);
      return dayState;
    }, {});

    return weeklyState;
  }, {});
}

function deriveTodayExecutionFromWeeklyState(state, dateKey) {
  const dayState = state && state[dateKey] ? state[dateKey] : {};

  return MEAL_ORDER.map((mealType) => dayState[mealType]).filter(Boolean);
}

module.exports = {
  buildWeeklyPlanStateFromResult,
  normalizeWeeklyPlanEntry,
  deriveTodayExecutionFromWeeklyState,
};
