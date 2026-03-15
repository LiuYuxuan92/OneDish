const api = require('../../utils/api');
const LOCAL_FAVORITES_KEY = 'local_favorites';

Page({
  data: {
    babyAge: null,
    babyAgeText: '',
    showPicker: false,
    ageOptions: [],
    // 用户偏好配置相关
    showAIConfigModal: false,
    aiConfig: {
      default_baby_age: 12,
      prefer_ingredients: '',
      exclude_ingredients: '',
      cooking_time_limit: 30,
      difficulty_preference: 'medium'
    },
    isSavingAI: false,
    favoritesCount: 0,
    hasToken: false
  },

  onLoad() {
    this.initAgeOptions();
    this.loadBabyAge();
    this.loadAIConfig();
    this.refreshProfileHub();
  },

  onShow() {
    this.loadBabyAge();
    this.loadAIConfig();
    this.refreshProfileHub();
  },

  onHide() {
    this.setData({
      showPicker: false,
      showAIConfigModal: false,
      isSavingAI: false,
    });
  },

  initAgeOptions() {
    // 生成 0-36 个月的选项
    const options = [];
    for (let i = 0; i <= 36; i++) {
      if (i === 0) {
        options.push({ value: 0, label: '0个月（新生儿）' });
      } else if (i <= 6) {
        options.push({ value: i, label: `${i}个月` });
      } else if (i <= 12) {
        options.push({ value: i, label: `${i}个月` });
      } else if (i <= 24) {
        options.push({ value: i, label: `${i}个月` });
      } else {
        options.push({ value: i, label: `${i}个月` });
      }
    }
    this.setData({ ageOptions: options });
  },

  loadBabyAge() {
    const babyAge = wx.getStorageSync('baby_age');
    if (babyAge !== '') {
      const text = this.getAgeText(babyAge);
      this.setData({ babyAge, babyAgeText: text });
    }
  },

  refreshProfileHub() {
    const localFavorites = wx.getStorageSync(LOCAL_FAVORITES_KEY);
    const favoritesCount = Array.isArray(localFavorites) ? localFavorites.length : 0;
    const hasToken = !!wx.getStorageSync('token');
    this.setData({ favoritesCount, hasToken });
  },

  getAgeText(age) {
    if (age === '' || age === null) return '未设置';
    if (age === 0) return '0个月（新生儿）';
    if (age <= 6) return `${age}个月`;
    if (age <= 12) return `${age}个月`;
    if (age <= 24) return `${age}个月`;
    return `${age}个月`;
  },

  showAgePicker() {
    this.setData({ showPicker: true });
  },

  hidePicker() {
    this.setData({ showPicker: false });
  },

  onAgeSelect(e) {
    const rawAge = e.currentTarget.dataset.age;
    const age = rawAge === '' || rawAge === null || rawAge === undefined ? null : Number(rawAge);
    this.setData({ 
      babyAge: age, 
      babyAgeText: this.getAgeText(age),
      showPicker: false 
    });
    this.saveBabyAge(age);
  },

  saveBabyAge(age) {
    wx.setStorageSync('baby_age', age);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  clearBabyAge() {
    wx.showModal({
      title: '确认',
      content: '确定清除宝宝月龄设置吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('baby_age');
          this.setData({ babyAge: null, babyAgeText: '未设置' });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goToMembership() {
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  goToPlan() {
    wx.switchTab({ url: '/pages/plan/plan' });
  },

  goToFavorites() {
    wx.switchTab({ url: '/pages/favorites/favorites' });
  },

  onShareAppMessage() {
    return {
      title: '简家厨 - 一鱼两吃',
      path: '/pages/home/home'
    };
  },

  // ========== 用户偏好配置 ==========
  async loadAIConfig() {
    const token = wx.getStorageSync('token');
    if (!token) {
      console.log('[profile] skip loading preferences before login');
      return;
    }

    try {
      const config = await api.getUserPreferences();
      if (config) {
        wx.setStorageSync('user_preferences', config);
        this.setData({ aiConfig: { ...this.data.aiConfig, ...config } });
      }
    } catch (err) {
      console.log('[profile] load user preferences failed, using defaults');
    }
  },

  openAIConfigModal() {
    this.setData({ showAIConfigModal: true });
  },

  closeAIConfigModal() {
    this.setData({ showAIConfigModal: false });
  },

  onAIConfigInput(e) {
    const field = e.currentTarget.dataset.field;
    const rawValue = e.detail && e.detail.value !== undefined
      ? e.detail.value
      : e.currentTarget.dataset.value;

    const numericFields = ['default_baby_age', 'cooking_time_limit'];
    const value = numericFields.includes(field) ? Number(rawValue) : rawValue;

    this.setData({
      [`aiConfig.${field}`]: value
    });
  },

  onDifficultySelect(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    this.setData({
      'aiConfig.difficulty_preference': difficulty
    });
  },

  async saveAIConfig() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录后再保存', icon: 'none' });
      return;
    }

    this.setData({ isSavingAI: true });

    try {
      const saved = await api.updateUserPreferences(this.data.aiConfig);
      wx.setStorageSync('user_preferences', saved);
      this.setData({
        aiConfig: { ...this.data.aiConfig, ...saved },
        showAIConfigModal: false,
        isSavingAI: false
      });
      this.refreshProfileHub();
      wx.showToast({ title: '偏好已保存', icon: 'success' });
    } catch (err) {
      console.error('[profile] save user preferences failed:', err);
      this.setData({ isSavingAI: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
