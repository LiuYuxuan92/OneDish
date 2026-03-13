const { getBaseURL, getToken } = require('./config');

function request({ url, method = 'GET', data = {}, withAuth = false, showLoading = true }) {
  return new Promise((resolve, reject) => {
    // 显示 loading
    if (showLoading) {
      wx.showLoading({ title: '加载中...', mask: true });
    }

    const headers = {
      'content-type': 'application/json'
    };

    const token = getToken();
    if (withAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    wx.request({
      url: `${getBaseURL()}${url}`,
      method,
      data,
      header: headers,
      success(res) {
        if (showLoading) {
          wx.hideLoading();
        }

        const payload = res.data || {};

        // 状态码处理
        if (res.statusCode === 401) {
          // 未授权，跳转登录
          wx.removeStorageSync('token');
          wx.showModal({
            title: '提示',
            content: '登录已过期，请重新登录',
            confirmText: '去登录',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/login/login' });
              }
            }
          });
          const error = new Error('未授权');
          error.statusCode = res.statusCode;
          error.code = payload.code || 401;
          error.data = payload.data || null;
          reject(error);
          return;
        }

        if (res.statusCode >= 500) {
          // 服务器错误
          wx.showToast({
            title: '服务器繁忙，请稍后重试',
            icon: 'none'
          });
          const error = new Error(payload.message || '服务器错误');
          error.statusCode = res.statusCode;
          error.code = payload.code || res.statusCode;
          error.data = payload.data || null;
          reject(error);
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && (payload.code === undefined || payload.code === 200)) {
          resolve(payload.data !== undefined ? payload.data : payload);
          return;
        }

        const error = new Error(payload.message || `请求失败(${res.statusCode})`);
        error.statusCode = res.statusCode;
        error.code = payload.code || res.statusCode;
        error.data = payload.data || null;
        reject(error);
      },
      fail(err) {
        if (showLoading) {
          wx.hideLoading();
        }
        
        // 网络错误
        wx.showToast({
          title: '网络连接失败，请检查网络',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

module.exports = request;
