function getBaseURL() {
  const app = getApp();
  return wx.getStorageSync('baseURL') || app.globalData.baseURL;
}

function getToken() {
  const app = getApp();
  return wx.getStorageSync('token') || app.globalData.token || '';
}

function setBaseURL(baseURL) {
  wx.setStorageSync('baseURL', baseURL);
  const app = getApp();
  app.globalData.baseURL = baseURL;
}

function setToken(token) {
  wx.setStorageSync('token', token);
  const app = getApp();
  app.globalData.token = token;
}

module.exports = {
  getBaseURL,
  getToken,
  setBaseURL,
  setToken
};
