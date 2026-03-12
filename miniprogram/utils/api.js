const request = require('./request');

const USER_PREFERENCES_KEY = 'user_preferences';

function splitIngredients(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join(', ');
  }

  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUserPreferences(config = {}) {
  const normalizedBabyAge = Number(config.default_baby_age);
  const normalizedCookingTime = Number(config.cooking_time_limit);

  return {
    default_baby_age: Number.isFinite(normalizedBabyAge) && normalizedBabyAge > 0 ? normalizedBabyAge : null,
    prefer_ingredients: splitIngredients(config.prefer_ingredients),
    exclude_ingredients: splitIngredients(config.exclude_ingredients),
    cooking_time_limit: Number.isFinite(normalizedCookingTime) && normalizedCookingTime > 0 ? normalizedCookingTime : null,
    difficulty_preference: typeof config.difficulty_preference === 'string' ? config.difficulty_preference : 'medium',
  };
}

function cacheUserPreferences(preferences) {
  const normalized = normalizeUserPreferences(preferences || {});
  wx.setStorageSync(USER_PREFERENCES_KEY, normalized);
  return normalized;
}

function getTodayRecommendation() {
  return request({
    url: '/recipes/daily',
    withAuth: true,
  });
}

function getRecipeList(params = {}) {
  return request({
    url: '/recipes',
    data: { page: 1, limit: 20, ...params },
    withAuth: true,
  });
}

function getRecipeDetail(id) {
  return request({
    url: `/recipes/${id}`,
    withAuth: true,
  });
}

async function swapRecommendation(currentId) {
  try {
    const result = await request({
      url: '/recipes/swap',
      method: 'POST',
      data: { current_recipe_id: currentId },
      withAuth: true,
    });

    if (result && result.recipe) {
      return result.recipe;
    }

    return swapRecommendationFallback(currentId);
  } catch (_err) {
    return swapRecommendationFallback(currentId);
  }
}

async function swapRecommendationFallback(currentId) {
  const result = await getRecipeList({ limit: 30 });
  const items = Array.isArray(result?.items) ? result.items : [];
  const pool = items.filter((item) => item.id !== currentId);

  if (!pool.length) return null;

  const next = pool[Math.floor(Math.random() * pool.length)];

  try {
    return await getRecipeDetail(next.id);
  } catch (_err) {
    return next;
  }
}

function getShoppingLists() {
  return request({
    url: '/shopping-lists',
    withAuth: true,
  });
}

function addRecipeToShoppingList({ recipeId, listDate, servings = 2 }) {
  return request({
    url: '/shopping-lists/add-recipe',
    method: 'POST',
    data: {
      recipe_id: recipeId,
      list_date: listDate,
      servings,
    },
    withAuth: true,
  });
}

function addShoppingListItem(listId, payload) {
  return request({
    url: `/shopping-lists/${listId}/items`,
    method: 'POST',
    data: payload,
    withAuth: true,
  });
}

function updateShoppingListItem(listId, payload) {
  return request({
    url: `/shopping-lists/${listId}/items`,
    method: 'PUT',
    data: payload,
    withAuth: true,
  });
}

function removeShoppingListItem(listId, payload) {
  return request({
    url: `/shopping-lists/${listId}/items`,
    method: 'DELETE',
    data: payload,
    withAuth: true,
  });
}

function createShoppingListShareLink(listId) {
  return request({
    url: `/shopping-lists/${listId}/share`,
    method: 'POST',
    withAuth: true,
  });
}

function wechatLogin(code, userInfo, options = {}) {
  return request({
    url: options.upgradeGuest ? '/auth/upgrade-guest/wechat' : '/auth/wechat',
    method: 'POST',
    data: { code, userInfo },
    withAuth: !!options.upgradeGuest,
  });
}

function guestLogin(deviceId) {
  return request({
    url: '/auth/guest',
    method: 'POST',
    data: deviceId ? { device_id: deviceId } : {},
  });
}

function upgradeGuestRegister(payload) {
  return request({
    url: '/auth/upgrade-guest/register',
    method: 'POST',
    data: payload,
    withAuth: true,
  });
}

function upgradeGuestLogin(payload) {
  return request({
    url: '/auth/upgrade-guest/login',
    method: 'POST',
    data: payload,
    withAuth: true,
  });
}

function searchRecipes(keyword, options = {}) {
  return request({
    url: '/search',
    data: {
      keyword,
      inventory_ingredients: Array.isArray(options.inventoryIngredients)
        ? options.inventoryIngredients.join(', ')
        : undefined,
      scenario: options.scenario || undefined,
    },
    withAuth: true,
  });
}

function getFavorites() {
  return request({
    url: '/favorites',
    withAuth: true,
  });
}

function checkFavorite(recipeId) {
  return request({
    url: `/favorites/check/${recipeId}`,
    withAuth: true,
  });
}

function removeFavorite(recipeId) {
  return request({
    url: `/favorites/${recipeId}`,
    method: 'DELETE',
    withAuth: true,
  });
}

function addFavorite(recipeId) {
  return request({
    url: '/favorites',
    method: 'POST',
    data: { recipe_id: recipeId },
    withAuth: true,
  });
}

function generateMealPlanFromPrompt(prompt) {
  return request({
    url: '/meal-plans/generate-from-prompt',
    method: 'POST',
    data: { prompt },
    withAuth: true,
  });
}

function getMealPlans() {
  return request({
    url: '/meal-plans',
    withAuth: true,
  });
}

function generateAIBabyVersion(recipeId, babyAgeMonths, useAI = true) {
  return request({
    url: '/pairing/generate-ai',
    method: 'POST',
    data: {
      recipe_id: recipeId,
      baby_age_months: babyAgeMonths,
      use_ai: useAI,
    },
    withAuth: true,
  });
}

async function getUserPreferences() {
  const result = await request({
    url: '/users/me/preferences',
    withAuth: true,
  });

  return cacheUserPreferences(result && result.preferences ? result.preferences : result);
}

async function updateUserPreferences(config) {
  const normalized = normalizeUserPreferences(config);
  const result = await request({
    url: '/users/me/preferences',
    method: 'PUT',
    data: { preferences: normalized },
    withAuth: true,
  });

  return cacheUserPreferences(result && result.preferences ? result.preferences : normalized);
}

function createFeedingFeedback(payload) {
  return request({
    url: '/feeding-feedbacks',
    method: 'POST',
    data: payload,
    withAuth: true,
  });
}

function getRecentFeedingFeedback(params = {}) {
  return request({
    url: '/feeding-feedbacks/recent',
    data: params,
    withAuth: true,
  });
}

module.exports = {
  addFavorite,
  addRecipeToShoppingList,
  addShoppingListItem,
  cacheUserPreferences,
  checkFavorite,
  createFeedingFeedback,
  createShoppingListShareLink,
  generateAIBabyVersion,
  generateMealPlanFromPrompt,
  getFavorites,
  getMealPlans,
  getRecentFeedingFeedback,
  getRecipeDetail,
  getRecipeList,
  getShoppingLists,
  getTodayRecommendation,
  getUserPreferences,
  guestLogin,
  normalizeUserPreferences,
  removeFavorite,
  removeShoppingListItem,
  searchRecipes,
  swapRecommendation,
  updateShoppingListItem,
  updateUserPreferences,
  upgradeGuestLogin,
  upgradeGuestRegister,
  wechatLogin,
};
