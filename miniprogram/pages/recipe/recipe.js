const api = require('../../utils/api');
const cache = require('../../utils/cache');

const CACHE_KEY_RECIPES = 'recipes_list';
const RECIPE_DETAIL_PENDING_KEY = 'pending_recipe_detail_id';
const RECIPE_DETAIL_PENDING_PAYLOAD_KEY = 'pending_recipe_detail_payload';

function parsePossibleJson(data) {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (_err) {
      return null;
    }
  }
  return data;
}

function normalizeImageList(imageValue) {
  if (Array.isArray(imageValue)) return imageValue.filter(Boolean);
  if (typeof imageValue === 'string' && imageValue.trim()) return [imageValue.trim()];
  return [];
}

function normalizeFeedbackItems(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.records)) return result.records;
  return [];
}

function normalizeIngredientItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item.trim() };
      }
      if (item && typeof item === 'object') {
        return {
          ...item,
          name: item.name || item.ingredient || '',
          amount: item.amount || item.quantity || '',
          unit: item.unit || '',
        };
      }
      return null;
    })
    .filter((item) => item && item.name);
}

function normalizeStepItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          step: index + 1,
          action: item.trim(),
          time: '',
          tools: [],
        };
      }
      if (item && typeof item === 'object') {
        return {
          ...item,
          step: item.step || index + 1,
          action: item.action || item.content || item.description || '',
          time: item.time || '',
          tools: Array.isArray(item.tools) ? item.tools : [],
        };
      }
      return null;
    })
    .filter((item) => item && item.action);
}

function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const rawAdultVersion = parsePossibleJson(recipe.adult_version) || {};
  const rawBabyVersion = parsePossibleJson(recipe.baby_version) || null;
  const rootIngredients = normalizeIngredientItems(recipe.ingredients);
  const rootSteps = normalizeStepItems(recipe.steps);
  const adultVersion = {
    ...rawAdultVersion,
    ingredients: normalizeIngredientItems(rawAdultVersion.ingredients).length
      ? normalizeIngredientItems(rawAdultVersion.ingredients)
      : rootIngredients,
    steps: normalizeStepItems(rawAdultVersion.steps).length
      ? normalizeStepItems(rawAdultVersion.steps)
      : rootSteps,
    description: rawAdultVersion.description || recipe.description || '',
  };
  const babyVersion = rawBabyVersion ? {
    ...rawBabyVersion,
    ingredients: normalizeIngredientItems(rawBabyVersion.ingredients),
    steps: normalizeStepItems(rawBabyVersion.steps),
  } : null;
  const adultIngredients = adultVersion.ingredients;

  const adapted = {
    ...recipe,
    image_url: normalizeImageList(recipe.image_url),
    title: recipe.name || recipe.title,
    cover_url: recipe.cover_url || normalizeImageList(recipe.image_url)[0] || '',
    cook_time: recipe.cook_time || recipe.total_time || recipe.prep_time || 0,
    adult_version: adultVersion,
    ingredients: adultIngredients,
    description: recipe.description || adultVersion.description || '',
    is_external_result: Boolean(recipe.source && recipe.source !== 'local'),
  };

  if (babyVersion) {
    adapted.baby_version = {
      ...babyVersion,
      title: babyVersion.name || (recipe.name ? `${recipe.name}（宝宝版）` : ''),
      description: babyVersion.description || '',
      age_range: babyVersion.age_range || babyVersion.ageRange || '',
      tips: babyVersion.tips || babyVersion.nutrition_tips || '',
      ingredients: Array.isArray(babyVersion.ingredients) ? babyVersion.ingredients : [],
    };
  }

  return adapted;
}

function adaptListData(items) {
  if (!items || !items.length) return [];
  return items.map((item) => adaptRecipeData(item));
}

Page({
  data: {
    loading: true,
    loadingMore: false,
    recipes: [],
    detail: null,
    page: 1,
    hasMore: true,
    isOffline: false,
    showAIGenerateModal: false,
    showAIResultModal: false,
    selectedBabyAge: 12,
    generateUseAI: false,
    isGenerating: false,
    aiResult: null,
    feedingAcceptedLevel: 'like',
    feedingAllergyFlag: false,
    feedingNote: '',
    recentFeedingFeedbacks: [],
    actionFeedback: null,
    babyVersionFlash: false,
    detailScrollTarget: '',
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

  flashBabyVersionCard() {
    this.setData({ babyVersionFlash: true });
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    this.flashTimer = setTimeout(() => {
      this.setData({ babyVersionFlash: false });
    }, 2400);
  },

  onLoad(options = {}) {
    if (options.id) {
      this.pendingDetailId = options.id;
    }
  },

  onShow() {
    this.checkNetworkStatus();
    this.loadRecipes();
    this.consumePendingRecipeDetail();

    if (this.pendingDetailId) {
      this.openRecipeDetail(this.pendingDetailId);
      this.pendingDetailId = '';
    }
  },

  async checkNetworkStatus() {
    const isOnline = await cache.checkNetworkStatus();
    this.setData({ isOffline: !isOnline });
  },

  consumePendingRecipeDetail() {
    const pendingPayload = wx.getStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY);
    const pendingId = wx.getStorageSync(RECIPE_DETAIL_PENDING_KEY);
    if (!pendingId && !pendingPayload) return;

    wx.removeStorageSync(RECIPE_DETAIL_PENDING_KEY);
    wx.removeStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY);

    if (pendingPayload && pendingPayload.source && pendingPayload.source !== 'local') {
      const adaptedDetail = adaptRecipeData(pendingPayload);
      this.setData({
        detail: adaptedDetail,
        recentFeedingFeedbacks: [],
        detailScrollTarget: '',
      });
      return;
    }

    if (pendingId) {
      this.openRecipeDetail(pendingId);
    }
  },

  async openRecipeDetail(id) {
    if (!id) return;

    try {
      const detail = await api.getRecipeDetail(id);
      const adaptedDetail = adaptRecipeData(detail);
      this.setData({
        detail: adaptedDetail,
        detailScrollTarget: '',
      });
      this.loadRecentFeedingFeedbacks(id);
      cache.setCache(`recipe_${id}`, adaptedDetail);
    } catch (err) {
      const cached = cache.getCache(`recipe_${id}`);
      if (cached) {
        this.setData({ detail: cached });
        wx.showToast({ title: '网络不可用，已显示缓存', icon: 'none' });
      } else {
        console.error('[recipe] open detail failed:', err);
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      }
    }
  },

  async loadRecipes(refresh = false) {
    const page = refresh ? 1 : this.data.page;

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
      const adaptedRecipes = adaptListData(newRecipes);

      if (page === 1) {
        cache.setCache(CACHE_KEY_RECIPES, adaptedRecipes);
      }

      const recipes = page === 1 ? adaptedRecipes : [...this.data.recipes, ...adaptedRecipes];

      this.setData({
        recipes,
        page: page + 1,
        hasMore: newRecipes.length > 0,
        loading: false,
        isOffline: false,
      });
    } catch (err) {
      console.error('[recipe] load list failed:', err);

      if (!this.data.recipes.length) {
        const cached = cache.getCache(CACHE_KEY_RECIPES);
        if (cached && cached.length) {
          this.setData({
            recipes: cached,
            loading: false,
            isOffline: true,
          });
          wx.showToast({ title: '网络不可用，已显示缓存', icon: 'none' });
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
    await this.openRecipeDetail(id);
  },

  async loadRecentFeedingFeedbacks(recipeId) {
    try {
      const result = await api.getRecentFeedingFeedback({ recipe_id: recipeId, limit: 3 });
      this.setData({ recentFeedingFeedbacks: normalizeFeedbackItems(result) });
    } catch (_err) {
      this.setData({ recentFeedingFeedbacks: [] });
    }
  },

  onFeedingAcceptedLevelSelect(e) {
    this.setData({ feedingAcceptedLevel: e.currentTarget.dataset.level });
  },

  onFeedingAllergyChange(e) {
    this.setData({ feedingAllergyFlag: !!e.detail.value.length });
  },

  onFeedingNoteInput(e) {
    this.setData({ feedingNote: e.detail.value || '' });
  },

  async submitFeedingFeedback() {
    const { detail, feedingAcceptedLevel, feedingAllergyFlag, feedingNote } = this.data;
    if (!detail?.id) return;
    if (detail.is_external_result) {
      wx.showToast({ title: '联网菜谱暂不支持反馈', icon: 'none' });
      return;
    }

    try {
      await api.createFeedingFeedback({
        recipe_id: detail.id,
        accepted_level: feedingAcceptedLevel,
        allergy_flag: feedingAllergyFlag,
        note: feedingNote,
      });

      wx.showToast({ title: '反馈已记录', icon: 'success' });
      this.setData({ feedingNote: '' });
      this.setActionFeedback('已记录这次用餐反馈，后续推荐会更贴近宝宝反应。', 'success');
      this.loadRecentFeedingFeedbacks(detail.id);
    } catch (err) {
      console.error('[recipe] submit feeding feedback failed:', err);
      wx.showToast({ title: '反馈失败', icon: 'none' });
    }
  },

  closeDetail() {
    this.setData({
      detail: null,
      actionFeedback: null,
      babyVersionFlash: false,
      detailScrollTarget: '',
    });
  },

  preventClose() {},

  addToListFallback(detail) {
    const ingredients = detail.ingredients || [];
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

    wx.setStorageSync('pending_import', items);
    wx.switchTab({ url: '/pages/plan/plan' });
    this.setActionFeedback('已转入采购清单页，本次菜谱食材会作为待购项继续处理。', 'success');
    wx.showToast({ title: '已加入待购清单', icon: 'success' });
  },

  addToListFromDetail() {
    const { detail } = this.data;
    if (!detail) return;
    if (detail.is_external_result) {
      this.addToListFallback(detail);
      return;
    }

    const token = wx.getStorageSync('token');
    if (token && detail.id) {
      api.addRecipeToShoppingList({ recipeId: detail.id }).then(() => {
        this.setActionFeedback('已加入云端购物清单，跳转后可继续勾选和分享。', 'success');
        wx.showToast({ title: '已加入云端清单', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/plan/plan' });
        }, 400);
      }).catch((err) => {
        console.error('[recipe] add recipe to shopping list failed:', err);
        this.addToListFallback(detail);
      });
      return;
    }

    this.addToListFallback(detail);
  },

  onImageLoad() {},

  onSharePlaceholder() {
    wx.showModal({
      title: '分享功能预留',
      content: '当前版本先保留入口，后续会接入更完整的分享流程。',
      showCancel: false,
    });
  },

  onShareTimeline() {
    const { detail } = this.data;
    return {
      title: detail?.title ? `${detail.title} - 简家厨` : '简家厨 - 一鱼两吃宝宝辅食',
      query: detail ? `id=${detail.id}` : '',
    };
  },

  openAIGenerateModal() {
    if (this.data.detail?.is_external_result) {
      wx.showToast({ title: '联网菜谱暂不支持生成宝宝版', icon: 'none' });
      return;
    }
    this.setData({ showAIGenerateModal: true });
  },

  closeAIGenerateModal() {
    this.setData({
      showAIGenerateModal: false,
      aiResult: null,
      feedingAcceptedLevel: 'like',
      feedingAllergyFlag: false,
      feedingNote: '',
      recentFeedingFeedbacks: [],
    });
  },

  onBabyAgeSelect(e) {
    const age = parseInt(e.currentTarget.dataset.age, 10);
    this.setData({ selectedBabyAge: age });
  },

  toggleGenerateMode() {
    this.setData({ generateUseAI: !this.data.generateUseAI });
  },

  async generateAIBabyVersion() {
    const { detail, selectedBabyAge, generateUseAI } = this.data;
    if (!detail) return;

    this.setData({ isGenerating: true });

    try {
      const result = await api.generateAIBabyVersion(detail.id, selectedBabyAge, generateUseAI);
      const nextDetail = adaptRecipeData({
        ...detail,
        adult_version: result?.adult_version?.adult_version || result?.adult_version || detail.adult_version,
        baby_version: result?.baby_version || detail.baby_version,
        nutrition_info: result?.nutrition_info || detail.nutrition_info,
      });

      this.setData({
        detail: nextDetail,
        aiResult: result || null,
        isGenerating: false,
        showAIGenerateModal: false,
        showAIResultModal: false,
        detailScrollTarget: 'baby-version-card',
      });

      wx.showToast({ title: '生成成功', icon: 'success' });
      if (detail.id) {
        cache.setCache(`recipe_${detail.id}`, nextDetail);
      }
      this.flashBabyVersionCard();
      this.setActionFeedback(
        result?.ai_generated
          ? `已按 ${selectedBabyAge} 个月月龄更新宝宝版做法，可直接往下看宝宝版步骤。`
          : `AI 未采用，已按 ${selectedBabyAge} 个月规则更新宝宝版做法。`,
        'success'
      );
      setTimeout(() => {
        this.setData({ detailScrollTarget: '' });
      }, 500);
    } catch (err) {
      console.error('[recipe] generate AI baby version failed:', err);
      this.setData({ isGenerating: false });
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  closeAIResultModal() {
    this.setData({ showAIResultModal: false, aiResult: null });
  },
});
