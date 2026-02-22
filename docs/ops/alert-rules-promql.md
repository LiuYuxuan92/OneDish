# OneDish 告警规则草案（PromQL）

> 目标：提供可直接落到 Prometheus/Alertmanager 的最小可用规则样例，覆盖 5xx / P95 / 429 / 预算水位。

## 0. 指标命名约定与前置
- 服务标签示例：`job="onedish-backend"`
- 路由标签示例：`route`, `source`, `status`
- 请先确认 `/metrics` 已在生产可抓取
- 若你的真实指标名不同，请按同等语义替换

---

## 1) 5xx 错误率

### 1.1 SEV2：5 分钟错误率 > 2%
```promql
sum(rate(onedish_http_requests_total{job="onedish-backend",status=~"5.."}[5m]))
/
sum(rate(onedish_http_requests_total{job="onedish-backend"}[5m]))
> 0.02
```
建议 `for: 5m`

### 1.2 SEV1：5 分钟错误率 > 5%
```promql
sum(rate(onedish_http_requests_total{job="onedish-backend",status=~"5.."}[5m]))
/
sum(rate(onedish_http_requests_total{job="onedish-backend"}[5m]))
> 0.05
```
建议 `for: 2m`

---

## 2) P95 延迟

> 假设已提供直方图指标：`onedish_http_request_duration_ms_bucket`。

### 2.1 非 AI 路径 P95 > 800ms
```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(onedish_http_request_duration_ms_bucket{job="onedish-backend",source!="ai"}[10m])
  )
)
> 800
```
建议 `for: 10m`

### 2.2 AI 路径 P95 > 6000ms
```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(onedish_http_request_duration_ms_bucket{job="onedish-backend",source="ai"}[10m])
  )
)
> 6000
```
建议 `for: 10m`

---

## 3) 429（配额/限流拒绝）

### 3.1 10 分钟总量阈值 > 100
```promql
sum(increase(onedish_quota_reject_total{job="onedish-backend"}[10m]))
+
sum(increase(onedish_ratelimit_reject_total{job="onedish-backend"}[10m]))
> 100
```
建议 `for: 2m`

### 3.2 环比增长 > 200%（当前 10m vs 前一窗口 10m）
```promql
(
  sum(increase(onedish_quota_reject_total{job="onedish-backend"}[10m]))
  +
  sum(increase(onedish_ratelimit_reject_total{job="onedish-backend"}[10m]))
)
/
clamp_min(
  (
    sum(increase(onedish_quota_reject_total{job="onedish-backend"}[10m] offset 10m))
    +
    sum(increase(onedish_ratelimit_reject_total{job="onedish-backend"}[10m] offset 10m))
  ),
  1
)
> 3
```
建议 `for: 2m`

---

## 4) 预算水位（AI 成本）

> 当前后端已提供成本累计指标：`onedish_ai_cost_usd_total`（按 AI 请求累计估算美元成本，MVP 版本每次请求 +0.002 USD）。预算阈值可通过 `onedish_ai_daily_budget_usd`（recording rule/常量）配置。

### 4.1 当日消耗
```promql
sum(increase(onedish_ai_cost_usd_total{job="onedish-backend"}[1d]))
```

### 4.2 水位比例
```promql
sum(increase(onedish_ai_cost_usd_total{job="onedish-backend"}[1d]))
/
max(onedish_ai_daily_budget_usd{job="onedish-backend"})
```

### 4.3 阈值
- 预警（70%）：`> 0.7`，建议 `for: 10m`
- 告警（90%）：`> 0.9`，建议 `for: 5m`
- 紧急（100%）：`>= 1`，建议 `for: 2m` + 自动触发 AI 降级

### 4.4 最小演练命令（验证预算指标会增长）
```bash
bash scripts/test/alert-budget-drill.sh
```
期望输出 `OK: increased by ... USD`，并可在 `/metrics` 中看到 `onedish_ai_cost_usd_total` 增加。

---

## 5) 无 monitoring/deploy 目录时的接入步骤（本仓库当前状态）

1. 在基础设施仓库（或运维配置仓）新建规则文件：`prometheus/rules/onedish-alerts.yaml`
2. 将本文 PromQL 转换为 `groups/rules` 结构并提交
3. 在 Alertmanager 配置 OneDish 路由：SEV1/SEV2/SEV3 -> 对应值班渠道
4. 灰度发布规则：先在 staging 触发演练，再推生产
5. 记录规则版本号与生效时间到发布单

---

## 6) 推荐告警元数据（labels/annotations）
```yaml
labels:
  service: onedish
  team: backend
  severity: sev1|sev2|sev3
annotations:
  summary: "OneDish {{ $labels.alertname }}"
  description: "route={{ $labels.route }} value={{ $value }}"
  runbook: "docs/ops/runbook-onedish-alerts.md"
```
