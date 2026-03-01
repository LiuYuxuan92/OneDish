const { getBaseURL, getToken } = require('./config');

function request({ url, method = 'GET', data = {}, withAuth = false }) {
  return new Promise((resolve, reject) => {
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
        const payload = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && (payload.code === undefined || payload.code === 200)) {
          resolve(payload.data !== undefined ? payload.data : payload);
          return;
        }
        reject(new Error(payload.message || `请求失败(${res.statusCode})`));
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

module.exports = request;
