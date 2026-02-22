# OneDish 监控接入与 Alertmanager 联调指南（staging）

> 日期：2026-02-22  
> 目标：完成 OneDish 在 staging 的“规则接入 + 路由配置 + 告警联调”最小可执行落地。

---

## 1. 适用范围与前置条件

- 服务：`onedish-backend`
- 环境：`staging`
- 指标源：Prometheus 已可抓取 `/metrics`
- 已有关键指标（至少）：
  - `onedish_ai_cost_usd_total`
  - `onedish_http_requests_total`
  - `onedish_quota_reject_total`
  - `onedish_ratelimit_reject_total`

仓库内对应配置样例：
- recording rules：`monitoring/alerts/onedish-recording-rules.yaml`
- Alertmanager 路由：`monitoring/alerts/alertmanager-routing-example.yaml`

---

## 2. Recording Rule（含 onedish_ai_daily_budget_usd）

核心 recording rule：

```yaml
- record: onedish_ai_daily_budget_usd
  expr: vector(50)
  labels:
    service: onedish-backend
    env: staging
```

说明：
- 该规则将每日预算以时间序列形式暴露，供告警表达式直接引用。
- `50` 为 staging 示例值，请按环境预算改为真实值。

推荐配套规则（见样例文件）：
- `onedish_ai_cost_usd_1d`：1 天累计成本
- `onedish_ai_budget_usage_ratio`：预算使用率
- `onedish_http_429_increase_10m`：10 分钟 429 总量

---

## 3. 告警规则示例（PrometheusRule）

以下规则可与 recording rule 组合使用：

```yaml
groups:
  - name: onedish.alerts
    rules:
      - alert: OneDishAiBudgetHigh
        expr: onedish_ai_budget_usage_ratio{service="onedish-backend",env="staging"} > 0.7
        for: 10m
        labels:
          service: onedish-backend
          env: staging
          severity: sev3
        annotations:
          summary: "OneDish AI budget > 70%"
          description: "预算使用率超过 70%，请评估是否需要限流或降级。"

      - alert: OneDishAiBudgetCritical
        expr: onedish_ai_budget_usage_ratio{service="onedish-backend",env="staging"} >= 1
        for: 2m
        labels:
          service: onedish-backend
          env: staging
          severity: sev1
        annotations:
          summary: "OneDish AI budget exhausted"
          description: "预算使用率达到或超过 100%，建议立即启用 AI 降级策略。"

      - alert: OneDish429Surge
        expr: onedish_http_429_increase_10m{service="onedish-backend",env="staging"} > 100
        for: 2m
        labels:
          service: onedish-backend
          env: staging
          severity: sev2
        annotations:
          summary: "OneDish 429 surge in 10m"
          description: "10 分钟内 429 总量超过阈值，请检查配额与限流。"
```

---

## 4. Alertmanager 路由配置示例

关键策略：
- 按 `service + env + severity` 路由到 staging 值班渠道
- sev1 抑制同类 sev2/sev3，减少噪音
- 所有 receiver 打开 `send_resolved: true`

仓库样例：`monitoring/alerts/alertmanager-routing-example.yaml`

重点片段：

```yaml
- matchers:
    - service="onedish-backend"
    - env="staging"
    - severity="sev1"
  receiver: onedish-staging-sev1
```

---

## 5. staging 联调步骤（触发 -> 收到通知 -> 恢复）

### Step 1) 触发告警

建议优先演练预算相关告警（低风险）：
1. 临时把 `onedish_ai_daily_budget_usd` 从 `50` 调低到 `1`（仅 staging）
2. 运行预算演练脚本（或人工触发 AI 请求流量）
   ```bash
   bash scripts/test/alert-budget-drill.sh
   ```
3. 在 Prometheus UI 验证：
   - `onedish_ai_budget_usage_ratio` 持续高于阈值
   - 目标 alert 进入 `pending -> firing`

### Step 2) 收到通知

在 Alertmanager/UI/通知渠道中确认：
- 告警名称正确（如 `OneDishAiBudgetHigh`）
- 标签完整：`service/env/severity`
- 路由命中目标 receiver（如 `onedish-staging-sev3`）
- 告警消息包含 summary/description

### Step 3) 恢复与关闭

恢复方式二选一：
- 将 `onedish_ai_daily_budget_usd` 调回原值（例如 50）
- 或停止触发流量，等待窗口回落

然后确认：
- Prometheus 告警状态从 `firing` 退出
- Alertmanager 发送 resolved 通知（`send_resolved: true`）
- 记录“触发时间 / 恢复时间 / MTTA / MTTR”

---

## 6. 联调产出与归档

建议每次演练至少归档：
- 触发命令与参数
- Prometheus 查询截图（表达式 + 时间区间）
- Alertmanager 命中路由截图
- 通知渠道消息截图（firing + resolved）

可使用模板：
- `docs/implementation/templates/alert-staging-drill-report-template.md`

---

## 7. 常见问题排查

1. **规则加载失败**：先看 Prometheus rule manager 报错（语法/标签）。
2. **告警不触发**：检查查询窗口、`for` 时长、数据稀疏问题。
3. **通知未送达**：检查 Alertmanager 路由匹配条件与 receiver URL。
4. **恢复通知缺失**：确认 receiver 配置了 `send_resolved: true`。
