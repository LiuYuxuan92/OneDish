# OneDish 告警演练结果记录（2026-02-22）

## 1. 执行摘要
- 执行时间：2026-02-22 13:04 UTC 起
- 执行环境：本地（`localhost:3000`）
- 结论：
  - ✅ 已完成：5xx、429 的可触发演练与指标证据采集
  - ✅ 已完成：最小验证（backend build + smoke）
  - ⚠️ 部分完成：P95（已完成慢请求触发尝试与超时证据，未在本地稳定命中阈值告警）
  - ✅ 已完成：预算水位最小可行实现（成本指标 + 演练脚本）

---

## 2. 已执行项（含证据）

### 2.1 backend build
- 命令：`cd backend && npm run build`
- 结果：通过（`tsc` 成功退出）

### 2.2 smoke（最小）
- `GET /health`：`code=200`（`docs/implementation/evidence/2026-02-22-alert-drill/health.json`）
- `GET /api/v1/recipes/daily`：`code=200`（`smoke-recipes-daily.json`）
- `GET /api/v1/recipes/:id`：`code=200`（`smoke-recipe-detail.json`）
- `GET /api/v1/meal-plans/weekly`：`code=200`（`smoke-meal-plans-weekly.json`）
- `GET /api/v1/shopping-lists`：`code=200`（`smoke-shopping-lists.json`）
- 演练后回归：`post-health.json`、`post-smoke-recipes-daily.json` 均 `code=200`

### 2.3 5xx 演练
- 触发命令：连续 8 次请求 `POST /api/v1/shopping-lists/add-recipe`（`recipe_id=not-exists`）
- 结果：8/8 返回 HTTP 500（`5xx-*.status`）
- 指标证据（前后对比）：
  - `onedish_http_requests_total{route="/api/v1/shopping-lists/add-recipe",status="500"} 8`
  - 见 `metrics-baseline.prom` vs `metrics-after.prom`

### 2.4 429 演练
- 触发命令：25 次突发 `POST /api/v1/auth/guest`
- 结果：`200 x10`，`429 x15`（`429-*.status` 汇总）
- 指标证据：
  - `onedish_http_requests_total{route="/api/v1/auth/guest",status="429"} 15`
  - 见 `metrics-after.prom`

### 2.5 P95 演练（部分）
- 触发命令：12 次 `GET /api/v1/search?keyword=番茄`，客户端超时 6s
- 结果：12 次均超时（`p95-*.time` 为 `timeout 000`）
- 说明：获得“慢请求可触发”证据，但本地未产出可用于 P95 阈值判断的稳定直方图增量。

---

## 3. 未执行项 / 阻塞原因

### 3.1 预算告警（MVP 已补齐，链路待联调）
- 已补齐指标：`onedish_ai_cost_usd_total`（每次 AI 请求按 0.002 USD 估算累计）
- 已补齐演练脚本：`scripts/test/alert-budget-drill.sh`
- 现状：本地可验证成本指标增长；预算阈值告警仍依赖 `onedish_ai_daily_budget_usd`（recording rule）在监控侧配置。

### 3.2 Alertmanager 通知链路验证（未执行）
- 阻塞原因：本地环境未接入真实 Prometheus + Alertmanager 路由。
- 影响：仅能验证“指标变化”，无法验证“告警发送/收敛”。

---

## 4. 后续动作（谁做什么）
1. **SRE/运维 Owner**：在 staging 接入并发布告警规则
   - 落地 5xx/P95/429/预算 PromQL 到规则文件
   - 配置 `onedish_ai_daily_budget_usd` recording rule + Alertmanager 路由（SEV1/2/3）
2. **QA/值班 Owner**：执行 staging 告警联调
   - 按执行单逐项触发并截图/留档
   - 验证通知到人、恢复后告警自动关闭
3. **Backend + QA**：补一个“可控慢接口”演练开关
   - 仅 staging 可用（例如 query 参数触发 1~3s 延迟），用于稳定复现 P95 告警

---

## 5. 本次改动文件清单
- `docs/ops/2026-02-22-alert-drill-playbook.md`（新增）
- `docs/implementation/2026-02-22-alert-drill-report.md`（新增）
- `docs/implementation/evidence/2026-02-22-alert-drill/*`（新增证据文件）