# 推荐反馈闭环 V1 测试报告（2026-02-22）

## 1. 结论

本轮实现通过核心验证，达到可用状态（MVP）。

- backend build：✅ 通过
- frontend type-check：✅ 通过
- smoke：✅ 通过（7/7）
- 新功能专项：✅ 4/4 通过

---

## 2. 执行记录

### 2.1 构建与类型检查

1) `cd backend && npm run build`
- 结果：通过

2) `cd frontend && npm run type-check`
- 结果：通过

### 2.2 Smoke

- 命令：`bash scripts/test/smoke.sh`
- 结果：7 项全部通过（backend/frontend 可达、guest、daily、detail、weekly、shopping-lists）

### 2.3 新功能专项

#### TC-FEEDBACK-001 提交采纳 A
- 请求：`POST /api/v1/meal-plans/recommendations/feedback`
- 入参：`meal_type=lunch, selected_option=A`
- 结果：HTTP 200，业务 code=200，`accepted=true`

#### TC-FEEDBACK-002 提交不采纳 + 原因
- 请求：`POST /api/v1/meal-plans/recommendations/feedback`
- 入参：`meal_type=dinner, selected_option=NONE, reject_reason=家里没食材`
- 结果：HTTP 200，业务 code=200，记录成功

#### TC-FEEDBACK-003 查询近 7 天统计
- 请求：`GET /api/v1/meal-plans/recommendations/feedback/stats?days=7`
- 结果：HTTP 200，返回 `adoption_rate=0.5`，`reject_reason_top=[家里没食材:1]`

#### TC-FEEDBACK-004 非法参数校验
- 请求：`POST feedback, selected_option=X`
- 结果：HTTP 400，`message=非法 selected_option`

---

## 3. 问题与处理

- 首次接口调用出现 500（表不存在），原因是新 migration 未执行。
- 处理：执行 `npm run migrate` 后恢复正常。

---

## 4. 回归影响

- 现有推荐/周计划主链路 smoke 未见回归。
- 新增功能为增量接口 + 页面局部交互，风险可控。
