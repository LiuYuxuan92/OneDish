const api = require('../../utils/api');
const cache = require('../../utils/cache');

const CACHE_KEY_RECIPES = 'recipes_list';
const RECIPE_DETAIL_PENDING_KEY = 'pending_recipe_detail_id';

// 后端数据适配器
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

function adaptRecipeData(recipe) {
  if (!recipe) return null;

  const adultVersion = parsePossibleJson(recipe.adult_version) || {};
  const babyVersion = parsePossibleJson(recipe.baby_version) || null;
  const rootIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const adultIngredients = Array.isArray(adultVersion.ingredients) ? adultVersion.ingredients : rootIngredients;

  const adapted = {
    ...recipe,
    image_url: normalizeImageList(recipe.image_url),
    title: recipe.name || recipe.title,
    cover_url: recipe.cover_url || normalizeImageList(recipe.image_url)[0] || '',
    cook_time: recipe.cook_time || recipe.total_time || recipe.prep_time || 0,
    adult_version: adultVersion,
    ingredients: adultIngredients,
    description: recipe.description || adultVersion.description || '',
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
  return items.map(item => adaptRecipeData(item));
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
    // AI 宝宝版本相关
    showAIGenerateModal: false,
    showAIResultModal: false,
    selectedBabyAge: 12,
    generateUseAI: true,
    isGenerating: false,
    aiResult: null,
    feedingAcceptedLevel: 'like',
    feedingAllergyFlag: false,
    feedingNote: '',
    recentFeedingFeedbacks: []
  },

  onShow() {
    this.checkNetworkStatus();
    this.loadRecipes();
    this.consumePendingRecipeDetail();
  },

  async checkNetworkStatus() {
    const isOnline = await cache.checkNetworkStatus();
    this.setData({ isOffline: !isOnline });
  },

  consumePendingRecipeDetail() {
    const pendingId = wx.getStorageSync(RECIPE_DETAIL_PENDING_KEY);
    if (!pendingId) return;

    wx.removeStorageSync(RECIPE_DETAIL_PENDING_KEY);
    this.openRecipeDetail(pendingId);
  },

  async openRecipeDetail(id) {
    if (!id) return;

    try {
      const detail = await api.getRecipeDetail(id);
      const adaptedDetail = adaptRecipeData(detail);
      this.setData({ detail: adaptedDetail });
      this.loadRecentFeedingFeedbacks(id);
      cache.setCache(`recipe_${id}`, adaptedDetail);
    } catch (err) {
      const cached = cache.getCache(`recipe_${id}`);
      if (cached) {
        this.setData({ detail: cached });
        wx.showToast({ title: '网络不可用，显示缓存', icon: 'none' });
      } else {
        console.error('[recipe] open detail failed:', err);
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      }
    }
  },

  async loadRecipes(refresh = false) {
    const page = refresh ? 1 : this.data.page;
    
    // 尝试从缓存加载
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
      // 使用适配器转换列表数据
      const adaptedRecipes = adaptListData(newRecipes);
      
      // 缓存第一页
      if (page === 1) {
        cache.setCache(CACHE_KEY_RECIPES, adaptedRecipes);
      }

      const recipes = page === 1 ? adaptedRecipes : [...this.data.recipes, ...adaptedRecipes];
      
      this.setData({
        recipes,
        page: page + 1,
        hasMore: newRecipes.length > 0,
        loading: false,
        isOffline: false
      });
    } catch (err) {
      console.error('[recipe] load list failed:', err);
      
      // 加载失败，尝试使用缓存
      if (!this.data.recipes.length) {
        const cached = cache.getCache(CACHE_KEY_RECIPES);
        if (cached && cached.length) {
          this.setData({
            recipes: cached,
            loading: false,
            isOffline: true
          });
          wx.showToast({ title: '网络不可用，显示缓存', icon: 'none' });
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

    try {
      await api.createFeedingFeedback({
        recipe_id: detail.id,
        accepted_level: feedingAcceptedLevel,
        allergy_flag: feedingAllergyFlag,
        note: feedingNote,
      });
      wx.showToast({ title: '反馈已记录', icon: 'success' });
      this.setData({ feedingNote: '' });
      this.loadRecentFeedingFeedbacks(detail.id);
    } catch (err) {
      console.error('[recipe] submit feeding feedback failed:', err);
      wx.showToast({ title: '反馈失败', icon: 'none' });
    }
  },

  closeDetail() {
    this.setData({ detail: null });
  },

  preventClose() {
    // 阻止关闭
  },

  addToListFromDetail() {
    const { detail } = this.data;
    if (!detail) return;
    
    const ingredients = detail.ingredients || [];
    if (!ingredients.length) {
      wx.showToast({ title: '暂无食材', icon: 'none' });
      return;
    }

    const items = (ingredients || []).map(i => ({
      name: i.name || i,
      quantity: i.quantity || '',
      unit: i.unit || '',
      checked: false
    }));

    wx.setStorageSync('pending_import', items);
    wx.switchTab({ url: '/pages/plan/plan' });
    wx.showToast({ title: '已添加到清单', icon: 'success' });
  },

  // 预加载图片
  onImageLoad(e) {
    // 可以在这里添加图片加载完成处理
  },

  onSharePlaceholder() {
    wx.showModal({
      title: '共享能力预留',
      content: 'MVP 阶段仅提供入口占位。',
      showCancel: false
    });
  },

  onShareTimeline() {
    const { detail } = this.data;
    return {
      title: detail?.title ? `${detail.title} - 简家厨` : '简家厨 - 一鱼两吃宝宝辅食',
      query: detail ? `id=${detail.id}` : ''
    };
  },

  // ========== AI 宝宝版本生成 ==========
  openAIGenerateModal() {
    this.setData({ showAIGenerateModal: true });
  },

  closeAIGenerateModal() {
    this.setData({ 
      showAIGenerateModal: false,
      aiResult: null,
    feedingAcceptedLevel: 'like',
    feedingAllergyFlag: false,
    feedingNote: '',
    recentFeedingFeedbacks: []
    });
  },

  onBabyAgeSelect(e) {
    const age = parseInt(e.currentTarget.dataset.age);
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
      
      this.setData({ 
        aiResult: result,
        isGenerating: false,
        showAIGenerateModal: false,
        showAIResultModal: true
      });

      wx.showToast({ title: '生成成功', icon: 'success' });
    } catch (err) {
      console.error('[recipe] generate AI baby version failed:', err);
      this.setData({ isGenerating: false });
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  closeAIResultModal() {
    this.setData({ showAIResultModal: false, aiResult: null });
  }
});
