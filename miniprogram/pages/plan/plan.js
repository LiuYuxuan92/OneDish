const api = require('../../utils/api');
const { getBaseURL, getToken, setBaseURL, setToken } = require('../../utils/config');

const LOCAL_KEY = 'plan_local_items';

Page({
  data: {
    baseURL: '',
    token: '',
    items: [],
    newItem: ''
  },

  onShow() {
    this.setData({ baseURL: getBaseURL(), token: getToken() });
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
    setBaseURL(this.data.baseURL.trim());
    setToken(this.data.token.trim());
    wx.showToast({ title: '配置已保存', icon: 'success' });
  },

  async loadData() {
    const token = getToken();
    if (token) {
      try {
        const lists = await api.getShoppingLists();
        const latest = Array.isArray(lists) ? lists[0] : null;
        const mergedItems = this.extractItemsFromList(latest).map(name => ({
          name,
          checked: false,
          source: 'API'
        }));
        this.setData({ items: mergedItems });
        return;
      } catch (err) {
        console.warn('[plan] getShoppingLists failed, fallback to local list', err);
      }
    }

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

    // 兼容 items_v2 / items 字段
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
    const local = (wx.getStorageSync(LOCAL_KEY) || []).map(i => ({ ...i }));

    if (local[index]) {
      local[index].checked = !local[index].checked;
      wx.setStorageSync(LOCAL_KEY, local);
      this.loadData();
      return;
    }

    const items = this.data.items.slice();
    if (items[index]) {
      items[index].checked = !items[index].checked;
      this.setData({ items });
    }
  },

  onSharePlaceholder() {
    wx.showModal({
      title: '共享能力预留',
      content: 'MVP 已预留共享入口，后续可对接后端 share 接口。',
      showCancel: false
    });
  }
});
