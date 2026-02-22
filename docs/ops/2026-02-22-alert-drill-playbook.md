# OneDish 告警演练执行单（2026-02-22）

## 0. 演练范围
- 服务：`onedish-backend`
- 目标告警：`5xx / P95 / 429 / 预算`
- 本地环境：`http://localhost:3000`
- 说明：本地未接入真实 Alertmanager，本执行单以“可触发指标变化 + PromQL 预期命中”为验收基准。

---

## 1) 5xx 错误率告警演练

### 触发方式
1. 获取 token（游客登录）。
2. 连续请求一个会稳定返回 500 的路径（传入不存在 recipe_id）：

```bash
TOKEN=$(curl -sS -X POST http://localhost:3000/api/v1/auth/guest -H 'Content-Type: application/json' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')

for i in $(seq 1 8); do
  curl -sS -o /tmp/5xx-$i.json -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/shopping-lists/add-recipe \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"recipe_id":"not-exists","list_date":"2026-02-22","servings":2}'
done
```

### 观察指标
- `onedish_http_requests_total{route="/api/v1/shopping-lists/add-recipe",status="500"}`
- 规则参考：
  - `sum(rate(onedish_http_requests_total{status=~"5.."}[5m])) / sum(rate(onedish_http_requests_total[5m])) > 0.02`

### 预期告警
- SEV2：5 分钟 5xx 比例 > 2%
- SEV1：5 分钟 5xx 比例 > 5%

### 恢复动作
- 立即停止演练流量；
- 按 runbook 切换降级路径（`ai -> web -> cache -> local`）；
- 若由新变更引入，执行回滚。

### 验收标准
- `/metrics` 中 500 计数可见增长；
- 恢复后健康检查 `GET /health`、核心接口 smoke 均为 200。

---

## 2) P95 延迟告警演练

### 触发方式
本地优先采用“慢请求压测”触发：

```bash
# 使用可产生外部依赖等待的搜索接口，设定客户端超时观察慢请求行为
for i in $(seq 1 12); do
  curl --max-time 6 -sS -o /tmp/p95-$i.json -w "%{time_total} %{http_code}\n" \
    "http://localhost:3000/api/v1/search?keyword=番茄" \
    -H "Authorization: Bearer $TOKEN" || echo "timeout 000"
done
```

### 观察指标
- `onedish_http_request_duration_ms_bucket`（P95 基础直方图）
- 规则参考：
  - 非 AI：`histogram_quantile(0.95, sum by (le)(rate(onedish_http_request_duration_ms_bucket{source!="ai"}[10m]))) > 800`
  - AI：`histogram_quantile(0.95, sum by (le)(rate(onedish_http_request_duration_ms_bucket{source="ai"}[10m]))) > 6000`

### 预期告警
- SEV2：10 分钟 P95 超阈值

### 恢复动作
- 停止压测；
- 降级高耗时路径（优先 cache/local）；
- 必要时限流或扩容。

### 验收标准
- 至少有一条可追溯的慢请求证据（`curl` 超时/耗时记录）；
- 若本地未超过阈值，明确记录“仅完成触发尝试，阈值告警待 staging/生产演练”。

---

## 3) 429（限流/配额）告警演练

### 触发方式
对 `auth` 路径突发请求，命中 `RateLimiterMemory`（10 次/60 秒）：

```bash
for i in $(seq 1 25); do
  curl -sS -o /tmp/429-$i.json -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/auth/guest \
    -H 'Content-Type: application/json'
done
```

### 观察指标
- `onedish_http_requests_total{route="/api/v1/auth/guest",status="429"}`
- 规则参考（现网建议）：
  - `increase(onedish_quota_reject_total[10m]) + increase(onedish_ratelimit_reject_total[10m]) > 100`

### 预期告警
- SEV2：429 异常突增（绝对值或环比）

### 恢复动作
- 停止突发流量；
- 回看限流阈值是否误配；
- 若真实突发，按 runbook 执行源头限流和关键路径优先策略。

### 验收标准
- 429 返回出现且可统计（例如 25 次中出现多个 429）；
- 恢复后核心链路可继续访问。

---

## 4) 预算水位告警演练

### 触发方式
目标指标（`onedish_ai_cost_usd_total`、`onedish_ai_daily_budget_usd`）当前本地未实现，先定义 staging/生产演练方式：
1. 在 staging 注入固定预算（如 `$1`）；
2. 通过 AI 路径压测累计成本；
3. 观察 70%/90%/100% 三段告警。

### 观察指标
- `sum(increase(onedish_ai_cost_usd_total[1d]))`
- `sum(increase(onedish_ai_cost_usd_total[1d])) / max(onedish_ai_daily_budget_usd)`

### 预期告警
- 70% 预警，90% 告警，100% 紧急并触发强制降级

### 恢复动作
- >=90%：降级 AI 路径；
- >=100%：强制 `local/cache`，并限制高成本功能。

### 验收标准
- 指标存在且可计算比例；
- 三段阈值能在监控系统中命中并通知到值班渠道。

---

## 5. 最小回归验证（演练后）
```bash
cd backend && npm run build

# smoke（最小）
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/api/v1/recipes/daily -H "Authorization: Bearer $TOKEN"
```

通过标准：构建成功、健康检查 200、核心接口返回 `code=200`。