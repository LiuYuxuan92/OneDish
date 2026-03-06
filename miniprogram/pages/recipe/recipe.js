const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    detail: null,
    currentVersion: 'adult', // adult | baby
    activeTab: 'ingredients' // ingredients | steps
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id);
    }
  },

  async loadDetail(id) {
    this.setData({ loading: true });
    try {
      const detail = await api.getRecipeDetail(id);
      this.setData({ 
        detail,
        currentVersion: detail?.baby_version ? 'adult' : 'adult',
        loading: false 
      });
    } catch (err) {
      wx.showToast({ title: '获取详情失败', icon: 'none' });
      console.error('[recipe] load detail failed:', err);
      this.setData({ loading: false });
    }
  },

  // 切换版本
  switchVersion(e) {
    const version = e.currentTarget.dataset.version;
    this.setData({ currentVersion: version });
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加入购物清单
  addToList() {
    const { detail, currentVersion } = this.data;
    if (!detail) return;

    const ingredients = currentVersion === 'baby'
      ? detail.baby_version?.ingredients
      : detail.ingredients;
    
    if (!ingredients || ingredients.length === 0) {
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

  // 分享
  onShareAppMessage() {
    const { detail } = this.data;
    if (!detail) return {};
    
    return {
      title: `一鱼两吃：${detail.title}`,
      path: `/pages/recipe/recipe?id=${detail.id}`,
      imageUrl: detail.cover_url
    };
  }
});
