# 实施说明｜智能推荐埋点闭环 v1

## 1. 本次交付
围绕“三餐智能推荐”补齐从前端到后端的埋点闭环，支持后续指标看板接入。

## 2. 关键改动
### Backend
1. 新增迁移
- `backend/src/database/migrations/20260222151001_create_metrics_events_table.ts`
- 新建 `metrics_events` 表，字段覆盖 event_name/event_time/user_id/anonymous_id/session_id/platform/page/page_url/payload。

2. 新增控制器与路由
- `backend/src/controllers/metrics.controller.ts`
- `backend/src/routes/metrics.routes.ts`
- `POST /api/v1/metrics/events`：
  - 事件白名单校验
  - 必填字段校验
  - 平台枚举校验
  - 写库 + 指标计数

3. 指标补充
- `backend/src/services/metrics.service.ts`
- 新增：`onedish_product_events_total`

4. 路由挂载
- `backend/src/index.ts`
- 挂载 `/api/v1/metrics`

### Frontend
1. 事件类型扩展
- `frontend/src/analytics/sdk.ts`
- 新增事件：
  - `smart_recommendation_requested`
  - `smart_recommendation_viewed`

2. 页面触发埋点
- `frontend/src/screens/plan/WeeklyPlanScreen.tsx`
- 触发逻辑：
  - 请求推荐前上报 requested
  - 返回推荐后上报 viewed（带 meal_group_count）

## 3. 对标下厨房：差异化与不做项
- 差异化：OneDish优先跟踪“家庭场景可执行推荐”而非社区内容消费。
- 差异化：事件附带宝宝月龄/忌口等决策上下文，更适合家庭推荐优化。
- 不做项：本轮不做下厨房式UGC社区埋点体系，不做评论/互动关系链分析。

## 4. 回滚与兼容
- 回滚：移除 `/metrics` 路由与前端新增埋点调用即可；主业务链路不受影响。
- 兼容：埋点失败不阻塞业务，符合“低风险增量”原则。
