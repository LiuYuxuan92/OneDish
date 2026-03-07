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
    
    if (result && result.code === 200 && result.data && result.data.recipe) {
      return result.data.recipe;
    }
    
    // 如果API失败，fallback到随机逻辑
    console.warn('[api] swap API fallback to random');
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

function guestLogin() {
  return request({
    url: '/auth/guest',
    method: 'POST'
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

// 获取用户 AI 配置
function getAIConfig() {
  return request({
    url: '/ai-configs',
    withAuth: true
  });
}

// 更新用户 AI 配置
function updateAIConfig(config) {
  return request({
    url: '/ai-configs',
    method: 'PUT',
    data: config,
    withAuth: true
  });
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
  getAIConfig,
  updateAIConfig
};
