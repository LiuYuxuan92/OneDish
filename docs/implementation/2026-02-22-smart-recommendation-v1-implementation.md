# 三餐智能推荐 V1 实施说明（2026-02-22）

## 1. 实施目标
在不破坏现有周计划功能的前提下，新增三餐智能推荐 V1：
- 支持 `meal_type=breakfast|lunch|dinner|all-day`
- 每餐返回 A/B 两套方案
- 每套方案包含 `time_estimate, missing_ingredients, baby_suitable, switch_hint`

## 2. 后端改动

### 新增接口
- 路由：`POST /api/v1/meal-plans/recommendations`
- 文件：`backend/src/routes/mealPlan.routes.ts`

### 控制器扩展
- 文件：`backend/src/controllers/mealPlan.controller.ts`
- 新增 `getSmartRecommendations`
- 接收家庭约束并调用 service

### Service 实现
- 文件：`backend/src/services/mealPlan.service.ts`
- 新增：
  - `getSmartRecommendations(userId, input)`
  - `buildCandidateMeta(...)`
  - `toRecommendationItem(...)`
- 规则：
  - 筛选餐别 + 耗时
  - 忌口过滤
  - 宝宝适配打分
  - 库存缺口识别
  - 评分排序并选取 A/B

## 3. 前端改动

### API 层
- 文件：`frontend/src/api/mealPlans.ts`
- 新增智能推荐请求参数与响应类型
- 新增 `getSmartRecommendations`

### Hook 层
- 文件：`frontend/src/hooks/useMealPlans.ts`
- 新增 `useSmartRecommendations` mutation

### 页面入口与展示
- 文件：`frontend/src/screens/plan/WeeklyPlanScreen.tsx`
- 新增 A/B 入口按钮
- 新增推荐结果弹窗：按餐别显示 A/B 方案与四项元信息

## 4. 兼容性说明
- 周计划原有接口和数据结构未被破坏。
- 新能力通过新增接口与独立 UI 入口接入。

## 5. 已完成验证
- backend build ✅
- frontend type-check ✅
- smoke + 新功能专项验证（3条）✅
