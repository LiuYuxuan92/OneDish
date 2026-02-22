# Test Report - Build & Smoke（2026-02-22）

## 1. 基本信息
- 主题：后端编译修复后的构建与核心链路冒烟测试
- 执行时间：2026-02-22
- 执行人：OpenClaw Assistant
- 对应测试计划：`docs/testing/plans/2026-02-22-build-and-smoke-test-plan.md`

## 2. 执行摘要
- 总用例数：7
- 通过：7
- 失败：0
- 阻塞：0

## 3. 用例结果明细

| 用例ID | 结果 | 证据/备注 |
|---|---|---|
| TC-BUILD-001 | ✅ 通过 | `cd backend && npm run build` 无报错 |
| TC-TYPE-001 | ✅ 通过 | `cd frontend && npm run type-check` 无报错 |
| TC-SMOKE-001 | ✅ 通过 | `POST /api/v1/auth/guest` 返回 `code=200` |
| TC-SMOKE-002 | ✅ 通过 | `GET /api/v1/recipes/daily` 返回 `code=200`，含 recipe 数据 |
| TC-SMOKE-003 | ✅ 通过 | `GET /api/v1/recipes/:id` 返回 `code=200`，`baby_version=true` |
| TC-SMOKE-004 | ✅ 通过 | `GET /api/v1/meal-plans/weekly` 返回 `code=200` |
| TC-SMOKE-005 | ✅ 通过 | `GET /api/v1/shopping-lists?start_date=2026-02-22` 返回 `code=200` |

## 4. 缺陷清单
- 本轮未发现阻断缺陷（P0/P1）

## 5. 偏差说明
- 页面级 UI 可视验证受当前工具网络限制，采用接口级 smoke + 服务存活检查替代。
- 前端服务可访问性已验证：`http://localhost:8081` 返回 HTML（`<!DOCTYPE html>`）。

## 6. 结论
- 构建门禁、类型门禁、核心业务链路 smoke 全部通过。
- 本轮结论：**可进入下一阶段（功能回归/页面细测）**。

## 7. 后续动作
1. 补一轮人工页面回归（首页/详情/周计划/购物清单交互）
2. 将本次 API 冒烟脚本沉淀为可复用命令（可纳入 CI）
