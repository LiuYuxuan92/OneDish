const api = require('../../utils/api');
const cache = require('../../utils/cache');
const cache = require('../../utils/cache');

const CACHE_KEY_RECIPES = 'recipes_list';

Page({
  data: {
    loading: true,
    loadingMore: false,
    recipes: [],
    detail: null,
    page: 1,
    hasMore: true,
    isOffline: false // 网络状态
  },

  onShow() {
    this.checkNetworkStatus();
    this.loadRecipes();
  },

  async checkNetworkStatus() {
    const isOnline = await cache.checkNetworkStatus();
    this.setData({ isOffline: !isOnline });
  },

  async loadRecipes(refresh = false) {
    const page = refresh ? 1 : this.data.page;
    
    // 尝试从缓存加载
    if (refresh) {
      const cached = cache.getCache(CACHE_KEY_RECIPES);
      if (cached && cached.length) {
        this.setData({ recipes: cached, loading: false });
      }
    }

    this.setData({ loading: true });
    
    try {
      const result = await api.getRecipeList({ page, limit: 20 });
      const newRecipes = result.items || [];
      
      // 缓存第一页
      if (page === 1) {
        cache.setCache(CACHE_KEY_RECIPES, newRecipes);
      }

      const recipes = page === 1 ? newRecipes : [...this.data.recipes, ...newRecipes];
      
      this.setData({
        recipes,
        page: page + 1,
        hasMore: newRecipes.length > 0,
        loading: false,
        isOffline: false
      });
    } catch (err) {
      console.error('[recipe] load list failed:', err);
      
      // 加载失败，尝试使用缓存
      if (!this.data.recipes.length) {
        const cached = cache.getCache(CACHE_KEY_RECIPES);
        if (cached && cached.length) {
          this.setData({
            recipes: cached,
            loading: false,
            isOffline: true
          });
          wx.showToast({ title: '网络不可用，显示缓存', icon: 'none' });
          return;
        }
      }
      
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true });
    await this.loadRecipes();
    this.setData({ loadingMore: false });
  },

  onReachBottom() {
    this.loadMore();
  },

  onPullDownRefresh() {
    this.loadRecipes(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async selectRecipe(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    
    // 尝试加载详情
    try {
      const detail = await api.getRecipeDetail(id);
      this.setData({ detail });
    } catch (err) {
      // 尝试从缓存加载
      const cached = cache.getCache(`recipe_${id}`);
      if (cached) {
        this.setData({ detail: cached });
        wx.showToast({ title: '网络不可用', icon: 'none' });
      } else {
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      }
    }
  },

  closeDetail() {
    this.setData({ detail: null });
  },

  preventClose() {
    // 阻止关闭
  },

  addToListFromDetail() {
    const { detail } = this.data;
    if (!detail) return;
    
    const ingredients = detail.ingredients || [];
    if (!ingredients.length) {
      wx.showToast({ title: '暂无食材', icon: 'none' });
      return;
    }

    const items = (ingredients || []).map(i => ({
      name: i.name || i,
      quantity: i.quantity || '',
      unit: i.unit || '',
      checked: false
    }));

    wx.setStorageSync('pending_import', items);
    wx.switchTab({ url: '/pages/plan/plan' });
    wx.showToast({ title: '已添加到清单', icon: 'success' });
  },

  // 预加载图片
  onImageLoad(e) {
    // 可以在这里添加图片加载完成处理
  },

  onSharePlaceholder() {
    wx.showModal({
      title: '共享能力预留',
      content: 'MVP 阶段仅提供入口占位。',
      showCancel: false
    });
  },

  onShareTimeline() {
    const { detail } = this.data;
    return {
      title: detail?.title ? `${detail.title} - 简家厨` : '简家厨 - 一鱼两吃宝宝辅食',
      query: detail ? `id=${detail.id}` : ''
    };
  }
});
