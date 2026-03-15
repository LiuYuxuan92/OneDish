const api = require('../../utils/api');
const { getBaseURL, getToken, setBaseURL, setToken } = require('../../utils/config');
const { trackEvent } = require('../../utils/analytics');
const { buildQuotaCard, buildBannerModel, handleQuotaUpgradeError } = require('../../utils/entitlements');

const LOCAL_KEY = 'plan_local_items';
const HISTORY_KEY = 'plan_history';

function getPreferenceSummary() {
  const config = wx.getStorageSync('user_preferences') || null;
  if (!config) return '';

  return [
    config.default_baby_age ? `${config.default_baby_age}个月` : '',
    config.cooking_time_limit ? `${config.cooking_time_limit}分钟内` : '',
    config.exclude_ingredients ? `避开 ${config.exclude_ingredients}` : '',
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
}

function dedupeItems(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.name || ''}::${item.quantity || item.amount || ''}::${item.unit || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeImportedItems(items = []) {
  return dedupeItems(
    items.map((item) => ({
      name: item.name || '',
      quantity: item.quantity || item.amount || '',
      unit: item.unit || '',
      checked: Boolean(item.checked),
      source: 'local',
    }))
  ).filter((item) => item.name);
}

function buildStats(items = []) {
  const total = items.length;
  const checked = items.filter((item) => item.checked).length;
  return {
    total,
    checked,
    unchecked: Math.max(total - checked, 0),
  };
}

function formatListDate(value) {
  if (!value) return '未生成云端清单';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function buildLocalShareCode() {
  return `LOCAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatWeekday(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${WEEKDAY_LABELS[date.getDay()]} · ${date.getMonth() + 1}/${date.getDate()}`;
}

function buildGeneratedPlanPreview(result) {
  const plans = result?.plans || {};
  return Object.keys(plans)
    .sort()
    .map((date) => ({
      date,
      label: formatWeekday(date),
      meals: Object.keys(plans[date] || {}).map((mealType) => ({
        mealType,
        mealLabel: MEAL_LABELS[mealType] || mealType,
        name: plans[date]?.[mealType]?.name || '待补充',
        prepTime: plans[date]?.[mealType]?.prep_time || null,
      })),
    }))
    .filter((item) => item.meals.length);
}

function buildGeneratedPlanTags(result) {
  const constraints = result?.parsed_constraints || {};
  const tags = [];
  if (Array.isArray(constraints.prefer_ingredients) && constraints.prefer_ingredients.length) {
    tags.push(`偏好 ${constraints.prefer_ingredients.slice(0, 3).join('、')}`);
  }
  if (Array.isArray(constraints.exclude_ingredients) && constraints.exclude_ingredients.length) {
    tags.push(`避开 ${constraints.exclude_ingredients.slice(0, 3).join('、')}`);
  }
  if (constraints.max_prep_time) {
    tags.push(`${constraints.max_prep_time} 分钟内`);
  }
  if (constraints.mood) {
    tags.push(`风格 ${constraints.mood}`);
  }
  return tags;
}

Page({
  data: {
    loading: false,
    baseURL: '',
    token: '',
    items: [],
    history: [],
    newItem: '',
    activeTab: 'current',
    showShareModal: false,
    showDebug: false,
    inviteCode: '',
    shareLink: '',
    activeListId: '',
    activeListDate: '',
    listMode: 'local',
    planPreferenceSummary: '',
    shoppingSummary: null,
    stats: {
      total: 0,
      checked: 0,
      unchecked: 0,
    },
    showGenerateModal: false,
    isSmartMode: false,
    smartPrompt: '',
    babyAge: null,
    excludeIngredients: '',
    isGenerating: false,
    generatedMealPlan: null,
    generatedPlanPreviewDays: [],
    generatedPlanSummaryTags: [],
    actionFeedback: null,
    weeklyPlanQuotaCard: null,
    smartRecommendationQuotaCard: null,
    planBanner: { title: '', subtitle: '', badgeText: '', actionText: '', footerText: '', quotaCards: [], theme: 'neutral' },
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

  onShow() {
    this.consumePendingImport();

    const token = wx.getStorageSync('token') || getToken();
    const baseURL = wx.getStorageSync('baseURL') || getBaseURL();

    this.setData({
      token,
      baseURL,
      planPreferenceSummary: getPreferenceSummary(),
    });

    this.loadHistory();
    this.loadData();
    this.loadBillingSnapshot();
  },

  onHide() {
    this.clearFeedbackTimer();
    this.setData({
      actionFeedback: null,
      showShareModal: false,
      showDebug: false,
    });
  },

  onUnload() {
    this.clearFeedbackTimer();
  },

  consumePendingImport() {
    const pending = wx.getStorageSync('pending_import');
    if (!Array.isArray(pending) || !pending.length) return;

    this.importItems(pending);
    wx.removeStorageSync('pending_import');
  },

  toggleDebug() {
    this.setData({ showDebug: !this.data.showDebug });
  },

  updatePlanBanner() {
    const { weeklyPlanQuotaCard, smartRecommendationQuotaCard, planPreferenceSummary } = this.data;
    const quotaCards = [weeklyPlanQuotaCard, smartRecommendationQuotaCard].filter(Boolean);
    this.setData({
      planBanner: buildBannerModel({
        title: weeklyPlanQuotaCard ? '成长会员已接入计划生成' : '开通成长会员，周计划生成更稳定',
        subtitle: weeklyPlanQuotaCard
          ? `自然语言周计划剩余 ${weeklyPlanQuotaCard.value}`
          : '会员支持自然语言周计划、智能推荐和跨端同步。',
        badgeText: planPreferenceSummary || '会优先参考你的月龄、时长和忌口',
        actionText: weeklyPlanQuotaCard ? '看权益' : '去开通',
        footerText: '小程序先生成主线，App 内可继续编辑、复用模板和做更完整管理。',
        quotaCards,
        theme: weeklyPlanQuotaCard ? 'warm' : 'neutral',
      }),
    });
  },

  async loadBillingSnapshot() {
    const token = this.data.token || wx.getStorageSync('token');
    if (!token) {
      this.setData({
        weeklyPlanQuotaCard: null,
        smartRecommendationQuotaCard: null,
      });
      this.updatePlanBanner();
      return;
    }

    try {
      const summary = await api.getBillingSummary('miniprogram');
      this.setData({
        weeklyPlanQuotaCard: buildQuotaCard(summary, 'weekly_plan_from_prompt'),
        smartRecommendationQuotaCard: buildQuotaCard(summary, 'smart_recommendation'),
      });
      this.updatePlanBanner();
    } catch (_err) {
      this.setData({
        weeklyPlanQuotaCard: null,
        smartRecommendationQuotaCard: null,
      });
      this.updatePlanBanner();
    }
  },

  goToMembership() {
    trackEvent('mp_membership_tap', { source: 'plan_banner' });
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  goToRecipe() {
    trackEvent('mp_weekly_plan_recipe_tap', { source: 'plan_generate' });
    wx.switchTab({ url: '/pages/recipe/recipe' });
  },

  persistHistory(items) {
    if (!items.length) return;

    const history = wx.getStorageSync(HISTORY_KEY) || [];
    history.unshift({
      date: new Date().toLocaleDateString('zh-CN'),
      items,
    });

    wx.setStorageSync(HISTORY_KEY, history.slice(0, 10));
    this.setData({ history: history.slice(0, 10) });
  },

  importItems(items) {
    const imported = normalizeImportedItems(items);
    if (!imported.length) return;

    const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []);
    const merged = dedupeItems([...imported, ...local]);
    wx.setStorageSync(LOCAL_KEY, merged);
    this.setActionFeedback(`已导入 ${imported.length} 项到当前采购清单。`, 'success');
    wx.showToast({ title: `已导入 ${imported.length} 项`, icon: 'success' });
  },

  setItemsState(items, extra = {}) {
    this.setData({
      items,
      stats: buildStats(items),
      ...extra,
    });
  },

  onTabSwitch(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onBaseURLInput(e) {
    this.setData({ baseURL: e.detail.value });
  },

  onTokenInput(e) {
    this.setData({ token: e.detail.value });
  },

  onNewItemInput(e) {
    this.setData({ newItem: e.detail.value });
  },

  saveConfig() {
    const baseURL = String(this.data.baseURL || '').trim();
    const token = String(this.data.token || '').trim();

    setBaseURL(baseURL);
    setToken(token);
    wx.setStorageSync('baseURL', baseURL);
    wx.setStorageSync('token', token);
    wx.showToast({ title: '调试配置已保存', icon: 'success' });
  },

  async loadData() {
    const token = this.data.token || wx.getStorageSync('token');
    if (!token) {
      this.loadLocalData();
      return;
    }

    this.setData({ loading: true });

    try {
      const lists = await api.getShoppingLists();
      const serverLists = Array.isArray(lists?.items)
        ? lists.items
        : Array.isArray(lists)
          ? lists
          : [];
      const latest = serverLists[0];

      if (!latest) {
        this.loadLocalData();
        return;
      }

      const items = this.extractItemsFromList(latest);
      this.setItemsState(items, {
        loading: false,
        activeListId: latest.id,
        activeListDate: formatListDate(latest.list_date),
        listMode: 'server',
        shoppingSummary: latest.inventory_summary || null,
      });
    } catch (err) {
      console.error('[plan] load server shopping list failed:', err);
      this.loadLocalData();
    }
  },

  loadLocalData() {
    const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []).map((item) => ({
      ...item,
      source: 'local',
    }));

    this.setItemsState(local, {
      loading: false,
      activeListId: '',
      activeListDate: '',
      listMode: 'local',
      shoppingSummary: null,
    });
  },

  loadHistory() {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ history });
  },

  extractItemsFromList(list) {
    if (!list) return [];

    const buckets = list.items_v2 || list.items || {};
    const areas = ['produce', 'protein', 'staple', 'seasoning', 'snack_dairy', 'household', 'other', 'meat'];
    const results = [];
    const seen = new Set();

    areas.forEach((area) => {
      const items = Array.isArray(buckets[area]) ? buckets[area] : [];

      items.forEach((item) => {
        const name = item?.item_name || item?.name;
        if (!name) return;

        const normalized = {
          name,
          checked: Boolean(item?.checked || item?.status === 'done'),
          source: 'server',
          quantity: item?.amount || '',
          unit: item?.unit || '',
          area,
          ingredientId: item?.ingredient_id || name,
          sourceMealType: item?.source_meal_type || '',
        };

        const key = `${normalized.area}::${normalized.name}::${normalized.quantity}::${normalized.unit}`;
        if (seen.has(key)) return;
        seen.add(key);
        results.push(normalized);
      });
    });

    return results;
  },

  async addItem() {
    const name = String(this.data.newItem || '').trim();
    if (!name) return;

    if (this.data.listMode === 'server' && this.data.activeListId) {
      try {
        await api.addShoppingListItem(this.data.activeListId, {
          item_name: name,
          amount: '',
          area: 'other',
        });
        this.setData({ newItem: '' });
        await this.loadData();
        this.setActionFeedback(`已加入云端清单：${name}`, 'success');
        wx.showToast({ title: '已加入云端清单', icon: 'success' });
        return;
      } catch (err) {
        console.error('[plan] add server item failed:', err);
        wx.showToast({ title: '云端添加失败，已切回本地', icon: 'none' });
      }
    }

    const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []);
    local.unshift({
      name,
      quantity: '',
      unit: '',
      checked: false,
      source: 'local',
    });
    wx.setStorageSync(LOCAL_KEY, dedupeItems(local));
    this.setData({ newItem: '' });
    this.loadLocalData();
    this.setActionFeedback(`已加入本地清单：${name}`, 'success');
  },

  async toggleItem(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.items[index];
    if (!item) return;

    if (this.data.listMode === 'server' && this.data.activeListId && item.area) {
      try {
        await api.updateShoppingListItem(this.data.activeListId, {
          area: item.area,
          ingredient_id: item.ingredientId || item.name,
          checked: !item.checked,
        });
        await this.loadData();
        return;
      } catch (err) {
        console.error('[plan] toggle server item failed:', err);
        wx.showToast({ title: '勾选失败，请稍后重试', icon: 'none' });
        return;
      }
    }

    const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []);
    if (!local[index]) return;
    local[index].checked = !local[index].checked;
    wx.setStorageSync(LOCAL_KEY, local);
    this.loadLocalData();
  },

  async deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.items[index];
    if (!item) return;

    wx.showModal({
      title: '删除项目',
      content: `确定从清单中移除「${item.name}」吗？`,
      success: async (res) => {
        if (!res.confirm) return;

        if (this.data.listMode === 'server' && this.data.activeListId && item.area) {
          try {
            await api.removeShoppingListItem(this.data.activeListId, {
              area: item.area,
              item_name: item.name,
            });
            await this.loadData();
            return;
          } catch (err) {
            console.error('[plan] remove server item failed:', err);
            wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
            return;
          }
        }

        const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []);
        local.splice(index, 1);
        wx.setStorageSync(LOCAL_KEY, local);
        this.loadLocalData();
      },
    });
  },

  async clearChecked() {
    const checkedItems = this.data.items.filter((item) => item.checked);
    if (!checkedItems.length) {
      wx.showToast({ title: '当前没有已完成项', icon: 'none' });
      return;
    }

    this.persistHistory(checkedItems);

    if (this.data.listMode === 'server' && this.data.activeListId) {
      try {
        await Promise.all(
          checkedItems.map((item) =>
            api.removeShoppingListItem(this.data.activeListId, {
              area: item.area,
              item_name: item.name,
            })
          )
        );

        await this.loadData();
        this.setActionFeedback(`已清理 ${checkedItems.length} 项已购内容，并归档到历史记录。`, 'success');
        wx.showToast({ title: '已清理已购项目', icon: 'success' });
        return;
      } catch (err) {
        console.error('[plan] clear checked server items failed:', err);
        wx.showToast({ title: '清理失败，请稍后重试', icon: 'none' });
        return;
      }
    }

    const local = normalizeImportedItems(wx.getStorageSync(LOCAL_KEY) || []).filter((item) => !item.checked);
    wx.setStorageSync(LOCAL_KEY, local);
    this.loadLocalData();
    this.setActionFeedback(`已清理 ${checkedItems.length} 项已购内容，并归档到历史记录。`, 'success');
    wx.showToast({ title: '已清理已购项目', icon: 'success' });
  },

  async onShare() {
    if (this.data.listMode === 'server' && this.data.activeListId) {
      try {
        const share = await api.createShoppingListShareLink(this.data.activeListId);
        this.setData({
          showShareModal: true,
          inviteCode: share?.invite_code || '',
          shareLink: share?.share_link || '',
        });
        return;
      } catch (err) {
        console.error('[plan] create share link failed:', err);
      }
    }

    this.setData({
      showShareModal: true,
      inviteCode: buildLocalShareCode(),
      shareLink: '',
    });
  },

  closeShareModal() {
    this.setData({
      showShareModal: false,
      inviteCode: '',
      shareLink: '',
    });
  },

  copyInviteCode() {
    const text = this.data.shareLink || this.data.inviteCode;
    if (!text) return;

    wx.setClipboardData({
      data: text,
      success: () => {
        this.setActionFeedback('邀请码已复制，可直接发给家人一起查看当前清单。', 'success');
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },

  onShareAppMessage() {
    const { stats } = this.data;
    return {
      title: `简家厨采购清单（待买 ${stats.unchecked} 项）`,
      path: '/pages/plan/plan',
      query: 'fromShare=1',
    };
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onShareTimeline() {
    return {
      title: '简家厨采购清单',
    };
  },

  openGenerateModal() {
    this.setData({ showGenerateModal: true });
  },

  closeGenerateModal() {
    this.setData({
      showGenerateModal: false,
      isSmartMode: false,
      smartPrompt: '',
      babyAge: null,
      excludeIngredients: '',
      generatedMealPlan: null,
      generatedPlanPreviewDays: [],
      generatedPlanSummaryTags: [],
    });
  },

  toggleSmartMode() {
    this.setData({ isSmartMode: !this.data.isSmartMode });
  },

  onSmartPromptInput(e) {
    this.setData({ smartPrompt: e.detail.value });
  },

  onExcludeInput(e) {
    this.setData({ excludeIngredients: e.detail.value });
  },

  onBabyAgeSelect(e) {
    const rawAge = e.currentTarget.dataset.age;
    const babyAge = rawAge === '' || rawAge === undefined || rawAge === null
      ? null
      : Number(rawAge);
    this.setData({ babyAge });
  },

  async generateMealPlan() {
    const { isSmartMode, smartPrompt, babyAge, excludeIngredients } = this.data;

    if (isSmartMode && !String(smartPrompt || '').trim()) {
      wx.showToast({ title: '请输入想要的周计划描述', icon: 'none' });
      return;
    }

    trackEvent('mp_weekly_plan_generate_click', {
      mode: isSmartMode ? 'smart' : 'standard',
      has_prompt: Boolean(String(smartPrompt || '').trim()),
    });

    this.setData({ isGenerating: true });

    try {
      let prompt = smartPrompt;

      if (!isSmartMode) {
        const parts = [];
        if (babyAge) parts.push(`宝宝 ${babyAge} 个月`);
        if (excludeIngredients) parts.push(`排除 ${excludeIngredients}`);
        prompt = parts.length ? `${parts.join('，')} 的一周辅食计划` : '一周辅食计划';
      }

      const result = await api.generateMealPlanFromPrompt(prompt);
      const previewDays = buildGeneratedPlanPreview(result);
      const summaryTags = buildGeneratedPlanTags(result);
      this.setData({
        generatedMealPlan: result,
        generatedPlanPreviewDays: previewDays,
        generatedPlanSummaryTags: summaryTags,
        isGenerating: false,
      });
      this.loadBillingSnapshot();

      wx.showToast({ title: '周计划已生成', icon: 'success' });

      const importedCount = Array.isArray(result?.ingredients) ? result.ingredients.length : 0;

      if (importedCount) {
        this.importItems(
          result.ingredients.map((item) => ({
            name: item,
            checked: false,
          }))
        );
        this.loadLocalData();
        this.setActionFeedback(`周计划已生成，并已追加 ${importedCount} 项食材到当前采购清单。`, 'success');
        return;
      }

      this.setActionFeedback('周计划已生成，可直接点“查看概览”确认本周安排。', 'success');
    } catch (err) {
      console.error('[plan] generate meal plan failed:', err);
      this.setData({ isGenerating: false });
      if (handleQuotaUpgradeError(err, {
        featureCode: 'weekly_plan_from_prompt',
        source: 'plan_generate',
        onConfirm: () => this.goToMembership(),
      })) {
        return;
      }
      wx.showToast({ title: err.message || '生成失败，请稍后重试', icon: 'none' });
    }
  },

  viewGeneratedPlan() {
    const plan = this.data.generatedMealPlan;
    if (!plan) return;

    trackEvent('mp_weekly_plan_preview_tap', { source: 'plan_result_card' });

    const title = plan.title || '周计划';
    const description = [
      plan.summary || '',
      Array.isArray(plan.ingredients) && plan.ingredients.length ? `涉及食材：${plan.ingredients.slice(0, 10).join('、')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    wx.showModal({
      title,
      content: description || '周计划已生成，可继续完善需求后再次生成。',
      showCancel: false,
    });
  },
});
