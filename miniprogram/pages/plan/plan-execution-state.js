const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const TODAY_SLOT_ORDER = ['breakfast', 'lunch', 'dinner'];

function getDefaultDateKey() {
  const current = new Date();
  const month = `${current.getMonth() + 1}`.padStart(2, '0');
  const day = `${current.getDate()}`.padStart(2, '0');
  return `${current.getFullYear()}-${month}-${day}`;
}

function normalizeIngredientNames(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item.trim();
      return String(item.name || item.item_name || '').trim();
    })
    .filter(Boolean);
}

function normalizeExecutionEntry(entry = {}, dateKey = getDefaultDateKey()) {
  const slot = entry.slot || entry.mealType || '';
  const recipe = entry.recipe && typeof entry.recipe === 'object'
    ? { ...entry.recipe }
    : null;
  const recipeId = entry.recipeId || (recipe && (recipe.id || recipe.recipe_id)) || '';

  if (recipe && recipeId) {
    if (!recipe.id) recipe.id = recipeId;
    if (!recipe.recipe_id) recipe.recipe_id = recipeId;
  }

  const ingredients = normalizeIngredientNames(entry.ingredients || (recipe && recipe.ingredients));
  const title = entry.title || (recipe && (recipe.name || recipe.title)) || '待安排';

  if (recipe && title) {
    if (!recipe.name) recipe.name = title;
    if (!recipe.title) recipe.title = title;
    if (!Array.isArray(recipe.ingredients) && ingredients.length) recipe.ingredients = ingredients.slice();
  }

  return {
    date: entry.date || dateKey,
    slot,
    slotLabel: entry.slotLabel || MEAL_LABELS[slot] || slot,
    title,
    recipeId,
    recipe,
    ingredients,
    done: Boolean(entry.done),
    source: entry.source || (recipeId || recipe ? 'generated' : 'empty'),
  };
}

function shouldReplaceEntryWithSeed(currentEntry, seedEntry) {
  const current = normalizeExecutionEntry(currentEntry);
  const seed = normalizeExecutionEntry(seedEntry, current.date);

  if (!seed.recipeId && seed.title === '待安排' && !seed.ingredients.length) return false;
  if (current.done) return false;
  if (current.source !== 'generated' && current.source !== 'empty') return false;
  if (current.recipeId && current.recipeId === seed.recipeId && current.title === seed.title) return false;
  return true;
}

function mergeExecutionEntry(currentEntry, seedEntry, dateKey = getDefaultDateKey()) {
  if (!shouldReplaceEntryWithSeed(currentEntry, seedEntry)) {
    return normalizeExecutionEntry(currentEntry, dateKey);
  }

  const current = normalizeExecutionEntry(currentEntry, dateKey);
  const seed = normalizeExecutionEntry(seedEntry, dateKey);
  return {
    ...seed,
    done: current.done,
  };
}

function buildExecutionSeedFromPlan(result, dateKey = getDefaultDateKey()) {
  const plans = (result && result.plans) || {};
  const dayPlan = plans[dateKey] || {};

  return TODAY_SLOT_ORDER.map((slot) => {
    const recipe = dayPlan[slot] || null;
    const recipeId = recipe && (recipe.id || recipe.recipe_id) || '';
    const recipeName = recipe && (recipe.name || recipe.title) || '';

    return {
      date: dateKey,
      slot,
      slotLabel: MEAL_LABELS[slot] || slot,
      title: recipeName || '待安排',
      recipeId,
      recipe,
      ingredients: normalizeIngredientNames(recipe && recipe.ingredients),
      done: false,
      source: recipeName ? 'generated' : 'empty',
    };
  });
}

function buildTodayExecutionState(storedState, seedEntries, dateKey = getDefaultDateKey()) {
  const storedEntries = storedState && Array.isArray(storedState[dateKey]) && storedState[dateKey].length
    ? storedState[dateKey]
    : [];
  const normalizedMap = {};

  storedEntries.forEach((entry) => {
    const normalized = normalizeExecutionEntry(entry, dateKey);
    if (normalized.slot) normalizedMap[normalized.slot] = normalized;
  });

  return TODAY_SLOT_ORDER.map((slot) => {
    const currentEntry = normalizedMap[slot] || { slot };
    const seedEntry = Array.isArray(seedEntries)
      ? seedEntries.find((item) => item && (item.slot || item.mealType) === slot)
      : null;

    if (!storedEntries.length) {
      return normalizeExecutionEntry(seedEntry || currentEntry, dateKey);
    }

    if (seedEntry) {
      return mergeExecutionEntry(currentEntry, seedEntry, dateKey);
    }

    return normalizeExecutionEntry(currentEntry, dateKey);
  });
}

function countExecutionDone(entries = []) {
  return entries.filter((entry) => entry && entry.done).length;
}

module.exports = {
  TODAY_SLOT_ORDER,
  buildExecutionSeedFromPlan,
  buildTodayExecutionState,
  countExecutionDone,
  mergeExecutionEntry,
  normalizeExecutionEntry,
  shouldReplaceEntryWithSeed,
};
