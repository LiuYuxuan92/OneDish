const api = require('../../utils/api');
const { openRecipeDetail } = require('../../utils/navigation');
const { trackEvent } = require('../../utils/analytics');
const { buildBannerModel, buildQuotaCards } = require('../../utils/entitlements');
const { pickImage, pickRecipeImage, resolveMediaUrl } = require('../../utils/media');
const { buildPendingPlanExecution } = require('../../utils/plan-pending-execution');

const LOCAL_FAVORITES_KEY = 'local_favorites';
const PENDING_PLAN_EXECUTION_KEY = 'pending_plan_execution';

function parseMaybeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }
  return value;
}

function normalizeIngredients(list) {
  return Array.isArray(list) ? list : [];
}

function buildPreferenceSummary(config) {
  if (!config) return '';

  const parts = [];
  if (config.default_baby_age) parts.push(`${config.default_baby_age}个月`);
  if (config.prefer_ingredients) parts.push(`偏好 ${config.prefer_ingredients}`);
  if (config.exclude_ingredients) parts.push(`避开 ${config.exclude_ingredients}`);
  if (config.cooking_time_limit) parts.push(`${config.cooking_time_limit} 分钟内完成`);

  return parts.slice(0, 3).join(' · ');
}

function buildProductizedReasons(recipe, preferenceSummaryText) {
  const explain = Array.isArray(recipe?.recommendation_explain)
    ? recipe.recommendation_explain.filter(Boolean)
    : [];
  const rankingReasons = Array.isArray(recipe?.ranking_reasons)
    ? recipe.ranking_reasons
    : [];
  const polished = [];

  rankingReasons.forEach((reason) => {
    const code = String(reason?.code || '').trim();
    const detail = String(reason?.detail || '').trim();

    if (code === 'time') polished.push(detail ? `更贴合今天的下厨节奏：${detail}` : '更贴合今天的下厨节奏');
    if (code === 'baby') polished.push(detail ? `更符合当前月龄阶段：${detail}` : '更符合当前月龄阶段');
    if (code === 'preference') polished.push(detail ? `更接近你家的口味偏好：${detail}` : '更接近你家的口味偏好');
    if (code === 'difficulty') polished.push(detail ? `操作负担更合适：${detail}` : '操作负担更合适');
  });

  explain.forEach((item) => polished.push(String(item).trim()));

  const unique = Array.from(new Set(polished.filter(Boolean)));
  if (unique.length) return unique.slice(0, 3);
  if (preferenceSummaryText) return [`已结合你的偏好设置：${preferenceSummaryText}`];
  return ['优先综合了月龄、下厨时长和口味偏好'];
}

function buildMemberSummary(summary) {
  const entitlements = Array.isArray(summary?.active_entitlements) ? summary.active_entitlements : [];
  const active = entitlements[0] || null;

  if (!active) {
    return {
      isMember: false,
      title: '登录后同步成长会员权益',
      subtitle: '小程序先做轻决策，App 解锁完整家庭管理体验',
    };
  }

  return {
    isMember: true,
    title: '成长会员已开通',
    subtitle: active.ends_at ? `有效期至 ${new Date(active.ends_at).toLocaleDateString('zh-CN')}` : '本月 AI 能力可继续使用',
  };
}

function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const adultVersion = parseMaybeJson(recipe.adult_version, {});
  const babyVersion = parseMaybeJson(recipe.baby_version, null);
  const rootIngredients = normalizeIngredients(recipe.ingredients);
  const adultIngredients = normalizeIngredients(adultVersion?.ingredients).length
    ? normalizeIngredients(adultVersion.ingredients)
    : rootIngredients;

  const adapted = {
    ...recipe,
    title: recipe.name || recipe.title,
    cover_url: pickImage(recipe.cover_url) || pickRecipeImage(recipe.id, recipe.image_url),
    cook_time: recipe.cook_time || recipe.total_time || recipe.prep_time || 0,
    description: recipe.description || adultVersion?.description || '',
    ingredients: adultIngredients,
    adult_version: adultVersion,
    recommendation_explain: Array.isArray(recipe.recommendation_explain) ? recipe.recommendation_explain : [],
    ranking_reasons: Array.isArray(recipe.ranking_reasons) ? recipe.ranking_reasons : [],
    is_favorited: Boolean(recipe.is_favorited),
  };

  if (babyVersion) {
    adapted.baby_version = {
      ...babyVersion,
      title: babyVersion.name || `${adapted.title}（宝宝版）`,
      cover_url: pickImage(babyVersion.cover_url) || pickImage(babyVersion.image_url) || adapted.cover_url,
      description: babyVersion.description || '',
      age_range: babyVersion.age_range || babyVersion.ageRange || '',
      tips: babyVersion.tips || babyVersion.nutrition_tips || '',
      ingredients: normalizeIngredients(babyVersion.ingredients),
    };
  }

  return adapted;
}

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

Page({
  data: {
    loading: false,
    swapping: false,
    error: null,
    recommendation: null,
    currentVersion: 'adult',
    userPreferences: null,
    preferenceSummaryText: '',
    recommendationReasons: [],
    isFavorited: false,
    recentRecommendationIds: [],
    actionFeedback: null,
    quotaCards: [],
    memberSummary: {
      isMember: false,
      title: '登录后同步成长会员权益',
      subtitle: '小程序先做轻决策，App 解锁完整家庭管理体验',
    },
    membershipBanner: { title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' },
    homeHeroCover: '',
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
    }, 3000);
  },

  pushRecentRecommendationId(recipeId, reset = false) {
    if (!recipeId) {
      if (reset) {
        this.setData({ recentRecommendationIds: [] });
      }
      return;
    }

    const baseList = reset ? [] : (Array.isArray(this.data.recentRecommendationIds) ? this.data.recentRecommendationIds : []);
    const nextList = [recipeId, ...baseList.filter((item) => item !== recipeId)].slice(0, 6);
    this.setData({ recentRecommendationIds: nextList });
  },

  clearFeedbackTimer() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  },

  async onShow() {
    this.setData({ homeHeroCover: resolveMediaUrl('/media/generated/covers/onedish-family-cover.jpg') });
    await this.ensureUserPreferences();
    await this.loadBillingSnapshot();
    await this.loadTodayRecommendation();
  },

  onHide() {
    this.clearFeedbackTimer();
    this.setData({ actionFeedback: null });
  },

  onUnload() {
    this.clearFeedbackTimer();
  },

  updateMembershipBanner() {
    const { memberSummary, quotaCards, preferenceSummaryText } = this.data;
    this.setData({
      membershipBanner: buildBannerModel({
        title: memberSummary.title,
        subtitle: memberSummary.subtitle,
        badgeText: preferenceSummaryText || '今日偏好已生效',
        actionText: memberSummary.isMember ? '查看权益' : '去开通',
        quotaCards,
        footerText: '同一成长会员账号，小程序轻量用，App 可继续体验完整家庭管理。',
        theme: memberSummary.isMember ? 'member' : 'neutral',
      }),
    });
  },

  async ensureUserPreferences() {
    const token = wx.getStorageSync('token');
    const cached = wx.getStorageSync('user_preferences');

    if (!token) {
      this.setData({
        userPreferences: cached || null,
        preferenceSummaryText: buildPreferenceSummary(cached || null),
      });
      this.updateMembershipBanner();
      return cached || null;
    }

    if (this.data.userPreferences) {
      return this.data.userPreferences;
    }

    try {
      const config = await api.getUserPreferences();
      this.setData({
        userPreferences: config,
        preferenceSummaryText: buildPreferenceSummary(config),
      });
      this.updateMembershipBanner();
      return config;
    } catch (_err) {
      this.setData({
        userPreferences: cached || null,
        preferenceSummaryText: buildPreferenceSummary(cached || null),
      });
      this.updateMembershipBanner();
      return cached || null;
    }
  },

  async loadBillingSnapshot() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({
        quotaCards: [],
        memberSummary: buildMemberSummary(null),
      });
      this.updateMembershipBanner();
      return;
    }

    try {
      const summary = await api.getBillingSummary('miniprogram');
      this.setData({
        quotaCards: buildQuotaCards(summary, ['ai_baby_recipe', 'weekly_plan_from_prompt', 'smart_recommendation']),
        memberSummary: buildMemberSummary(summary),
      });
      this.updateMembershipBanner();
    } catch (_err) {
      this.setData({
        quotaCards: [],
        memberSummary: buildMemberSummary(null),
      });
      this.updateMembershipBanner();
    }
  },

  async syncFavoriteState(recipe) {
    if (!recipe?.id) return false;

    const token = wx.getStorageSync('token');
    if (!token) {
      return isLocallyFavorited(recipe.id);
    }

    if (typeof recipe.is_favorited === 'boolean') {
      return recipe.is_favorited;
    }

    try {
      const result = await api.checkFavorite(recipe.id);
      return Boolean(result?.is_favorited);
    } catch (_err) {
      return false;
    }
  },

  async applyRecommendation(recipe, options = {}) {
    const adaptedRecipe = adaptRecipeData(recipe);
    if (!adaptedRecipe?.id) {
      this.setData({
        recommendation: null,
        recommendationReasons: [],
        isFavorited: false,
      });
      if (options.resetHistory) {
        this.setData({ recentRecommendationIds: [] });
      }
      return;
    }

    const isFavorited = await this.syncFavoriteState(adaptedRecipe);
    this.pushRecentRecommendationId(adaptedRecipe.id, Boolean(options.resetHistory));

    this.setData({
      recommendation: {
        ...adaptedRecipe,
        is_favorited: isFavorited,
      },
      currentVersion: adaptedRecipe?.baby_version ? 'adult' : 'adult',
      recommendationReasons: buildProductizedReasons(adaptedRecipe, this.data.preferenceSummaryText),
      isFavorited,
    });
  },

  async loadTodayRecommendation() {
    this.setData({ loading: true, error: null });

    try {
      const data = await api.getTodayRecommendation();
      await this.applyRecommendation(data?.recipe || null, { resetHistory: true });
      this.setData({ loading: false });
    } catch (err) {
      console.error('[home] getTodayRecommendation failed:', err);
      this.setData({
        error: '今日推荐加载失败，请检查网络后重试',
        loading: false,
      });
    }
  },

  switchVersion(e) {
    const version = e.currentTarget.dataset.version;
    this.setData({ currentVersion: version });
  },

  async onSwap() {
    if (this.data.swapping) return;

    const currentId = this.data.recommendation?.id;
    const excludeRecipeIds = Array.isArray(this.data.recentRecommendationIds)
      ? this.data.recentRecommendationIds.filter(Boolean)
      : [];
    await this.ensureUserPreferences();
    this.setData({ swapping: true });

    try {
      const next = await api.swapRecommendation(currentId, { excludeRecipeIds });
      if (!next) {
        wx.showToast({ title: '暂时没有更合适的替换菜谱', icon: 'none' });
        return;
      }

      await this.applyRecommendation(next);
      this.setActionFeedback('已换成一条新的今日推荐，卡片内容已经整体更新。', 'success');
      wx.showToast({ title: '已为你换一道', icon: 'success' });
    } catch (err) {
      console.error('[home] swap failed:', err);
      wx.showToast({ title: '换菜失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ swapping: false });
    }
  },

  async onFavorite() {
    const recipe = this.data.recommendation;
    if (!recipe?.id) return;

    const token = wx.getStorageSync('token');
    const nextFavorited = !this.data.isFavorited;

    try {
      if (token) {
        if (nextFavorited) {
          await api.addFavorite(recipe.id);
        } else {
          await api.removeFavorite(recipe.id);
        }
      } else {
        persistLocalFavorite(recipe, nextFavorited);
      }

      this.setData({
        isFavorited: nextFavorited,
        recommendation: {
          ...this.data.recommendation,
          is_favorited: nextFavorited,
        },
      });
      this.setActionFeedback(
        nextFavorited ? '这道推荐已加入收藏，后续可在收藏页快速找回。' : '已从收藏中移除，不会再保留在收藏页。',
        'success'
      );

      wx.showToast({
        title: nextFavorited ? '已加入收藏' : '已取消收藏',
        icon: 'success',
      });
    } catch (err) {
      console.error('[home] favorite failed:', err);
      wx.showToast({
        title: nextFavorited ? '收藏失败' : '取消收藏失败',
        icon: 'none',
      });
    }
  },

  goRecipe() {
    const recipeId = this.data.recommendation?.id;
    if (!recipeId) {
      wx.switchTab({ url: '/pages/recipe/recipe' });
      return;
    }

    openRecipeDetail(recipeId);
  },

  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  goToPlan() {
    trackEvent('mp_weekly_plan_entry_tap', { source: 'home_shortcut' });
    wx.switchTab({ url: '/pages/plan/plan' });
  },

  goToMembership() {
    trackEvent('mp_membership_tap', { source: 'home_banner' });
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  goToFavorites() {
    wx.switchTab({ url: '/pages/favorites/favorites' });
  },

  goToBabyRewrite() {
    trackEvent('mp_baby_rewrite_entry_tap', { source: 'home_shortcut' });
    if (this.data.recommendation?.id) {
      this.setActionFeedback('已帮你打开当前推荐菜谱，进入后可直接点“宝宝改写”。', 'info');
      openRecipeDetail(this.data.recommendation.id);
      return;
    }

    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  buildPendingPlanExecution,

  addToPlan() {
    const payload = this.buildPendingPlanExecution(this.data.recommendation);
    if (!payload) {
      wx.showToast({ title: '当前暂无可安排的推荐', icon: 'none' });
      return;
    }

    wx.setStorageSync(PENDING_PLAN_EXECUTION_KEY, payload);
    trackEvent('mp_home_add_to_plan_tap', {
      source: payload.source,
      meal_type: payload.slot.mealType,
      recipe_id: payload.recipe.id,
    });
    this.setActionFeedback('已安排到今天晚餐，正在带你查看计划。', 'success');
    wx.showToast({ title: '已加入今天晚餐', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/plan/plan' });
    }, 350);
  },

  addToShoppingListFallback() {
    const recipe = this.data.recommendation;
    if (!recipe) return;

    const ingredients = this.data.currentVersion === 'baby'
      ? recipe.baby_version?.ingredients
      : recipe.ingredients;

    if (!ingredients || !ingredients.length) {
      wx.showToast({ title: '当前菜谱暂无食材信息', icon: 'none' });
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
    this.setActionFeedback('已转到采购清单页，并把当前菜谱食材作为待购项带过去。', 'success');
    wx.showToast({ title: '已加入待购清单', icon: 'success' });
  },

  async addToShoppingList() {
    const recipe = this.data.recommendation;
    if (!recipe) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      this.addToShoppingListFallback();
      return;
    }

    try {
      await api.addRecipeToShoppingList({ recipeId: recipe.id });
      this.setActionFeedback('已加入云端采购清单，进入采购页后可继续勾选、分享和同步。', 'success');
      wx.showToast({ title: '已加入云端采购清单', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/plan/plan' });
      }, 400);
    } catch (err) {
      console.error('[home] add recipe to shopping list failed:', err);
      this.addToShoppingListFallback();
    }
  },

  onShare() {
    wx.showToast({ title: '可通过右上角直接分享推荐', icon: 'none' });
  },

  onShareAppMessage() {
    const { recommendation } = this.data;
    return {
      title: recommendation?.title ? `${recommendation.title} - 简家厨今日推荐` : '简家厨 - 一鱼两吃宝宝辅食',
      path: '/pages/home/home',
    };
  },

  onShareTimeline() {
    return {
      title: '简家厨 - 一鱼两吃宝宝辅食',
    };
  },
});
