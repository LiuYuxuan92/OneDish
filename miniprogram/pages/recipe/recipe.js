const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    recipes: [],
    detail: null
  },

  onShow() {
    this.loadRecipes();
  },

  async loadRecipes() {
    this.setData({ loading: true });
    try {
      const result = await api.getRecipeList();
      this.setData({ recipes: result.items || [] });
    } catch (err) {
      wx.showToast({ title: '获取菜谱失败', icon: 'none' });
      console.error('[recipe] load list failed:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async selectRecipe(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const detail = await api.getRecipeDetail(id);
      this.setData({ detail });
    } catch (err) {
      wx.showToast({ title: '获取详情失败', icon: 'none' });
      console.error('[recipe] load detail failed:', err);
    }
  },

  onSharePlaceholder() {
    wx.showModal({
      title: '共享能力预留',
      content: 'MVP 阶段仅提供入口占位。',
      showCancel: false
    });
  }
});
