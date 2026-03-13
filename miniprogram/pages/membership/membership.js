const api = require('../../utils/api');
const { getBaseURL } = require('../../utils/config');
const { trackEvent } = require('../../utils/analytics');

const PLATFORM = 'miniprogram';

const CATEGORY_LABELS = {
  core_ai: '本端可用核心能力',
  sync: '跨端同步权益',
  inventory: 'App 完整体验',
  insight: 'App 完整体验',
  family: 'App 完整体验',
  cooking: 'App 完整体验',
};

const CATEGORY_ORDER = ['core_ai', 'sync', 'inventory', 'insight', 'family', 'cooking'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function mapFeatureTag(item) {
  if (item.access_policy === 'member_quota') return '次数权益';
  if (item.platform_experience?.miniprogram === 'upsell') return 'App 专享';
  if (item.access_policy === 'member') return '会员权益';
  return '免费';
}

function buildFeatureGroups(features = []) {
  const groupMap = new Map();

  features.forEach((item) => {
    const category = item.category || 'core_ai';
    const nextItem = {
      ...item,
      isUpsell: item.platform_experience?.miniprogram === 'upsell',
      experienceLabel: item.platform_experience?.miniprogram === 'lite'
        ? '小程序可轻量使用'
        : item.platform_experience?.miniprogram === 'upsell'
          ? 'App 可体验完整能力'
          : '当前端可直接使用',
      tagLabel: mapFeatureTag(item),
    };

    if (!groupMap.has(category)) {
      groupMap.set(category, []);
    }
    groupMap.get(category).push(nextItem);
  });

  return CATEGORY_ORDER
    .filter((key) => groupMap.has(key))
    .map((key) => ({
      key,
      title: CATEGORY_LABELS[key] || '会员权益',
      items: groupMap.get(key),
    }));
}

function findDefaultProduct(products = []) {
  return products.find((item) => item.code === 'growth_monthly_1990') || products[0] || null;
}

function buildProductCards(products = []) {
  return products.map((item) => ({
    ...item,
    isRecommended: item.code === 'growth_quarterly_4900',
    billingLabel: item.type === 'membership'
      ? (item.duration_days >= 90 ? '约 3 个月权益' : '30 天权益')
      : '按次补充包',
    quotaHighlights: Array.isArray(item.quotas)
      ? item.quotas.map((quota) => `${quota.display_name} ${quota.total_quota}次`).slice(0, 3)
      : [],
  }));
}

function buildQuotaCards(summary) {
  const quotaSummary = Array.isArray(summary?.quota_summary) ? summary.quota_summary : [];
  return quotaSummary.map((item) => ({
    featureCode: item.feature_code,
    title: item.feature_code === 'ai_baby_recipe'
      ? '宝宝版 AI 改写'
      : item.feature_code === 'weekly_plan_from_prompt'
        ? '自然语言周计划'
        : item.feature_code === 'smart_recommendation'
          ? '智能推荐 / 换菜'
          : item.feature_code,
    remainingText: `${item.remaining_quota}/${item.total_quota}`,
    detailText: item.reset_modes?.includes('period') ? '会员周期内可用' : '按包消耗',
  }));
}

function shouldShowDevTools() {
  const baseURL = String(getBaseURL() || '');
  return !baseURL || !baseURL.includes('api.jianjiachu.com');
}

Page({
  data: {
    isMember: false,
    expireDate: '',
    memberLevel: 'free',
    loading: false,
    isLoggedIn: false,
    selectedProduct: null,
    products: [],
    featureGroups: [],
    featureMatrix: [],
    quotaCards: [],
    recentOrders: [],
    isDevToolsVisible: false,
    devActionLoading: false,
  },

  onLoad() {
    this.loadPageData();
  },

  onShow() {
    this.loadPageData();
  },

  async loadPageData() {
    const token = wx.getStorageSync('token');
    this.setData({ loading: true, isLoggedIn: Boolean(token), isDevToolsVisible: shouldShowDevTools() });

    try {
      const [products, featureMatrix] = await Promise.all([
        api.getBillingProducts(),
        api.getBillingFeatureMatrix(PLATFORM),
      ]);

      const safeProducts = Array.isArray(products) ? products : [];
      const safeFeatureMatrix = Array.isArray(featureMatrix) ? featureMatrix : [];
      const productCards = buildProductCards(safeProducts);
      const selectedProduct = findDefaultProduct(productCards);
      const nextState = {
        selectedProduct,
        products: productCards,
        featureMatrix: safeFeatureMatrix,
        featureGroups: buildFeatureGroups(safeFeatureMatrix),
      };

      if (!token) {
        this.setData({
          ...nextState,
          isMember: false,
          expireDate: '',
          quotaCards: [],
          recentOrders: [],
          loading: false,
        });
        return;
      }

      const summary = await api.getBillingSummary(PLATFORM);
      const entitlements = Array.isArray(summary?.active_entitlements) ? summary.active_entitlements : [];
      const activeMember = entitlements[0] || null;

      this.setData({
        ...nextState,
        isMember: Boolean(activeMember),
        memberLevel: activeMember ? 'growth' : 'free',
        expireDate: activeMember ? formatDate(activeMember.ends_at) : '',
        quotaCards: buildQuotaCards(summary),
        recentOrders: Array.isArray(summary?.recent_orders) ? summary.recent_orders.slice(0, 3) : [],
        loading: false,
      });
    } catch (err) {
      console.error('[membership] load page data failed:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '会员信息加载失败', icon: 'none' });
    }
  },

  openMember() {
    trackEvent('mp_membership_purchase_intent', {
      product_code: this.data.selectedProduct?.code || '',
      source: 'membership_hero',
    });
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能开通成长会员，并在小程序与 App 同步使用。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    const product = this.data.selectedProduct;
    wx.showModal({
      title: product ? product.name : '开通成长会员',
      content: product
        ? `当前支付链路仍在接入中，后端权益中心已可用。\n\n推荐档位：¥${product.price_yuan}`
        : '当前支付链路仍在接入中，后端权益中心已可用。',
      confirmText: '知道了',
      showCancel: false,
    });
  },

  renewMember() {
    this.openMember();
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goToHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  goToPlan() {
    wx.switchTab({ url: '/pages/plan/plan' });
  },

  goToRecipe() {
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  selectProduct(e) {
    const code = e.currentTarget.dataset.code;
    const selectedProduct = (this.data.products || []).find((item) => item.code === code) || null;
    if (!selectedProduct) return;
    this.setData({ selectedProduct });
    trackEvent('mp_membership_product_select', { product_code: code, source: 'membership_compare' });
  },

  async runDevAction(action, successText) {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }

    this.setData({ devActionLoading: true });
    try {
      await action();
      await this.loadPageData();
      wx.showToast({ title: successText, icon: 'success' });
    } catch (err) {
      console.error('[membership] dev action failed:', err);
      wx.showToast({ title: err.message || '测试操作失败', icon: 'none' });
    } finally {
      this.setData({ devActionLoading: false });
    }
  },

  grantDevMonthly() {
    this.runDevAction(() => api.devGrantBillingProduct('growth_monthly_1990'), '已发放月卡');
  },

  grantDevQuarterly() {
    this.runDevAction(() => api.devGrantBillingProduct('growth_quarterly_4900'), '已发放季卡');
  },

  grantDevAIPack() {
    this.runDevAction(() => api.devGrantBillingProduct('ai_baby_pack_20_990'), '已发放 AI 包');
  },

  resetDevQuotas() {
    this.runDevAction(
      () => api.devResetBillingQuotas(['ai_baby_recipe', 'weekly_plan_from_prompt', 'smart_recommendation']),
      '已重置测试额度'
    );
  },

  clearDevBenefits() {
    wx.showModal({
      title: '清空测试权益？',
      content: '会将当前账号的会员与测试额度全部置为失效，便于重新走开通流程。',
      success: (res) => {
        if (!res.confirm) return;
        this.runDevAction(() => api.devClearBillingBenefits(), '已清空测试权益');
      },
    });
  },

  onShareAppMessage() {
    return {
      title: '简家厨成长会员：小程序轻用，App 解锁完整体验',
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    return {
      title: '同一成长会员，小程序和 App 都能用',
      query: ''
    };
  }
});
