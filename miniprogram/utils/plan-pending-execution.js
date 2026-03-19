const DEFAULT_PLAN_MEAL = {
  mealType: 'dinner',
  mealLabel: '晚餐',
  label: '今天晚餐',
};

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPendingPlanExecution(recipe, options = {}) {
  if (!recipe?.id) return null;

  return {
    source: options.source || 'home_recommendation',
    slot: {
      date: formatDateKey(options.date || new Date()),
      mealType: DEFAULT_PLAN_MEAL.mealType,
      mealLabel: DEFAULT_PLAN_MEAL.mealLabel,
      label: DEFAULT_PLAN_MEAL.label,
    },
    recipe: {
      id: recipe.id,
      title: recipe.title || recipe.name || '',
      cookTime: recipe.cook_time || recipe.total_time || recipe.prep_time || 0,
      coverUrl: recipe.cover_url || '',
      description: recipe.description || '',
      difficulty: recipe.difficulty || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    },
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_PLAN_MEAL,
  formatDateKey,
  buildPendingPlanExecution,
};
