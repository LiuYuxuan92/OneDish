App({
  globalData: {
    baseURL: 'http://localhost:3000/api/v1',
    token: ''
  },

  onLaunch() {
    const savedBaseURL = wx.getStorageSync('baseURL');
    const savedToken = wx.getStorageSync('token');

    if (savedBaseURL) this.globalData.baseURL = savedBaseURL;
    if (savedToken) this.globalData.token = savedToken;
  }
});
