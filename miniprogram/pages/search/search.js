const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    keyword: '',
    results: [],
    history: [],
    showHistory: true
  },

  onLoad() {
    // 加载搜索历史
    const history = wx.getStorageSync('search_history') || [];
    this.setData({ history });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value, showHistory: false });
  },

  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    
    this.saveHistory(keyword);
    this.doSearch(keyword);
  },

  doSearch(keyword) {
    this.setData({ loading: true });
    api.searchRecipes(keyword).then(res => {
      this.setData({ 
        results: res.items || res || [],
        loading: false 
      });
    }).catch(err => {
      wx.showToast({ title: '搜索失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  saveHistory(keyword) {
    let history = wx.getStorageSync('search_history') || [];
    history = history.filter(k => k !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10);
    wx.setStorageSync('search_history', history);
    this.setData({ history });
  },

  clearHistory() {
    wx.showModal({
      title: '确认',
      content: '确定清空搜索历史？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('search_history');
          this.setData({ history: [] });
        }
      }
    });
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword, showHistory: false });
    this.doSearch(keyword);
  },

  goToRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipe/recipe?id=${id}` });
  }
});
