# 三餐智能推荐 V1 测试计划（2026-02-22）

## 1. 测试目标
验证三餐智能推荐 V1 在不破坏现有周计划功能的前提下：
- 后端可按 `meal_type` 与 `all-day` 返回 A/B 方案。
- 返回包含 `time_estimate / missing_ingredients / baby_suitable / switch_hint`。
- 前端可触发并展示推荐结果。

## 2. 测试范围
- 后端接口：`POST /api/v1/meal-plans/recommendations`
- 前端页面：`WeeklyPlanScreen`（新增 A/B 推荐入口与结果弹窗）
- 回归：周计划生成/展示不受影响

## 3. 测试环境
- Backend: TypeScript build
- Frontend: TypeScript type-check
- 本地 smoke：接口调用 + 页面触发

## 4. 用例设计

### TC-01 all-day 返回三餐 A/B
- 输入：`meal_type=all-day`
- 预期：`recommendations` 含 breakfast/lunch/dinner，且每餐含 A/B（允许空但字段存在）

### TC-02 单餐返回
- 输入：`meal_type=breakfast`
- 预期：仅返回 breakfast 节点；A/B 字段存在

### TC-03 忌口过滤
- 输入：`exclude_ingredients=["花生"]`
- 预期：命中忌口的候选被过滤，结果中不应推荐含忌口食材菜谱

### TC-04 宝宝适配标记
- 输入：`baby_age_months=8`
- 预期：返回 `baby_suitable` 布尔值，且低月龄不适配菜谱倾向降权/过滤

### TC-05 库存缺口与切换理由
- 输入：少量库存
- 预期：`missing_ingredients` 有值时，`switch_hint` 提示可切换 B 降低采购

### TC-06 回归-周计划
- 操作：正常生成周计划
- 预期：旧功能可用，无报错

## 5. 通过标准
- 构建与类型检查通过
- Smoke 通过
- 新功能专项验证至少 3 条通过
