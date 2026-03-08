const request = require('./request');

function getTodayRecommendation() {
  return request({ url: '/recipes/daily' });
}

function getRecipeList(params = {}) {
  return request({ url: '/recipes', data: { page: 1, limit: 20, ...params } });
}

function getRecipeDetail(id) {
  return request({ url: `/recipes/${id}` });
}

// 智能换菜 API - 使用后端评分推荐
async function swapRecommendation(currentId) {
  try {
    const result = await request({
      url: '/recipes/swap',
      method: 'POST',
      data: { current_recipe_id: currentId },
      withAuth: true  // 尝试认证以获取个性化推荐
    });

    if (result && result.recipe) {
      return result.recipe;
    }

    // 如果API失败，fallback到随机逻辑
    console.warn('[api] swap API fallback to random', result);
    return swapRecommendationFallback(currentId);
  } catch (err) {
    console.error('[api] swapRecommendation error:', err);
    // Fallback to random
    return swapRecommendationFallback(currentId);
  }
}

// 随机换菜 fallback
async function swapRecommendationFallback(currentId) {
  const result = await getRecipeList({ limit: 30 });
  const items = result.items || [];
  const pool = items.filter(item => item.id !== currentId);
  if (!pool.length) return null;
  const next = pool[Math.floor(Math.random() * pool.length)];
  try {
    return await getRecipeDetail(next.id);
  } catch (_e) {
    return next;
  }
}

function getShoppingLists() {
  return request({ url: '/shopping-lists', withAuth: true });
}

function wechatLogin(code, userInfo) {
  return request({
    url: '/auth/wechat',
    method: 'POST',
    data: { code, userInfo }
  });
}

function guestLogin(deviceId) {
  return request({
    url: '/auth/guest',
    method: 'POST',
    data: deviceId ? { device_id: deviceId } : {}
  });
}

// 搜索菜谱
function searchRecipes(keyword) {
  return request({ url: '/recipes', data: { keyword } });
}

// 获取收藏列表
function getFavorites() {
  return request({ url: '/favorites', withAuth: true });
}

// 取消收藏
function removeFavorite(recipeId) {
  return request({
    url: `/favorites/${recipeId}`,
    method: 'DELETE',
    withAuth: true
  });
}

// 添加收藏
function addFavorite(recipeId) {
  return request({
    url: '/favorites',
    method: 'POST',
    data: { recipe_id: recipeId },
    withAuth: true
  });
}

// 从自然语言提示生成周计划
function generateMealPlanFromPrompt(prompt) {
  return request({
    url: '/meal-plans/generate-from-prompt',
    method: 'POST',
    data: { prompt },
    withAuth: true
  });
}

// 获取周计划列表
function getMealPlans() {
  return request({
    url: '/meal-plans',
    withAuth: true
  });
}

// 生成 AI 宝宝版本
function generateAIBabyVersion(recipeId, babyAgeMonths, useAI = true) {
  return request({
    url: '/pairing/generate-ai',
    method: 'POST',
    data: {
      recipe_id: recipeId,
      baby_age_months: babyAgeMonths,
      use_ai: useAI
    },
    withAuth: true
  });
}

function normalizeUserPreferences(config = {}) {
  return {
    default_baby_age: Number(config.default_baby_age) || 12,
    prefer_ingredients: typeof config.prefer_ingredients === 'string' ? config.prefer_ingredients : '',
    exclude_ingredients: typeof config.exclude_ingredients === 'string' ? config.exclude_ingredients : '',
    cooking_time_limit: Number(config.cooking_time_limit) || 30,
    difficulty_preference: typeof config.difficulty_preference === 'string' ? config.difficulty_preference : 'medium'
  };
}

// 获取当前用户偏好配置（后端 users.preferences）
async function getUserPreferences() {
  const result = await request({
    url: '/users/me/preferences',
    withAuth: true
  });

  return normalizeUserPreferences(result && result.preferences ? result.preferences : result);
}

// 更新当前用户偏好配置（后端 users.preferences）
async function updateUserPreferences(config) {
  const normalized = normalizeUserPreferences(config);
  const result = await request({
    url: '/users/me/preferences',
    method: 'PUT',
    data: { preferences: normalized },
    withAuth: true
  });

  return normalizeUserPreferences(result && result.preferences ? result.preferences : normalized);
}

module.exports = {
  getTodayRecommendation,
  getRecipeList,
  getRecipeDetail,
  swapRecommendation,
  getShoppingLists,
  wechatLogin,
  guestLogin,
  searchRecipes,
  getFavorites,
  removeFavorite,
  addFavorite,
  generateMealPlanFromPrompt,
  getMealPlans,
  generateAIBabyVersion,
  getUserPreferences,
  updateUserPreferences
};
