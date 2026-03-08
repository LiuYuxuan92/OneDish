const api = require('../../utils/api');

function buildPreferenceHint(item, preferenceSummary) {
  const reasons = Array.isArray(item?.ranking_reasons) ? item.ranking_reasons : [];
  const explain = Array.isArray(item?.recommendation_explain) ? item.recommendation_explain.filter(Boolean) : [];

  const firstReason = reasons.find((reason) => ['time', 'baby', 'preference', 'difficulty'].includes(String(reason?.code || '')));
  if (firstReason?.detail) return `按你的偏好优先：${firstReason.detail}`;
  if (firstReason?.label) return `按你的偏好优先：${firstReason.label}`;
  if (explain[0]) return `按你的偏好优先：${explain[0]}`;
  if (preferenceSummary) return `排序时参考了你的设置：${preferenceSummary}`;
  return '结果已综合口味、做饭时长和月龄需求排序';
}

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

const SCENARIOS = [
  { key: 'quick', label: '赶时间', query: '赶时间 快手 简单点' },
  { key: 'light', label: '清淡点', query: '清淡 少油' },
  { key: 'appetite', label: '宝宝没胃口', query: '宝宝没胃口 开胃' },
  { key: 'fish', label: '想吃鱼但别太复杂', query: '想吃鱼 但别太复杂' }
];

Page({
  data: {
    loading: false,
    keyword: '',
    results: [],
    history: [],
    showHistory: true,
    preferenceSummaryText: '',
    inventoryIngredients: [],
    inventoryFirst: true,
    scenarios: SCENARIOS,
    selectedScenario: ''
  },

  async onLoad() {
     const preferenceConfig = wx.getStorageSync('user_preferences') || null;
     const preferenceSummaryText = preferenceConfig
       ? [
           preferenceConfig.default_baby_age ? `${preferenceConfig.default_baby_age}个月月龄` : '',
           preferenceConfig.cooking_time_limit ? `${preferenceConfig.cooking_time_limit}分钟内优先` : '',
           preferenceConfig.prefer_ingredients ? `偏爱${preferenceConfig.prefer_ingredients}` : ''
         ].filter(Boolean).slice(0, 3).join('｜')
       : '';
     this.setData({ preferenceSummaryText });
    // 加载搜索历史
    const history = wx.getStorageSync('search_history') || [];
    this.setData({ history });

    try {
      const inventoryRes = await require('../../utils/request')({
        url: '/ingredient-inventory',
        withAuth: true
      });
      const inventoryIngredients = Array.isArray(inventoryRes?.inventory)
        ? inventoryRes.inventory.map(item => String(item.ingredient_name || '').trim()).filter(Boolean).slice(0, 20)
        : [];
      this.setData({ inventoryIngredients });
    } catch (_) {}
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value, showHistory: false });
  },

  onClear() {
    this.setData({ keyword: '', results: [], showHistory: true });
  },

  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    
    this.saveHistory(keyword);
    this.doSearch(keyword);
  },

  doSearch(keyword) {
    this.setData({ loading: true });
    api.searchRecipes(keyword, {
      inventoryIngredients: this.data.inventoryFirst ? this.data.inventoryIngredients : [],
      scenario: this.data.selectedScenario || undefined
    }).then(res => {
      // 使用适配器转换数据
      const adaptedResults = adaptListData(res.items || []).map(item => ({
        ...item,
        preference_hint: buildPreferenceHint(item, this.data.preferenceSummaryText)
      }));
      this.setData({ 
        results: adaptedResults,
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

  toggleInventoryFirst() {
    const next = !this.data.inventoryFirst;
    this.setData({ inventoryFirst: next });
    if (this.data.keyword.trim()) this.doSearch(this.data.keyword.trim());
  },

  onScenarioTap(e) {
    const query = e.currentTarget.dataset.query;
    const next = this.data.selectedScenario === query ? '' : query;
    this.setData({
      selectedScenario: next,
      keyword: this.data.keyword || next
    });
    if (this.data.keyword || next) {
      this.doSearch((this.data.keyword || next).trim());
    }
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
