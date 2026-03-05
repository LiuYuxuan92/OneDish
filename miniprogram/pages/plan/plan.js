const api = require('../../utils/api');
const { getBaseURL, getToken, setBaseURL, setToken } = require('../../utils/config');

const LOCAL_KEY = 'plan_local_items';

Page({
  data: {
    baseURL: '',
    token: '',
    items: [],
    newItem: '',
    showShareModal: false,
    inviteCode: '',
    shareLoading: false
  },

  onShow() {
    const token = wx.getStorageSync('token') || getToken();
    const baseURL = wx.getStorageSync('baseURL') || getBaseURL();
    this.setData({ baseURL, token });
    this.loadData();
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
      }).catch(err => {
        console.warn('[plan] getShoppingLists failed, fallback to local list', err);
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

  addLocalItem() {
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
    const token = this.data.token || wx.getStorageSync('token');
    
    // 如果有 token，尝试同步到服务器
    if (token) {
      const items = this.data.items.slice();
      if (items[index]) {
        items[index].checked = !items[index].checked;
        this.setData({ items });
        // TODO: 调用 API 同步勾选状态
        return;
      }
    }
    
    // 否则只更新本地
    const local = (wx.getStorageSync(LOCAL_KEY) || []).map(i => ({ ...i }));
    if (local[index]) {
      local[index].checked = !local[index].checked;
      wx.setStorageSync(LOCAL_KEY, local);
      this.loadData();
    }
  },

  // 显示分享弹窗
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
    
    this.setData({ showShareModal: true, inviteCode: '' });
    
    // 生成邀请码（模拟）
    const code = 'OD' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.setData({ inviteCode: code });
  },

  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  copyInviteCode() {
    if (this.data.inviteCode) {
      wx.setClipboardData({
        data: this.data.inviteCode,
        success: () => {
          wx.showToast({ title: '邀请码已复制', icon: 'success' });
        }
      });
    }
  },

  // 分享给微信好友
  onShareToFriend() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});
