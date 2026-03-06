const app = getApp();

Page({
  data: {
    babyAge: null,
    babyAgeText: '',
    showPicker: false,
    ageOptions: []
  },

  onLoad() {
    this.initAgeOptions();
    this.loadBabyAge();
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
    const age = e.currentTarget.dataset.age;
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

  onShareAppMessage() {
    return {
      title: '简家厨 - 一鱼两吃',
      path: '/pages/home/home'
    };
  }
});
