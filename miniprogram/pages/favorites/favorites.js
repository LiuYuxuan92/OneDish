const api = require('../../utils/api');

// 后端数据适配器
function adaptRecipeData(recipe) {
  if (!recipe) return null;
  return {
    ...recipe,
    title: recipe.name || recipe.title,
    cover_url: recipe.image_url || recipe.cover_url,
    cook_time: recipe.cook_time || recipe.total_time,
  };
}

function adaptListData(items) {
  if (!items || !items.length) return [];
  return items.map(item => adaptRecipeData(item));
}

Page({
  data: {
    loading: false,
    favorites: [],
    localFavorites: []
  },

  onShow() {
    this.loadFavorites();
  },

  loadFavorites() {
    const token = wx.getStorageSync('token');
    
    // 优先尝试加载服务器收藏
    if (token) {
      this.setData({ loading: true });
      api.getFavorites().then(res => {
        // 使用适配器转换数据
        const adaptedFavorites = adaptListData(res.items || []);
        this.setData({ 
          favorites: adaptedFavorites,
          loading: false 
        });
      }).catch(() => {
        this.loadLocalFavorites();
      });
    } else {
      this.loadLocalFavorites();
    }
  },

  loadLocalFavorites() {
    const local = wx.getStorageSync('local_favorites') || [];
    this.setData({ 
      localFavorites: local,
      loading: false 
    });
  },

  goToRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipe/recipe?id=${id}` });
  },

  removeFavorite(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认',
      content: '确定取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          // 尝试从服务器删除
          const token = wx.getStorageSync('token');
          if (token) {
            api.removeFavorite(id).then(() => {
              const favorites = this.data.favorites.filter(f => f.id !== id);
              this.setData({ favorites });
            }).catch(() => {
              // 服务器失败则删本地
              this.removeLocalFavorite(id);
            });
          } else {
            this.removeLocalFavorite(id);
          }
        }
      }
    });
  },

  removeLocalFavorite(id) {
    const local = this.data.localFavorites.filter(f => f.id !== id);
    wx.setStorageSync('local_favorites', local);
    this.setData({ localFavorites: local });
    wx.showToast({ title: '已取消', icon: 'success' });
  },

  onShareAppMessage() {
    return {
      title: '我的收藏 - 简家厨',
      path: '/pages/favorites/favorites'
    };
  }
});
