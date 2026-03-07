const api = require('../../utils/api');
const { getBaseURL, getToken, setBaseURL, setToken } = require('../../utils/config');

const LOCAL_KEY = 'plan_local_items';
const HISTORY_KEY = 'plan_history';

Page({
  data: {
    baseURL: '',
    token: '',
    items: [],
    history: [],
    newItem: '',
    activeTab: 'current', // current | history | generate
    showShareModal: false,
    showDebug: false,
    inviteCode: '',
    // 智能生成相关
    showGenerateModal: false,
    isSmartMode: false,
    smartPrompt: '',
    babyAge: null,
    excludeIngredients: '',
    isGenerating: false,
    generatedMealPlan: null
  },

  onShow() {
    // 检查是否有待导入的食材
    const pending = wx.getStorageSync('pending_import');
    if (pending && pending.length > 0) {
      this.importItems(pending);
      wx.removeStorageSync('pending_import');
    }

    const token = wx.getStorageSync('token') || getToken();
    const baseURL = wx.getStorageSync('baseURL') || getBaseURL();
    this.setData({ baseURL, token });
    this.loadData();
    
    // 加载历史
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ history });
  },

  toggleDebug() {
    this.setData({ showDebug: !this.data.showDebug });
  },

  importItems(items) {
    const local = wx.getStorageSync(LOCAL_KEY) || [];
    const merged = [...items, ...local];
    wx.setStorageSync(LOCAL_KEY, merged);
    wx.showToast({ title: `已导入${items.length}项`, icon: 'success' });
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
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
    const baseURL = this.data.baseURL.trim();
    const token = this.data.token.trim();
    setBaseURL(baseURL);
    setToken(token);
    wx.setStorageSync('baseURL', baseURL);
    wx.setStorageSync('token', token);
    wx.showToast({ title: '配置已保存', icon: 'success' });
  },

  loadData() {
    const token = this.data.token || wx.getStorageSync('token');
    if (token) {
      api.getShoppingLists().then(lists => {
        const latest = Array.isArray(lists) ? lists[0] : null;
        const mergedItems = this.extractItemsFromList(latest).map(name => ({
          name,
          checked: false,
          source: 'API'
        }));
        this.setData({ items: mergedItems });
      }).catch(() => {
        this.loadLocalData();
      });
      return;
    }
    this.loadLocalData();
  },

  loadLocalData() {
    const local = wx.getStorageSync(LOCAL_KEY) || [];
    this.setData({ items: local.map(i => ({ ...i, source: 'LOCAL' })) });
  },

  loadHistory() {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ history });
  },

  extractItemsFromList(list) {
    if (!list) return [];
    const results = [];
    const appendByKey = (obj, key) => {
      if (!obj || !Array.isArray(obj[key])) return;
      obj[key].forEach(it => {
        if (it?.item_name) results.push(it.item_name);
        else if (it?.name) results.push(it.name);
      });
    };
    if (list.items_v2) {
      appendByKey(list.items_v2, 'produce');
      appendByKey(list.items_v2, 'meat');
      appendByKey(list.items_v2, 'other');
    }
    if (list.items) {
      appendByKey(list.items, 'produce');
      appendByKey(list.items, 'meat');
      appendByKey(list.items, 'other');
    }
    return [...new Set(results)];
  },

  addItem() {
    const name = this.data.newItem.trim();
    if (!name) return;

    const local = wx.getStorageSync(LOCAL_KEY) || [];
    local.unshift({ name, checked: false });
    wx.setStorageSync(LOCAL_KEY, local);
    this.setData({ newItem: '' });
    this.loadData();
  },

  toggleItem(e) {
    const index = e.currentTarget.dataset.index;
    const local = (wx.getStorageSync(LOCAL_KEY) || []).map(i => ({ ...i }));
    if (local[index]) {
      local[index].checked = !local[index].checked;
      wx.setStorageSync(LOCAL_KEY, local);
      this.loadData();
    }
  },

  // For van-checkbox change event
  onCheckboxChange(e) {
    const { checked } = e.detail;
    const index = e.currentTarget.dataset.index;
    const local = (wx.getStorageSync(LOCAL_KEY) || []).map(i => ({ ...i }));
    if (local[index]) {
      local[index].checked = checked;
      wx.setStorageSync(LOCAL_KEY, local);
      this.loadData();
    }
  },

  deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这项吗？',
      success: (res) => {
        if (res.confirm) {
          const local = (wx.getStorageSync(LOCAL_KEY) || []).map(i => ({ ...i }));
          local.splice(index, 1);
          wx.setStorageSync(LOCAL_KEY, local);
          this.loadData();
        }
      }
    });
  },

  clearChecked() {
    const local = (wx.getStorageSync(LOCAL_KEY) || []).filter(i => !i.checked);
    if (local.length === wx.getStorageSync(LOCAL_KEY).length) {
      wx.showToast({ title: '没有已勾选项', icon: 'none' });
      return;
    }
    
    // 保存到历史
    const checked = (wx.getStorageSync(LOCAL_KEY) || []).filter(i => i.checked);
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    history.unshift({
      date: new Date().toLocaleDateString(),
      items: checked
    });
    wx.setStorageSync(HISTORY_KEY, history.slice(0, 10));
    
    wx.setStorageSync(LOCAL_KEY, local);
    this.loadData();
    wx.showToast({ title: '已清除已购项', icon: 'success' });
  },

  onShare() {
    const token = this.data.token || wx.getStorageSync('token');
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
    
    const code = 'OD' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.setData({ showShareModal: true, inviteCode: code });
  },

  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  copyInviteCode() {
    if (this.data.invoteCode) {
      wx.setClipboardData({
        data: this.data.inviteCode,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  onShareAppMessage() {
    const { items } = this.data;
    const unchecked = items.filter(i => !i.checked).map(i => i.name);
    return {
      title: `简家厨购物清单（${unchecked.length}项）`,
      path: '/pages/plan/plan',
      query: 'fromShare=1'
    };
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onShareTimeline() {
    return {
      title: '简家厨购物清单 - 一键分享'
    };
  },

  // ========== 智能周计划生成 ==========
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
      generatedMealPlan: null
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
    const age = e.currentTarget.dataset.age;
    this.setData({ babyAge: age });
  },

  async generateMealPlan() {
    const { isSmartMode, smartPrompt, babyAge, excludeIngredients } = this.data;
    
    if (isSmartMode && !smartPrompt.trim()) {
      wx.showToast({ title: '请输入您的需求', icon: 'none' });
      return;
    }

    this.setData({ isGenerating: true });

    try {
      let prompt = smartPrompt;
      
      // 标准模式：构建提示词
      if (!isSmartMode) {
        const parts = [];
        if (babyAge) parts.push(`宝宝${babyAge}月龄`);
        if (excludeIngredients) parts.push(`排除: ${excludeIngredients}`);
        prompt = parts.length > 0 ? parts.join('，') + '的一周辅食计划' : '一周辅食计划';
      }

      const result = await api.generateMealPlanFromPrompt(prompt);
      
      this.setData({ 
        generatedMealPlan: result,
        isGenerating: false 
      });

      wx.showToast({ title: '生成成功', icon: 'success' });
      
      // 将生成的食材添加到清单
      if (result && result.ingredients) {
        const items = result.ingredients.map(name => ({
          name,
          checked: false
        }));
        this.importItems(items);
      }
      
    } catch (err) {
      console.error('[plan] generate meal plan failed:', err);
      this.setData({ isGenerating: false });
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  viewGeneratedPlan() {
    const { generatedMealPlan } = this.data;
    if (!generatedMealPlan) return;
    
    // TODO: 跳转到周计划详情页
    wx.showModal({
      title: generatedMealPlan.title || '周计划',
      content: JSON.stringify(generatedMealPlan, null, 2),
      showCancel: false
    });
  }
});
