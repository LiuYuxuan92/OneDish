const api = require('../../utils/api');
const { openRecipeDetail } = require('../../utils/navigation');
const { buildPendingPlanExecution } = require('../../utils/plan-pending-execution');

const PENDING_PLAN_EXECUTION_KEY = 'pending_plan_execution';
const PENDING_IMPORT_KEY = 'pending_import';
const PENDING_PLAN_SOURCE = 'favorites';

function normalizePendingImportItem(ingredient) {
  return {
    name: ingredient?.name || ingredient,
    quantity: ingredient?.quantity || ingredient?.amount || '',
    unit: ingredient?.unit || '',
    checked: false,
  };
}

function buildFavoritesPendingPlanExecution(recipe) {
  return buildPendingPlanExecution(recipe, { source: PENDING_PLAN_SOURCE });
}

function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const source = recipe.recipe || recipe;
  return {
    ...source,
    favorite_id: recipe.id,
    title: source.name || source.title,
    cover_url: source.image_url || source.cover_url,
    cook_time: source.cook_time || source.total_time || source.prep_time,
  };
}

function adaptListData(items) {
  if (!items || !items.length) return [];
  return items.map((item) => adaptRecipeData(item));
}

Page({
  data: {
    loading: false,
    favorites: [],
    localFavorites: [],
  },

  onShow() {
    this.loadFavorites();
  },

  loadFavorites() {
    const token = wx.getStorageSync('token');

    if (token) {
      this.setData({ loading: true });
      api.getFavorites()
        .then((res) => {
          const adaptedFavorites = adaptListData(res.items || []);
          this.setData({
            favorites: adaptedFavorites,
            loading: false,
          });
        })
        .catch(() => {
          this.loadLocalFavorites();
        });
      return;
    }

    this.loadLocalFavorites();
  },

  loadLocalFavorites() {
    const local = wx.getStorageSync('local_favorites') || [];
    this.setData({
      localFavorites: local,
      loading: false,
    });
  },

  goToRecipe(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.getFavoriteById(id);
    openRecipeDetail(recipe || id);
  },

  goToRecipeList() {
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  getActiveFavorites() {
    return this.data.favorites.length ? this.data.favorites : this.data.localFavorites;
  },

  getFavoriteById(id) {
    return this.getActiveFavorites().find((item) => String(item.id) === String(id));
  },

  buildPendingPlanExecution: buildFavoritesPendingPlanExecution,

  addToShoppingListFallback(recipe) {
    const ingredients = recipe?.ingredients || [];
    if (!ingredients.length) {
      wx.showToast({ title: '当前菜谱暂无食材信息', icon: 'none' });
      return;
    }

    const items = ingredients.map((ingredient) => normalizePendingImportItem(ingredient));

    wx.setStorageSync(PENDING_IMPORT_KEY, items);
    wx.switchTab({ url: '/pages/plan/plan' });
    wx.showToast({ title: '已加入待购清单', icon: 'success' });
  },

  async addToShoppingList(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.getFavoriteById(id);
    if (!recipe) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      this.addToShoppingListFallback(recipe);
      return;
    }

    try {
      await api.addRecipeToShoppingList({ recipeId: recipe.id });
      wx.showToast({ title: '已加入云端清单', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/plan/plan' });
      }, 400);
    } catch (err) {
      console.error('[favorites] add recipe to shopping list failed:', err);
      this.addToShoppingListFallback(recipe);
    }
  },

  addToPlan(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.getFavoriteById(id);
    const payload = this.buildPendingPlanExecution(recipe);
    if (!payload) {
      wx.showToast({ title: '当前暂无可安排的菜谱', icon: 'none' });
      return;
    }

    wx.setStorageSync(PENDING_PLAN_EXECUTION_KEY, payload);
    wx.showToast({ title: '已加入今天晚餐', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/plan/plan' });
    }, 350);
  },

  removeFavorite(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消收藏',
      content: '确定把这道菜从收藏里移除吗？',
      confirmText: '移除',
      cancelText: '保留',
      success: (res) => {
        if (!res.confirm) return;

        const token = wx.getStorageSync('token');
        if (token) {
          api.removeFavorite(id)
            .then(() => {
              const favorites = this.data.favorites.filter((item) => item.id !== id);
              this.setData({ favorites });
              wx.showToast({ title: '已移除收藏', icon: 'success' });
            })
            .catch(() => {
              this.removeLocalFavorite(id);
            });
          return;
        }

        this.removeLocalFavorite(id);
      },
    });
  },

  removeLocalFavorite(id) {
    const localFavorites = this.data.localFavorites.filter((item) => item.id !== id);
    wx.setStorageSync('local_favorites', localFavorites);
    this.setData({ localFavorites });
    wx.showToast({ title: '已移除收藏', icon: 'success' });
  },

  onShareAppMessage() {
    return {
      title: '我的收藏 - 简家厨',
      path: '/pages/favorites/favorites',
    };
  },
});
