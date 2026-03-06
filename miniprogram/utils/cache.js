// 缓存工具
const CACHE_KEY = 'onedish_recipe_cache';
const CACHE_EXPIRE = 24 * 60 * 60 * 1000; // 24小时

// 获取缓存
function getCache(key) {
  const data = wx.getStorageSync(CACHE_KEY);
  if (!data) return null;
  
  const item = data[key];
  if (!item) return null;
  
  // 检查是否过期
  if (Date.now() - item.timestamp > CACHE_EXPIRE) {
    delete data[key];
    wx.setStorageSync(CACHE_KEY, data);
    return null;
  }
  
  return item.data;
}

// 设置缓存
function setCache(key, value) {
  let data = wx.getStorageSync(CACHE_KEY) || {};
  data[key] = {
    data: value,
    timestamp: Date.now()
  };
  wx.setStorageSync(CACHE_KEY, data);
}

// 清除缓存
function clearCache(key) {
  let data = wx.getStorageSync(CACHE_KEY) || {};
  if (key) {
    delete data[key];
  } else {
    data = {};
  }
  wx.setStorageSync(CACHE_KEY, data);
}

// 检查网络
function checkNetworkStatus() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none');
      },
      fail: () => resolve(false)
    });
  });
}

module.exports = {
  getCache,
  setCache,
  clearCache,
  checkNetworkStatus
};
