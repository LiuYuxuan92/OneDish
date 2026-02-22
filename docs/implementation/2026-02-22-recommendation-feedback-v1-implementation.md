# 推荐反馈闭环 V1 实施说明（2026-02-22）

## 1. 实施概览

本次完成“推荐反馈闭环 V1”最小可用实现，打通：

推荐结果展示 → 用户反馈提交 → 反馈统计展示。

## 2. 后端改动

### 2.1 数据库

新增 migration：
- `backend/src/database/migrations/20260222163001_create_recommendation_feedbacks_table.ts`

新增表：`recommendation_feedbacks`
- 存储用户对推荐结果的选择（A/B/NONE）
- 记录拒绝原因、餐次、行为时间

### 2.2 接口

基于 `meal-plans` 路由新增：

1) `POST /api/v1/meal-plans/recommendations/feedback`
- 记录反馈
- 参数校验：`meal_type`、`selected_option`、`event_time`

2) `GET /api/v1/meal-plans/recommendations/feedback/stats?days=7`
- 返回窗口期采纳率与拒绝原因 TOP
- `days` 做范围保护（1~30）

涉及文件：
- `backend/src/controllers/mealPlan.controller.ts`
- `backend/src/routes/mealPlan.routes.ts`
- `backend/src/services/mealPlan.service.ts`

## 3. 前端改动

### 3.1 API/Hook

新增 API：
- `submitRecommendationFeedback`
- `getRecommendationFeedbackStats`

新增 Hook：
- `useSubmitRecommendationFeedback`
- `useRecommendationFeedbackStats`

涉及文件：
- `frontend/src/api/mealPlans.ts`
- `frontend/src/hooks/useMealPlans.ts`

### 3.2 页面交互

1) `WeeklyPlanScreen`
- 智能推荐弹窗新增操作：采纳A / 采纳B / 不采纳(原因)
- 提交后提示成功并关闭弹窗

2) `SettingsScreen`
- 新增“近7天推荐采纳率”展示
- 展示格式：`xx.x% (accepted/total)`

涉及文件：
- `frontend/src/screens/plan/WeeklyPlanScreen.tsx`
- `frontend/src/screens/profile/SettingsScreen.tsx`

## 4. 兼容性与风险控制

- 新能力通过新增接口实现，不影响旧推荐接口返回结构。
- 前端仅在推荐弹窗和设置页做增量展示，改动面较小。
- 统计无数据时展示兜底文案，避免空白态异常。

## 5. 后续建议

- 引入“反馈去重/节流”避免短时间重复提交
- 拆分拒绝原因为枚举 + 自定义补充，提升统计质量
- 在推荐算法中消费反馈统计，形成真正闭环优化（V2）
