const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    userInfo: null,
    loggedIn: false
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ loggedIn: true });
    }
  },

  // 微信登录
  wechatLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    wx.login({
      success: (res) => {
        if (res.code) {
          // 获取用户信息
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: (profileRes) => {
              this.doWechatLogin(res.code, profileRes.userInfo);
            },
            fail: () => {
              // 用户拒绝授权，也尝试登录
              this.doWechatLogin(res.code, null);
            }
          });
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  doWechatLogin(code, userInfo) {
    api.wechatLogin(code, userInfo).then((data) => {
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('refresh_token', data.refresh_token);
      wx.setStorageSync('userInfo', data.user);
      
      this.setData({ 
        loading: false, 
        loggedIn: true,
        userInfo: data.user
      });
      
      wx.showToast({ title: '登录成功', icon: 'success' });
      
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 1500);
    }).catch((err) => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  // 游客登录
  guestLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    api.guestLogin().then((data) => {
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('refresh_token', data.refresh_token);
      wx.setStorageSync('userInfo', data.user);
      
      this.setData({ 
        loading: false, 
        loggedIn: true,
        userInfo: data.user
      });
      
      wx.showToast({ title: '欢迎游客', icon: 'success' });
      
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 1500);
    }).catch((err) => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('refresh_token');
          wx.removeStorageSync('userInfo');
          this.setData({ loggedIn: false, userInfo: null });
        }
      }
    });
  }
});
