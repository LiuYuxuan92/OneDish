const STORAGE_KEY = 'onedish_miniprogram_analytics_buffer';

function sanitizePayload(payload = {}) {
  return Object.keys(payload).reduce((acc, key) => {
    const value = payload[key];
    if (value === undefined || value === null) return acc;
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      acc[key] = value;
      return acc;
    }
    acc[key] = JSON.stringify(value);
    return acc;
  }, {});
}

function persistRecord(record) {
  try {
    const history = wx.getStorageSync(STORAGE_KEY);
    const list = Array.isArray(history) ? history : [];
    wx.setStorageSync(STORAGE_KEY, [record, ...list].slice(0, 100));
  } catch (_err) {
  }
}

function trackEvent(eventName, payload = {}) {
  const record = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    console.info('[analytics]', record);
    if (typeof wx !== 'undefined' && typeof wx.reportAnalytics === 'function') {
      wx.reportAnalytics(eventName, sanitizePayload(payload));
    }
    persistRecord(record);
  } catch (_err) {
  }

  return record;
}

module.exports = {
  trackEvent,
};
