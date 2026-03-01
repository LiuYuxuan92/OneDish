const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    recommendation: null
  },

  onShow() {
    this.loadTodayRecommendation();
  },

  async loadTodayRecommendation() {
    this.setData({ loading: true });
    try {
      const data = await api.getTodayRecommendation();
      this.setData({ recommendation: data?.recipe || null });
    } catch (err) {
      wx.showToast({ title: '获取推荐失败', icon: 'none' });
      console.error('[home] getTodayRecommendation failed:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async onSwap() {
    const currentId = this.data.recommendation?.id;
    try {
      wx.showLoading({ title: '换菜中...' });
      const next = await api.swapRecommendation(currentId);
      if (!next) {
        wx.showToast({ title: '暂无可替换菜谱', icon: 'none' });
        return;
      }
      this.setData({ recommendation: next });
      wx.showToast({ title: '已为你换一道', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '换菜失败', icon: 'none' });
      console.error('[home] swap failed:', err);
    } finally {
      wx.hideLoading();
    }
  },

  goRecipe() {
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  onSharePlaceholder() {
    wx.showModal({
      title: '共享能力预留',
      content: 'MVP 阶段仅提供入口占位。下一步可接入分享链接/卡片。',
      showCancel: false
    });
  }
});
