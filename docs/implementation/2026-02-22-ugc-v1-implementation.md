# UGC V1 实现说明（2026-02-22）

## 本次实现内容

### 后端
1. 数据库迁移
- 新增 `20260222160001_add_ugc_status_and_favorites.ts`
- `user_recipes` 增加状态字段：`status/submitted_at/published_at/rejected_at/reject_reason`
- 新增 `user_recipe_favorites` 收藏表

2. UGC API（`/api/v1/user-recipes`）
- `POST /` 创建草稿
- `PUT /:id` 更新草稿
- `POST /:id/submit` 提交审核
- `POST /:id/review` 审核发布/驳回（V1 管理员模拟）
- `GET /published` 发布广场列表
- `GET /published/:id` 发布详情
- `POST /:id/favorite` 收藏/取消收藏
- 保留 `GET /`、`GET /:id`、`DELETE /:id`

3. 状态流转
- `draft -> pending -> published/rejected`
- `rejected` 允许再次提审

### 前端
1. “我的投稿”入口
- 复用原 `MyRecipes` 页面，文案升级为“我的投稿”

2. 投稿页能力
- 增加“我的投稿 / 发布广场”双 tab
- 支持创建草稿（adult_version + baby_version）
- 支持编辑草稿、提交审核、删除
- 发布广场支持浏览 published，并可收藏切换

3. API/Hooks
- `frontend/src/api/userRecipes.ts` 增加 UGC 新接口
- `frontend/src/hooks/useUserRecipes.ts` 增加 create/update/submit/published/favorite hooks

## 已知限制（V1）
- 审核为简化接口，未做后台权限隔离
- 投稿表单为最小字段，未做图片上传与富文本
- 宝宝安全规则尚未内建自动校验
