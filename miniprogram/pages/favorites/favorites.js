const api = require('../../utils/api');
const { openRecipeDetail } = require('../../utils/navigation');

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
    openRecipeDetail(id);
  },

  goToRecipeList() {
    wx.switchTab({ url: '/pages/recipe/recipe' });
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
