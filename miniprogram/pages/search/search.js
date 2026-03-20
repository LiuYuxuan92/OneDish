const api = require('../../utils/api');
const request = require('../../utils/request');
const { openRecipeDetail } = require('../../utils/navigation');
const { pickImage, pickRecipeImage } = require('../../utils/media');
const { summarizeFeedbackState } = require('../../utils/feedbackSummary');

const SCENARIOS = [
  { key: 'quick', label: '赶时间', query: '快手 简单 少步骤' },
  { key: 'light', label: '清淡点', query: '清淡 少油 好消化' },
  { key: 'appetite', label: '宝宝胃口一般', query: '宝宝 没胃口 开胃' },
  { key: 'fish', label: '想吃鱼但别太复杂', query: '鱼 家常 不复杂' },
];

function buildPreferenceSummary(config) {
  if (!config) return '';

  return [
    config.default_baby_age ? `${config.default_baby_age}个月` : '',
    config.cooking_time_limit ? `${config.cooking_time_limit}分钟内` : '',
    config.prefer_ingredients ? `偏好 ${config.prefer_ingredients}` : '',
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
}

function buildPreferenceHint(item, preferenceSummaryText) {
  const reasons = Array.isArray(item?.ranking_reasons) ? item.ranking_reasons : [];
  const explain = Array.isArray(item?.recommendation_explain) ? item.recommendation_explain.filter(Boolean) : [];
  const firstReason = reasons.find((reason) =>
    ['time', 'baby', 'preference', 'difficulty'].includes(String(reason?.code || ''))
  );

  if (firstReason?.detail) return `这道菜优先命中了你的偏好：${firstReason.detail}`;
  if (firstReason?.label) return `这道菜优先命中了你的偏好：${firstReason.label}`;
  if (explain[0]) return `推荐理由：${explain[0]}`;
  if (preferenceSummaryText) return `排序时参考了：${preferenceSummaryText}`;
  return '系统综合考虑了口味、下厨时长和宝宝阶段。';
}

function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const isExternal = Boolean(recipe.source && recipe.source !== 'local');

  return {
    ...recipe,
    title: recipe.name || recipe.title,
    cover_url: pickImage(recipe.cover_url) || pickRecipeImage(recipe.id, recipe.image_url),
    cook_time: recipe.cook_time || recipe.total_time || recipe.prep_time || 0,
    source_label: isExternal ? '联网菜谱' : '本地菜谱',
    source_hint: isExternal
      ? '可查看详情和加入清单，暂不支持反馈与生成宝宝版。'
      : '支持收藏、反馈和宝宝版生成。',
    is_external_result: isExternal,
  };
}

async function attachFeedbackSummary(item) {
  if (!item || item.is_external_result || !item.id) {
    return item;
  }

  try {
    const recentFeedback = await api.getRecentFeedingFeedback({ recipe_id: item.id, limit: 3 });
    const feedbackItems = Array.isArray(recentFeedback)
      ? recentFeedback
      : Array.isArray(recentFeedback?.items)
        ? recentFeedback.items
        : [];

    return {
      ...item,
      feedback_summary: summarizeFeedbackState(feedbackItems),
    };
  } catch (_err) {
    return item;
  }
}

Page({
  data: {
    loading: false,
    keyword: '',
    results: [],
    history: [],
    showHistory: true,
    hasSearched: false,
    preferenceSummaryText: '',
    inventoryIngredients: [],
    inventoryFirst: true,
    scenarios: SCENARIOS,
    selectedScenario: '',
    actionFeedback: null,
  },

  setActionFeedback(message, tone = 'info') {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }

    this.setData({
      actionFeedback: { message, tone },
    });

    this.feedbackTimer = setTimeout(() => {
      this.setData({ actionFeedback: null });
    }, 3200);
  },

  async onLoad() {
    const preferenceConfig = wx.getStorageSync('user_preferences') || null;
    const history = wx.getStorageSync('search_history') || [];

    this.setData({
      history,
      preferenceSummaryText: buildPreferenceSummary(preferenceConfig),
    });

    try {
      const inventoryRes = await request({
        url: '/ingredient-inventory',
        withAuth: true,
        showLoading: false,
      });

      const inventoryIngredients = Array.isArray(inventoryRes?.inventory)
        ? inventoryRes.inventory
            .map((item) => String(item.ingredient_name || '').trim())
            .filter(Boolean)
            .slice(0, 20)
        : [];

      this.setData({ inventoryIngredients });
    } catch (_err) {
      this.setData({ inventoryIngredients: [] });
    }
  },

  onInput(e) {
    this.setData({
      keyword: e.detail.value,
      showHistory: false,
    });
  },

  onClear() {
    this.setData({
      keyword: '',
      results: [],
      hasSearched: false,
      showHistory: true,
      selectedScenario: '',
    });
  },

  onSearch() {
    const keyword = String(this.data.keyword || '').trim();
    if (!keyword) return;

    this.saveHistory(keyword);
    this.doSearch(keyword);
  },

  async doSearch(keyword) {
    this.setData({
      loading: true,
      hasSearched: true,
      showHistory: false,
    });

    try {
      const result = await api.searchRecipes(keyword, {
        inventoryIngredients: this.data.inventoryFirst ? this.data.inventoryIngredients : [],
        scenario: this.data.selectedScenario || undefined,
      });

      const rawItems = Array.isArray(result?.results)
        ? result.results
        : Array.isArray(result?.items)
          ? result.items
          : [];

      const adaptedResults = await Promise.all(
        rawItems
          .map((item) => adaptRecipeData(item))
          .filter(Boolean)
          .map(async (item) => {
            const itemWithFeedback = await attachFeedbackSummary(item);
            return {
              ...itemWithFeedback,
              preference_hint: buildPreferenceHint(itemWithFeedback, this.data.preferenceSummaryText),
            };
          })
      );

      this.setData({
        results: adaptedResults,
        loading: false,
      });
    } catch (err) {
      console.error('[search] search failed:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '搜索失败，请稍后重试', icon: 'none' });
    }
  },

  saveHistory(keyword) {
    let history = wx.getStorageSync('search_history') || [];
    history = history.filter((item) => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10);

    wx.setStorageSync('search_history', history);
    this.setData({ history });
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定删除全部搜索历史吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.removeStorageSync('search_history');
        this.setData({ history: [] });
      },
    });
  },

  toggleInventoryFirst() {
    const nextInventoryFirst = !this.data.inventoryFirst;
    this.setData({ inventoryFirst: nextInventoryFirst });
    this.setActionFeedback(
      nextInventoryFirst
        ? '已开启库存优先：会优先把能消耗现有食材的菜谱排前面，但不会只显示库存内菜谱。'
        : '已关闭库存优先：结果会更偏向关键词和偏好匹配，不再优先消耗库存。',
      'info'
    );

    if (String(this.data.keyword || '').trim()) {
      this.doSearch(String(this.data.keyword || '').trim());
    }
  },

  onScenarioTap(e) {
    const query = e.currentTarget.dataset.query;
    const label = e.currentTarget.dataset.label;
    const nextScenario = this.data.selectedScenario === query ? '' : query;
    const currentKeyword = String(this.data.keyword || '').trim();

    this.setData({
      selectedScenario: nextScenario,
      showHistory: false,
    });

    this.setActionFeedback(
      nextScenario
        ? `已套用「${label}」场景，会按这个做饭情境重新筛选结果。`
        : '已取消场景限制，结果恢复按关键词和偏好排序。',
      'info'
    );

    if (currentKeyword) {
      this.doSearch(currentKeyword);
    }
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      keyword,
      showHistory: false,
    });
    this.doSearch(keyword);
  },

  goToRecipe(e) {
    const index = Number(e.currentTarget.dataset.index);
    const recipe = this.data.results[index];
    if (!recipe) return;

    openRecipeDetail(recipe);
  },
});
