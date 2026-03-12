const RECIPE_DETAIL_PENDING_KEY = 'pending_recipe_detail_id';
const RECIPE_DETAIL_PENDING_PAYLOAD_KEY = 'pending_recipe_detail_payload';
const RECIPE_TAB_PATH = '/pages/recipe/recipe';

function openRecipeDetail(recipeOrId) {
  if (!recipeOrId) return;

  if (typeof recipeOrId === 'object') {
    const recipeId = recipeOrId.id || '';
    if (recipeId) {
      wx.setStorageSync(RECIPE_DETAIL_PENDING_KEY, recipeId);
    } else {
      wx.removeStorageSync(RECIPE_DETAIL_PENDING_KEY);
    }
    wx.setStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY, recipeOrId);
  } else {
    wx.setStorageSync(RECIPE_DETAIL_PENDING_KEY, recipeOrId);
    wx.removeStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY);
  }

  wx.switchTab({
    url: RECIPE_TAB_PATH,
  });
}

module.exports = {
  RECIPE_DETAIL_PENDING_KEY,
  RECIPE_DETAIL_PENDING_PAYLOAD_KEY,
  RECIPE_TAB_PATH,
  openRecipeDetail,
};
