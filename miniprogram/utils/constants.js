// 小程序常量配置

module.exports = {
  // API 配置
  API: {
    BASE_URL: 'http://localhost:3000/api/v1',
    TIMEOUT: 10000,
  },

  // 缓存配置
  CACHE: {
    EXPIRE: 24 * 60 * 60 * 1000, // 24小时
    KEY: 'onedish_cache',
  },

  // 存储 Key
  STORAGE: {
    TOKEN: 'token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'userInfo',
    BABY_AGE: 'baby_age',
    SEARCH_HISTORY: 'search_history',
    LOCAL_FAVORITES: 'local_favorites',
    PLAN_ITEMS: 'plan_local_items',
    PLAN_HISTORY: 'plan_history',
    PENDING_IMPORT: 'pending_import',
    BASE_URL: 'baseURL',
  },

  // 页面路径
  PAGES: {
    HOME: '/pages/home/home',
    RECIPE: '/pages/recipe/recipe',
    PLAN: '/pages/plan/plan',
    SEARCH: '/pages/search/search',
    FAVORITES: '/pages/favorites/favorites',
    PROFILE: '/pages/profile/profile',
    LOGIN: '/pages/login/login',
  },

  // 版本
  VERSION: '1.0.0',
};
