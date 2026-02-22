# 推荐反馈闭环 V1 测试计划（2026-02-22）

## 1. 测试目标

验证推荐反馈闭环 V1 能正确记录用户反馈并输出近 7 天统计，且不破坏现有推荐主链路。

## 2. 测试范围

- 后端：
  - `POST /api/v1/meal-plans/recommendations/feedback`
  - `GET /api/v1/meal-plans/recommendations/feedback/stats`
- 前端：
  - `WeeklyPlanScreen` 推荐结果反馈交互
  - `SettingsScreen` 近 7 天采纳率展示

## 3. 环境与前置

- 已完成数据库迁移
- 后端可启动（3000）
- 前端可启动（8081）
- 可获取 guest token

## 4. 测试项

### 4.1 构建与类型检查
- TC-BUILD-001：`backend npm run build` 成功
- TC-TSC-001：`frontend npm run type-check` 成功

### 4.2 Smoke
- TC-SMOKE-001：执行 `scripts/test/smoke.sh` 全部通过

### 4.3 新功能专项（>=3）

- TC-FEEDBACK-001 提交采纳 A
  - 步骤：POST feedback，`selected_option=A`
  - 期望：HTTP 200，业务 code=200，`accepted=true`

- TC-FEEDBACK-002 提交不采纳 + 原因
  - 步骤：POST feedback，`selected_option=NONE`，`reject_reason=家里没食材`
  - 期望：HTTP 200，业务 code=200，记录成功

- TC-FEEDBACK-003 查询近 7 天统计
  - 步骤：GET stats?days=7
  - 期望：返回 `adoption_rate` 与 `reject_reason_top`，字段完整

- TC-FEEDBACK-004 非法参数校验
  - 步骤：POST feedback，`selected_option=INVALID`
  - 期望：HTTP 400

## 5. 通过标准

- 构建、类型检查、smoke 全通过
- 新功能专项至少 3 条通过
- 无阻断级回归问题
