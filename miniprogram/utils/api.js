const request = require('./request');

function getTodayRecommendation() {
  return request({ url: '/recipes/daily' });
}

function getRecipeList(params = {}) {
  return request({ url: '/recipes', data: { page: 1, limit: 20, ...params } });
}

function getRecipeDetail(id) {
  return request({ url: `/recipes/${id}` });
}

// 后端当前未发现“换一道”专门接口，MVP 使用前端临时逻辑：
// 拉取菜谱列表并随机替换当前推荐。
async function swapRecommendation(currentId) {
  const result = await getRecipeList({ limit: 30 });
  const items = result.items || [];
  const pool = items.filter(item => item.id !== currentId);
  if (!pool.length) return null;
  const next = pool[Math.floor(Math.random() * pool.length)];
  try {
    return await getRecipeDetail(next.id);
  } catch (_e) {
    return next;
  }
}

function getShoppingLists() {
  return request({ url: '/shopping-lists', withAuth: true });
}

function wechatLogin(code, userInfo) {
  return request({
    url: '/auth/wechat',
    method: 'POST',
    data: { code, userInfo }
  });
}

function guestLogin() {
  return request({
    url: '/auth/guest',
    method: 'POST'
  });
}

module.exports = {
  getTodayRecommendation,
  getRecipeList,
  getRecipeDetail,
  swapRecommendation,
  getShoppingLists,
  wechatLogin,
  guestLogin
};
