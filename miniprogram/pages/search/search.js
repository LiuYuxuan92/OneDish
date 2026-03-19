const api = require('../../utils/api');
const request = require('../../utils/request');
const { openRecipeDetail } = require('../../utils/navigation');
const { pickImage, pickRecipeImage } = require('../../utils/media');
const { STORAGE } = require('../../utils/constants');

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
    is_favorite: false,
    favorite_loading: false,
    shopping_loading: false,
  };
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

  updateResultAt(index, updater) {
    if (index < 0) return null;

    const results = Array.isArray(this.data.results) ? this.data.results.slice() : [];
    const current = results[index];
    if (!current) return null;

    const next = typeof updater === 'function' ? updater(current) : updater;
    if (!next) return current;

    results[index] = next;
    this.setData({ results });
    return next;
  },

  syncFavoriteState(results) {
    const favoriteIds = (wx.getStorageSync(STORAGE.LOCAL_FAVORITES) || [])
      .map((item) => String(item && item.id ? item.id : ''))
      .filter(Boolean);
    const favoriteIdSet = new Set(favoriteIds);

    return (Array.isArray(results) ? results : []).map((item) => ({
      ...item,
      is_favorite: !item.is_external_result && favoriteIdSet.has(String(item.id || '')),
      favorite_loading: false,
      shopping_loading: false,
    }));
  },

  persistLocalFavorite(recipe) {
    if (!recipe?.id || recipe.is_external_result) return;

    const localFavorites = wx.getStorageSync(STORAGE.LOCAL_FAVORITES) || [];
    const nextFavorites = localFavorites.filter((item) => String(item?.id || '') !== String(recipe.id));
    nextFavorites.unshift(recipe);
    wx.setStorageSync(STORAGE.LOCAL_FAVORITES, nextFavorites);
  },

  removeLocalFavoriteById(recipeId) {
    const nextFavorites = (wx.getStorageSync(STORAGE.LOCAL_FAVORITES) || []).filter(
      (item) => String(item?.id || '') !== String(recipeId || '')
    );
    wx.setStorageSync(STORAGE.LOCAL_FAVORITES, nextFavorites);
  },

  clearActionFeedback() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }

    if (this.data.actionFeedback) {
      this.setData({ actionFeedback: null });
    }
  },

  setActionFeedback(message, tone = 'info') {
    this.clearActionFeedback();

    this.setData({
      actionFeedback: { message, tone },
    });

    this.feedbackTimer = setTimeout(() => {
      this.feedbackTimer = null;
      this.setData({ actionFeedback: null });
    }, 3200);
  },

  async onLoad() {
    this.searchRequestSeq = 0;
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

  onUnload() {
    this.clearActionFeedback();
  },

  onInput(e) {
    this.setData({
      keyword: e.detail.value,
      showHistory: false,
    });
  },

  onClear() {
    this.searchRequestSeq = (this.searchRequestSeq || 0) + 1;
    this.clearActionFeedback();
    this.setData({
      keyword: '',
      results: [],
      hasSearched: false,
      showHistory: true,
      selectedScenario: '',
      loading: false,
    });
  },

  onSearch() {
    const keyword = String(this.data.keyword || '').trim();
    if (!keyword) return;

    this.saveHistory(keyword);
    this.doSearch(keyword);
  },

  async doSearch(keyword) {
    const requestSeq = (this.searchRequestSeq || 0) + 1;
    this.searchRequestSeq = requestSeq;

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

      if (requestSeq !== this.searchRequestSeq) return;

      const rawItems = Array.isArray(result?.results)
        ? result.results
        : Array.isArray(result?.items)
          ? result.items
          : [];

      const adaptedResults = this.syncFavoriteState(
        rawItems
          .map((item) => adaptRecipeData(item))
          .filter(Boolean)
          .map((item) => ({
            ...item,
            preference_hint: buildPreferenceHint(item, this.data.preferenceSummaryText),
          }))
      );

      this.setData({
        results: adaptedResults,
        loading: false,
      });
    } catch (err) {
      if (requestSeq !== this.searchRequestSeq) return;

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
    const nextKeyword = String(this.data.keyword || '').trim() || nextScenario;

    this.setData({
      selectedScenario: nextScenario,
      keyword: nextKeyword,
      showHistory: false,
    });

    this.setActionFeedback(
      nextScenario
        ? `已套用「${label}」场景，会按这个做饭情境重新筛选结果。`
        : '已取消场景限制，结果恢复按关键词和偏好排序。',
      'info'
    );

    if (nextKeyword) {
      this.saveHistory(nextKeyword);
      this.doSearch(nextKeyword);
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

  noop() {},

  addToShoppingListFallback(recipe) {
    const ingredients = recipe?.ingredients || [];
    if (!ingredients.length) {
      wx.showToast({ title: '暂无食材信息', icon: 'none' });
      return;
    }

    const items = ingredients.map((ingredient) => ({
      name: ingredient.name || ingredient,
      quantity: ingredient.quantity || ingredient.amount || '',
      unit: ingredient.unit || '',
      checked: false,
    }));

    wx.setStorageSync(STORAGE.PENDING_IMPORT, items);
    wx.switchTab({ url: '/pages/plan/plan' });
    this.setActionFeedback('已转到采购清单页，并把当前菜谱食材作为待购项带过去。', 'success');
    wx.showToast({ title: '已加入待购清单', icon: 'success' });
  },

  onToggleFavorite(e) {
    if (e?.stopPropagation) e.stopPropagation();

    const index = Number(e.currentTarget.dataset.index);
    const recipe = this.data.results[index];
    if (!recipe || recipe.is_external_result || recipe.favorite_loading) return;

    const token = wx.getStorageSync(STORAGE.TOKEN);
    const nextFavoriteState = !recipe.is_favorite;

    this.updateResultAt(index, (item) => ({
      ...item,
      favorite_loading: true,
    }));

    if (token) {
      const action = nextFavoriteState ? api.addFavorite(recipe.id) : api.removeFavorite(recipe.id);
      action.then(() => {
        if (nextFavoriteState) {
          this.persistLocalFavorite(recipe);
        } else {
          this.removeLocalFavoriteById(recipe.id);
        }

        this.updateResultAt(index, (item) => ({
          ...item,
          is_favorite: nextFavoriteState,
          favorite_loading: false,
        }));
        this.setActionFeedback(
          nextFavoriteState ? '已收藏这道菜，稍后可在收藏页继续查看。' : '已取消收藏，可继续浏览其它菜谱。',
          'success'
        );
        wx.showToast({ title: nextFavoriteState ? '已收藏' : '已取消收藏', icon: 'success' });
      }).catch((err) => {
        console.error('[search] toggle favorite failed:', err);
        if (nextFavoriteState) {
          this.persistLocalFavorite(recipe);
        } else {
          this.removeLocalFavoriteById(recipe.id);
        }
        this.updateResultAt(index, (item) => ({
          ...item,
          is_favorite: nextFavoriteState,
          favorite_loading: false,
        }));
        this.setActionFeedback(
          nextFavoriteState ? '当前网络或登录状态不可用，已先保存在本地收藏。' : '已从本地收藏移除这道菜。',
          'success'
        );
        wx.showToast({ title: nextFavoriteState ? '已本地收藏' : '已取消收藏', icon: 'success' });
      });
      return;
    }

    if (nextFavoriteState) {
      this.persistLocalFavorite(recipe);
    } else {
      this.removeLocalFavoriteById(recipe.id);
    }

    this.updateResultAt(index, (item) => ({
      ...item,
      is_favorite: nextFavoriteState,
      favorite_loading: false,
    }));
    this.setActionFeedback(
      nextFavoriteState ? '已加入本地收藏，登录后也可继续同步管理。' : '已从本地收藏移除。',
      'success'
    );
    wx.showToast({ title: nextFavoriteState ? '已收藏' : '已取消收藏', icon: 'success' });
  },

  onAddToShoppingList(e) {
    if (e?.stopPropagation) e.stopPropagation();

    const index = Number(e.currentTarget.dataset.index);
    const recipe = this.data.results[index];
    if (!recipe || recipe.shopping_loading) return;

    this.updateResultAt(index, (item) => ({
      ...item,
      shopping_loading: true,
    }));

    if (recipe.is_external_result) {
      this.updateResultAt(index, (item) => ({
        ...item,
        shopping_loading: false,
      }));
      this.addToShoppingListFallback(recipe);
      return;
    }

    const token = wx.getStorageSync(STORAGE.TOKEN);
    if (token && recipe.id) {
      api.addRecipeToShoppingList({ recipeId: recipe.id }).then(() => {
        this.updateResultAt(index, (item) => ({
          ...item,
          shopping_loading: false,
        }));
        this.setActionFeedback('已加入云端采购清单，进入采购页后可继续勾选、分享和同步。', 'success');
        wx.showToast({ title: '已加入云端清单', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/plan/plan' });
        }, 400);
      }).catch((err) => {
        console.error('[search] add recipe to shopping list failed:', err);
        this.updateResultAt(index, (item) => ({
          ...item,
          shopping_loading: false,
        }));
        this.addToShoppingListFallback(recipe);
      });
      return;
    }

    this.updateResultAt(index, (item) => ({
      ...item,
      shopping_loading: false,
    }));
    this.addToShoppingListFallback(recipe);
  },

  goToRecipe(e) {
    const index = Number(e.currentTarget.dataset.index);
    const recipe = this.data.results[index];
    if (!recipe) return;

    openRecipeDetail(recipe);
  },
});
