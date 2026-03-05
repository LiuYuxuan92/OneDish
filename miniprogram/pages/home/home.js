const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    swapping: false,
    error: null,
    recommendation: null
  },

  onShow() {
    this.loadTodayRecommendation();
  },

  async loadTodayRecommendation() {
    this.setData({ loading: true, error: null });
    try {
      const data = await api.getTodayRecommendation();
      this.setData({ 
        recommendation: data?.recipe || null,
        loading: false 
      });
    } catch (err) {
      console.error('[home] getTodayRecommendation failed:', err);
      this.setData({ 
        error: '加载失败，请检查网络',
        loading: false 
      });
    }
  },

  async onSwap() {
    if (this.data.swapping) return;
    
    const currentId = this.data.recommendation?.id;
    this.setData({ swapping: true });
    
    try {
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
      this.setData({ swapping: false });
    }
  },

  onFavorite() {
    wx.showToast({ title: '收藏功能开发中', icon: 'none' });
  },

  goRecipe() {
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  onShare() {
    // 检查是否登录
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再分享',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }
    
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  }
});
