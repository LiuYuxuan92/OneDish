const api = require('../../utils/api');
const cache = require('../../utils/cache');
const { trackEvent } = require('../../utils/analytics');
const { buildQuotaCard, buildBannerModel, handleQuotaUpgradeError } = require('../../utils/entitlements');
const { normalizeRecipeImageList, pickImage, pickRecipeImage } = require('../../utils/media');

const CACHE_KEY_RECIPES = 'recipes_list';
const RECIPE_DETAIL_PENDING_KEY = 'pending_recipe_detail_id';
const RECIPE_DETAIL_PENDING_PAYLOAD_KEY = 'pending_recipe_detail_payload';
const LOCAL_FAVORITES_KEY = 'local_favorites';

function getLocalFavorites() {
  const favorites = wx.getStorageSync(LOCAL_FAVORITES_KEY);
  return Array.isArray(favorites) ? favorites : [];
}

function isLocallyFavorited(recipeId) {
  return getLocalFavorites().some((item) => item.id === recipeId);
}

function persistLocalFavorite(recipe, nextFavorited) {
  const favorites = getLocalFavorites();

  if (nextFavorited) {
    const nextFavorites = [recipe, ...favorites.filter((item) => item.id !== recipe.id)].slice(0, 50);
    wx.setStorageSync(LOCAL_FAVORITES_KEY, nextFavorites);
    return;
  }

  wx.setStorageSync(
    LOCAL_FAVORITES_KEY,
    favorites.filter((item) => item.id !== recipe.id)
  );
}

async function resolveFavoriteState(recipe) {
  if (!isFavoriteSupported(recipe)) {
    return false;
  }

  const token = wx.getStorageSync('token');
  if (!token) {
    return isLocallyFavorited(recipe.id);
  }

  const result = await api.checkFavorite(recipe.id);
  return Boolean(result?.is_favorited);
}

function isFavoriteSupported(recipe) {
  return Boolean(recipe?.id) && !recipe?.is_external_result;
}

function applyFavoriteMutation(page, recipe, nextFavorited) {
  const nextDetail = {
    ...recipe,
    is_favorited: nextFavorited,
  };

  page.setData({
    detail: nextDetail,
  });
  page.updateRecipeInList(recipe.id, { is_favorited: nextFavorited });
  cache.setCache(`recipe_${recipe.id}`, nextDetail);
  return nextDetail;
}

function getFavoriteFeedbackCopy(nextFavorited) {
  return nextFavorited
    ? {
        feedback: '这道菜已加入收藏，后续可在收藏页快速找回。',
        toast: '已加入收藏',
      }
    : {
        feedback: '已从收藏中移除，不会再保留在收藏页。',
        toast: '已取消收藏',
      };
}

function getFavoriteFailureToast(nextFavorited) {
  return nextFavorited ? '收藏失败' : '取消收藏失败';
}

async function runShowRefresh(page) {
  page.checkNetworkStatus();
  page.loadBillingSnapshot();
  page.loadRecipes();
  page.consumePendingRecipeDetail();

  if (page.pendingDetailId) {
    const pendingId = page.pendingDetailId;
    page.pendingDetailId = '';
    await page.openRecipeDetail(pendingId);
    return;
  }

  if (page.data.detail?.id) {
    await page.refreshOpenDetailFavoriteState();
  }
}

async function applyFavoriteFailure(page, nextFavorited) {
  wx.showToast({
    title: getFavoriteFailureToast(nextFavorited),
    icon: 'none',
  });
  await page.refreshOpenDetailFavoriteState();
}

function setFavoriteSuccessFeedback(page, nextFavorited) {
  const copy = getFavoriteFeedbackCopy(nextFavorited);
  page.setActionFeedback(copy.feedback, 'success');
  wx.showToast({
    title: copy.toast,
    icon: 'success',
  });
}

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
    image_url: normalizeRecipeImageList(recipe.id, recipe.image_url),
    title: recipe.name || recipe.title,
    cover_url: pickImage(recipe.cover_url) || pickRecipeImage(recipe.id, recipe.image_url) || '',
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

function buildUserRecipePayloadFromExternalDetail(detail) {
  const ingredients = Array.isArray(detail?.ingredients) && detail.ingredients.length
    ? detail.ingredients
    : Array.isArray(detail?.adult_version?.ingredients)
      ? detail.adult_version.ingredients
      : [];
  const adultSteps = Array.isArray(detail?.adult_version?.steps)
    ? detail.adult_version.steps
    : Array.isArray(detail?.steps)
      ? detail.steps
      : [];
  const imageUrl = detail?.cover_url
    ? [detail.cover_url]
    : Array.isArray(detail?.image_url)
      ? detail.image_url
      : detail?.image_url
        ? [detail.image_url]
        : [];

  return {
    name: detail?.title || detail?.name || '',
    source: detail?.source || 'external',
    prep_time: detail?.cook_time || detail?.total_time || detail?.prep_time || 0,
    difficulty: detail?.difficulty || 'medium',
    image_url: imageUrl,
    adult_version: {
      description: detail?.adult_version?.description || detail?.description || '',
      ingredients,
      steps: adultSteps,
    },
    original_data: detail,
  };
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
    aiQuotaCard: null,
    recipeBanner: { title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' },
    favoriteSubmitting: false,
    isSavingExternalRecipe: false,
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

  clearFeedbackTimer() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
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


  onHide() {
    this.clearFeedbackTimer();
    this.setData({
      detail: null,
      actionFeedback: null,
      babyVersionFlash: false,
      detailScrollTarget: '',
      showAIGenerateModal: false,
      showAIResultModal: false,
      aiResult: null,
      isGenerating: false,
    });
  },

  onUnload() {
    this.clearFeedbackTimer();
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  },

  async checkNetworkStatus() {
    const isOnline = await cache.checkNetworkStatus();
    this.setData({ isOffline: !isOnline });
  },

  updateRecipeBanner() {
    const { aiQuotaCard } = this.data;
    this.setData({
      recipeBanner: buildBannerModel({
        title: aiQuotaCard ? '宝宝版 AI 改写可直接用' : '开通成长会员，宝宝改写更顺手',
        subtitle: aiQuotaCard
          ? `本期宝宝版 AI 剩余 ${aiQuotaCard.value}`
          : '宝宝版 AI 改写、跨端同步和次数查看，已经统一收进成长会员。',
        badgeText: '当前菜谱可直接生成宝宝版',
        actionText: aiQuotaCard ? '查看权益' : '去开通',
        footerText: '小程序先快速生成，App 里还可继续做更完整的家庭管理。',
        quotaCards: aiQuotaCard ? [aiQuotaCard] : [],
        theme: aiQuotaCard ? 'warm' : 'neutral',
      }),
    });
  },

  async loadBillingSnapshot() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ aiQuotaCard: null });
      this.updateRecipeBanner();
      return;
    }

    try {
      const summary = await api.getBillingSummary('miniprogram');
      this.setData({ aiQuotaCard: buildQuotaCard(summary, 'ai_baby_recipe') });
      this.updateRecipeBanner();
    } catch (_err) {
      this.setData({ aiQuotaCard: null });
      this.updateRecipeBanner();
    }
  },

  goToMembership() {
    trackEvent('mp_membership_tap', { source: 'recipe_banner' });
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  consumePendingRecipeDetail() {
    const pendingPayload = wx.getStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY);
    const pendingId = wx.getStorageSync(RECIPE_DETAIL_PENDING_KEY);
    if (!pendingId && !pendingPayload) return;

    wx.removeStorageSync(RECIPE_DETAIL_PENDING_KEY);
    wx.removeStorageSync(RECIPE_DETAIL_PENDING_PAYLOAD_KEY);

    if (pendingPayload && pendingPayload.source && pendingPayload.source !== 'local') {
      const adaptedDetail = adaptRecipeData(pendingPayload);
      this.applyDetailState(adaptedDetail);
      this.setData({
        recentFeedingFeedbacks: [],
      });
      return;
    }

    if (pendingId) {
      this.openRecipeDetail(pendingId);
    }
  },

  async syncDetailFavoriteState(recipe) {
    try {
      return await resolveFavoriteState(recipe);
    } catch (_err) {
      return false;
    }
  },

  async refreshOpenDetailFavoriteState() {
    if (!this.data.detail?.id) return;
    const nextDetail = await this.applyDetailState(this.data.detail, { keepScrollTarget: true });
    return nextDetail;
  },

  handleFavoriteToggleSuccess(recipe, nextFavorited) {
    const nextDetail = applyFavoriteMutation(this, recipe, nextFavorited);
    setFavoriteSuccessFeedback(this, nextFavorited);
    return nextDetail;
  },

  updateRecipeInList(recipeId, changes) {
    if (!recipeId) return;
    const recipes = Array.isArray(this.data.recipes) ? this.data.recipes : [];
    const nextRecipes = recipes.map((item) => (
      item.id === recipeId ? { ...item, ...changes } : item
    ));
    this.setData({ recipes: nextRecipes });
  },

  async applyDetailState(detail, options = {}) {
    if (!detail) {
      this.setData({ detail: null, detailScrollTarget: '' });
      return;
    }

    const isFavorited = await this.syncDetailFavoriteState(detail);
    const nextDetail = {
      ...detail,
      is_favorited: isFavorited,
    };

    this.setData({
      detail: nextDetail,
      detailScrollTarget: options.keepScrollTarget ? this.data.detailScrollTarget : '',
    });
    this.updateRecipeInList(nextDetail.id, { is_favorited: isFavorited });
    return nextDetail;
  },

  async openRecipeDetail(id) {
    if (!id) return;

    try {
      const detail = await api.getRecipeDetail(id);
      const adaptedDetail = adaptRecipeData(detail);
      const nextDetail = await this.applyDetailState(adaptedDetail);
      this.loadRecentFeedingFeedbacks(id);
      cache.setCache(`recipe_${id}`, nextDetail || adaptedDetail);
    } catch (err) {
      const cached = cache.getCache(`recipe_${id}`);
      if (cached) {
        await this.applyDetailState(cached);
        wx.showToast({ title: '网络不可用，已显示缓存', icon: 'none' });
      } else {
        console.error('[recipe] open detail failed:', err);
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      }
    }
  },

  async onToggleFavorite() {
    const { detail, favoriteSubmitting } = this.data;
    if (!detail?.id || favoriteSubmitting) return;

    if (!isFavoriteSupported(detail)) {
      wx.showToast({ title: '联网菜谱暂不支持收藏', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    const nextFavorited = !detail.is_favorited;

    this.setData({ favoriteSubmitting: true });

    try {
      if (token) {
        if (nextFavorited) {
          await api.addFavorite(detail.id);
        } else {
          await api.removeFavorite(detail.id);
        }
        this.handleFavoriteToggleSuccess(detail, nextFavorited);
      } else {
        persistLocalFavorite(detail, nextFavorited);
        this.handleFavoriteToggleSuccess(detail, nextFavorited);
      }
    } catch (err) {
      console.error('[recipe] favorite failed:', err);
      if (token) {
        await applyFavoriteFailure(this, nextFavorited);
      } else {
        wx.showToast({
          title: getFavoriteFailureToast(nextFavorited),
          icon: 'none',
        });
      }
    } finally {
      this.setData({ favoriteSubmitting: false });
    }
  },

  async saveExternalRecipeToLocal() {
    const { detail, isSavingExternalRecipe } = this.data;
    if (!detail?.is_external_result || isSavingExternalRecipe) return;

    this.setData({ isSavingExternalRecipe: true });

    try {
      const payload = buildUserRecipePayloadFromExternalDetail(detail);
      const saved = await api.saveExternalRecipe(payload);
      const savedRecipe = saved && saved.recipe ? saved.recipe : saved;
      const adaptedDetail = adaptRecipeData(savedRecipe);
      const nextDetail = await this.applyDetailState({
        ...adaptedDetail,
        is_external_result: false,
      }, { keepScrollTarget: true });

      if (nextDetail?.id) {
        cache.setCache(`recipe_${nextDetail.id}`, nextDetail);
        this.loadRecentFeedingFeedbacks(nextDetail.id);
      }

      this.setActionFeedback('已保存为本地菜谱，下面可以继续收藏、反馈或生成宝宝版。', 'success');
      wx.showToast({ title: '已保存为本地菜谱', icon: 'success' });
    } catch (err) {
      console.error('[recipe] save external recipe failed:', err);
      wx.showToast({ title: err.message || '保存失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ isSavingExternalRecipe: false });
    }
  },

  async onFavoriteStorageChange() {
    await this.refreshOpenDetailFavoriteState();
  },

  async onShow() {
    await runShowRefresh(this);
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
    trackEvent('mp_baby_rewrite_entry_tap', { source: 'recipe_detail' });
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
      trackEvent('mp_baby_rewrite_generate_click', {
        source: 'recipe_detail',
        baby_age_months: selectedBabyAge,
        mode: generateUseAI ? 'ai' : 'rule',
      });
      const result = await api.generateAIBabyVersion(detail.id, selectedBabyAge, generateUseAI);
      const nextDetail = adaptRecipeData({
        ...detail,
        adult_version: result?.adult_version?.adult_version || result?.adult_version || detail.adult_version,
        baby_version: result?.baby_version || detail.baby_version,
        nutrition_info: result?.nutrition_info || detail.nutrition_info,
        is_favorited: detail.is_favorited,
      });

      this.setData({
        aiResult: result || null,
        isGenerating: false,
        showAIGenerateModal: false,
        showAIResultModal: false,
        detailScrollTarget: 'baby-version-card',
      });
      await this.applyDetailState(nextDetail, { keepScrollTarget: true });

      wx.showToast({ title: '生成成功', icon: 'success' });
      this.loadBillingSnapshot();
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
      if (handleQuotaUpgradeError(err, {
        featureCode: 'ai_baby_recipe',
        source: 'recipe_ai_generate',
        onConfirm: () => this.goToMembership(),
      })) {
        return;
      }
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  closeAIResultModal() {
    this.setData({ showAIResultModal: false, aiResult: null });
  },
});

if (typeof module !== 'undefined') {
  module.exports = {
    adaptRecipeData,
    normalizeFeedbackItems,
    buildUserRecipePayloadFromExternalDetail,
  };
}


