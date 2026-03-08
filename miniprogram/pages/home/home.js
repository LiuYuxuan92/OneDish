const api = require('../../utils/api');

const RECIPE_DETAIL_PENDING_KEY = 'pending_recipe_detail_id';

function buildPreferenceSummary(config) {
  if (!config) return '';

  const parts = [];
  if (config.default_baby_age) parts.push(`${config.default_baby_age}个月月龄`);
  if (config.prefer_ingredients) parts.push(`偏爱${config.prefer_ingredients}`);
  if (config.exclude_ingredients) parts.push(`避开${config.exclude_ingredients}`);
  if (config.cooking_time_limit) parts.push(`${config.cooking_time_limit}分钟内优先`);
  return parts.slice(0, 3).join('｜');
}

function buildProductizedReasons(recipe, preferenceSummaryText) {
  const explain = Array.isArray(recipe?.recommendation_explain) ? recipe.recommendation_explain.filter(Boolean) : [];
  const rankingReasons = Array.isArray(recipe?.ranking_reasons) ? recipe.ranking_reasons : [];
  const polished = [];

  rankingReasons.forEach((reason) => {
    const code = String(reason?.code || '').trim();
    const detail = String(reason?.detail || '').trim();
    if (code === 'time') polished.push(detail ? `更贴合今天的下厨节奏（${detail}）` : '更贴合今天的下厨节奏');
    if (code === 'baby') polished.push(detail ? `更照顾当前月龄阶段（${detail}）` : '更照顾当前月龄阶段');
    if (code === 'preference') polished.push(detail ? `更接近你常做常买的口味（${detail}）` : '更接近你家的口味偏好');
    if (code === 'difficulty') polished.push(detail ? `操作负担更刚好（${detail}）` : '操作负担更刚好');
  });

  explain.forEach((item) => polished.push(String(item).trim()));

  const uniq = Array.from(new Set(polished.filter(Boolean)));
  if (uniq.length) return uniq.slice(0, 2);
  if (preferenceSummaryText) return [`已结合你的偏好设置：${preferenceSummaryText}`];
  return [];
}

// 后端数据适配器 - 将后端返回的数据转成前端期望的格式
function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const recommendationExplain = Array.isArray(recipe.recommendation_explain)
    ? recipe.recommendation_explain.filter(Boolean)
    : [];
  const rankingReasons = Array.isArray(recipe.ranking_reasons)
    ? recipe.ranking_reasons
    : [];
  
  const adapted = {
    ...recipe,
    // 字段名映射
    title: recipe.name || recipe.title,
    cover_url: recipe.image_url || recipe.cover_url,
    cook_time: recipe.cook_time || recipe.total_time,
    recommendation_explain: recommendationExplain,
    ranking_reasons: rankingReasons,
    preference_tip: recommendationExplain[0] || rankingReasons[0]?.detail || rankingReasons[0]?.label || '',
    
    // 成人版数据
    ingredients: recipe.adult_version?.ingredients || recipe.ingredients || [],
    description: recipe.description || '',
  };
  
  // 处理宝宝版数据
  if (recipe.baby_version) {
    adapted.baby_version = {
      ...recipe.baby_version,
      title: recipe.baby_version.name || (recipe.name ? `${recipe.name}（宝宝版）` : ''),
      description: recipe.baby_version.description || '',
      age_range: recipe.baby_version.age_range || recipe.baby_version.ageRange || '',
      tips: recipe.baby_version.tips || recipe.baby_version.nutrition_tips || '',
      ingredients: recipe.baby_version.ingredients || [],
    };
  }
  
  return adapted;
}

Page({

  async ensureUserPreferences() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ userPreferences: null, preferenceSummaryText: '' });
      return null;
    }

    if (this.data.userPreferences) {
      return this.data.userPreferences;
    }

    try {
      const config = await api.getUserPreferences();
      const summary = buildPreferenceSummary(config);
      this.setData({ userPreferences: config, preferenceSummaryText: summary });
      return config;
    } catch (err) {
      console.log('[home] load user preferences failed:', err);
      return null;
    }
  },

  data: {
    loading: false,
    swapping: false,
    error: null,
    recommendation: null,
    currentVersion: 'adult', // adult | baby
    userPreferences: null,
    preferenceSummaryText: '',
    recommendationReasons: []
  },

  async onShow() {
    await this.ensureUserPreferences();
    this.loadTodayRecommendation();
  },

  async loadTodayRecommendation() {
    this.setData({ loading: true, error: null });
    try {
      const data = await api.getTodayRecommendation();
      const recipe = data?.recipe || null;
      // 使用适配器转换数据格式
      const adaptedRecipe = adaptRecipeData(recipe);
      this.setData({ 
        recommendation: adaptedRecipe,
        currentVersion: adaptedRecipe?.baby_version ? 'adult' : 'adult',
        recommendationReasons: buildProductizedReasons(adaptedRecipe, this.data.preferenceSummaryText),
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

  // 切换成人/宝宝版本
  switchVersion(e) {
    const version = e.currentTarget.dataset.version;
    this.setData({ currentVersion: version });
  },

  async onSwap() {
    if (this.data.swapping) return;
    
    const currentId = this.data.recommendation?.id;
    await this.ensureUserPreferences();
    this.setData({ swapping: true });
    
    try {
      const next = await api.swapRecommendation(currentId);
      if (!next) {
        wx.showToast({ title: '暂无可替换菜谱', icon: 'none' });
        return;
      }
      // 使用适配器转换数据格式
      const adaptedNext = adaptRecipeData(next);
      this.setData({ 
        recommendation: adaptedNext,
        currentVersion: adaptedNext?.baby_version ? 'adult' : 'adult',
        recommendationReasons: buildProductizedReasons(adaptedNext, this.data.preferenceSummaryText)
      });
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
    const recipeId = this.data.recommendation?.id;
    if (!recipeId) {
      wx.switchTab({ url: '/pages/recipe/recipe' });
      return;
    }

    // recipe 是 tabBar 页面，不能 navigateTo，改为 switchTab + storage 透传目标详情
    wx.setStorageSync(RECIPE_DETAIL_PENDING_KEY, recipeId);
    wx.switchTab({
      url: '/pages/recipe/recipe',
      success: () => {
        wx.showToast({ title: '正在打开菜谱', icon: 'none' });
      }
    });
  },

  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  // 加入购物清单
  addToShoppingList() {
    const recipe = this.data.recommendation;
    if (!recipe) return;

    const version = this.data.currentVersion;
    const ingredients = version === 'baby' 
      ? recipe.baby_version?.ingredients 
      : recipe.ingredients;
    
    if (!ingredients || ingredients.length === 0) {
      wx.showToast({ title: '暂无食材信息', icon: 'none' });
      return;
    }

    // 跳转到清单页并传递食材
    const items = ingredients.map(i => ({
      name: i.name || i,
      quantity: i.quantity || '',
      unit: i.unit || '',
      checked: false
    }));
    
    wx.setStorageSync('pending_import', items);
    wx.switchTab({ url: '/pages/plan/plan' });
    wx.showToast({ title: '已添加到清单', icon: 'success' });
  },

  onShare() {
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
  },

  onShareAppMessage() {
    const { recommendation } = this.data;
    return {
      title: recommendation?.title ? `${recommendation.title} - 简家厨` : '简家厨 - 一鱼两吃',
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    return {
      title: '简家厨 - 一鱼两吃宝宝辅食'
    };
  }
});
