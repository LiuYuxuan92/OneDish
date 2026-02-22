# OneDish 上线架构与配额策略 v1（可开发实现）

- 版本：v1.0
- 日期：2026-02-22
- 适用阶段：公测上线（可平滑升级到正式版）
- 目标：在“可控成本、可观测、可降级”的前提下，支撑 OneDish 请求链路（本地/缓存/联网/AI）稳定上线。

---

## 1. 目标与约束

### 1.1 目标

1. **高可用**：核心功能可用性 ≥ 99.9%。
2. **低延迟**：P95 响应时延（非 AI）< 800ms；AI 路径 P95 < 6s。
3. **成本可控**：按用户层级限制 AI 调用，设置全局预算闸门。
4. **可治理**：支持灰度、动态配置、按路径降级与熔断。

### 1.2 非目标（v1 不做）

- 多活跨地域强一致。
- 复杂计费对账（分钟级精确账单可在 v2 完善）。
- 细粒度多模型自动竞价路由（仅做规则优先级路由）。

---

## 2. 总体架构

```text
Client
  -> API Gateway (鉴权/限流/路由标记)
    -> Router Service (本地/缓存/联网/AI 决策)
      -> Local Engine (规则/模板/本地知识)
      -> Cache Layer (L1 内存 + L2 Redis)
      -> Web Connector (联网检索/第三方 API)
      -> AI Orchestrator (模型网关/提示词/重试)
    -> Response Normalizer (统一响应协议)
  -> Metrics/Logs/Traces + Budget Controller
```

### 2.1 核心组件职责

- **API Gateway**：
  - JWT/OAuth 鉴权、租户识别、请求 ID 注入。
  - 用户级与全局级限流（令牌桶 + 并发闸门）。
- **Router Service**：
  - 根据策略进行路径选择：`LOCAL -> CACHE -> WEB -> AI`。
  - 支持策略热更新（配置中心）。
- **Cache Layer**：
  - L1：进程内缓存（短 TTL，低延迟）。
  - L2：Redis（跨实例共享）。
- **AI Orchestrator**：
  - 模型选择、超时控制、重试、响应截断、安全过滤。
- **Budget Controller**：
  - 统计 token/cost，用于日预算与熔断闸门。

---

## 3. 请求路由策略（本地/缓存/联网/AI）

### 3.1 路由优先级

默认优先级：

1. **本地（Local）**：规则、模板、静态知识可直接命中。
2. **缓存（Cache）**：相同语义请求且缓存有效时返回。
3. **联网（Web）**：需要最新信息或外部数据时走联网检索。
4. **AI（LLM）**：复杂生成、总结、推理任务。

### 3.2 决策输入

- `intent_type`：faq / recipe / recommendation / summary / open_qa
- `freshness_required`：是否需要实时信息
- `user_tier`：free / pro / enterprise
- `risk_level`：低/中/高（决定是否允许 AI）
- `cache_hit`：缓存命中情况

### 3.3 可执行路由伪代码

```pseudo
if local_rule_match(req):
    return LOCAL

if cache.exists(cache_key) and !req.force_refresh:
    return CACHE

if req.freshness_required == true:
    if web_quota_available():
        return WEB

if ai_quota_available(user, global) and risk_policy_allow(req):
    return AI

return DEGRADED_FALLBACK
```

### 3.4 路由超时建议

- Local：50~150ms
- Cache：20~80ms
- Web：1.5~3s
- AI：3~8s（硬超时 10s）

超时按路径独立控制，超时后触发下一层降级（见第 6 节）。

---

## 4. 限流限额规则（用户级 / 全局级）

> 原则：先限流（保护系统），再限额（控制成本）。

### 4.1 用户级（User-level）

#### 4.1.1 QPS/QPM 限流（令牌桶）

- Free：
  - `10 req/min`
  - 突发桶容量：`5`
- Pro：
  - `60 req/min`
  - 突发桶容量：`20`
- Enterprise：
  - `300 req/min`
  - 突发桶容量：`80`

#### 4.1.2 AI 调用限额

- Free：`20 次/日` 或 `60k tokens/日`（先到先停）
- Pro：`300 次/日` 或 `1.2M tokens/日`
- Enterprise：按合同配置（默认 `5M tokens/日`）

#### 4.1.3 并发限制

- 单用户 AI 并发：
  - Free：1
  - Pro：3
  - Enterprise：10

### 4.2 全局级（Global-level）

#### 4.2.1 集群总吞吐保护

- 全局入口限流：`2000 req/s`（按环境可调）
- AI 下游并发闸门：`max_concurrency = 500`

#### 4.2.2 全局成本闸门（日预算）

- 日预算：`$800/day`（示例）
- 水位策略：
  - 70%：告警
  - 85%：限制 Free 新 AI 请求，仅保留缓存/本地/联网
  - 100%：AI 全局熔断，仅白名单租户可用

### 4.3 限流返回策略

- 触发用户级限流：`429 TOO_MANY_REQUESTS`
- 触发全局闸门：`429 GLOBAL_RATE_LIMITED` 或 `503 AI_UNAVAILABLE`
- 返回 `Retry-After` 秒数，便于客户端退避。

---

## 5. 缓存策略

### 5.1 缓存分层

- **L1（进程内）**：
  - 适合热点短文本
  - TTL：30s~120s
- **L2（Redis）**：
  - 跨实例共享
  - TTL：5min~24h（按内容类型）

### 5.2 Key 设计

```text
cache:{env}:{tenant}:{route}:{hash(normalized_query + context_version)}
```

- `normalized_query`：去空格、大小写、同义词归一
- `context_version`：知识库/提示词版本，避免脏读

### 5.3 TTL 建议

- 稳定 FAQ：24h
- 菜谱/推荐模板：6h
- 联网检索结果：10~30min
- AI 生成结果：30~120min（可按质量评分调整）

### 5.4 缓存一致性策略

- 采用“**最终一致** + 主动失效”：
  - 知识库更新触发 `context_version++`
  - 关键配置更新后批量失效对应前缀 Key
- 防击穿：
  - 单飞（singleflight）合并同 key 并发请求
- 防雪崩：
  - TTL 增加随机抖动（±10%）

---

## 6. 降级策略（Degradation）

### 6.1 触发条件

- AI 超时率 > 15%（5min 窗口）
- AI 下游 5xx > 10%
- 全局预算达到阈值（85%/100%）
- Redis 故障、Web Connector 故障

### 6.2 降级等级

- **L0（正常）**：全链路可用
- **L1（轻度降级）**：
  - AI 超时缩短（10s -> 6s）
  - 禁用高成本模型，仅保留低成本模型
- **L2（中度降级）**：
  - Free 禁止 AI，仅返回本地+缓存+联网
  - Pro 限制 AI 并发与最大输出 tokens
- **L3（重度降级）**：
  - AI 全部关闭，返回模板化结果与解释文案
  - 关键接口只读模式

### 6.3 降级回退（恢复）

- 使用滞后阈值防抖（如错误率恢复到 <5% 且持续 10min 才升级）
- 分租户灰度恢复（10% -> 30% -> 100%）

---

## 7. 错误码与响应规范

### 7.1 统一响应结构

```json
{
  "request_id": "req_123",
  "code": "OK",
  "message": "success",
  "data": {},
  "meta": {
    "route": "CACHE",
    "latency_ms": 142,
    "cache_hit": true,
    "quota": {
      "user_remaining": 18,
      "reset_at": "2026-02-23T00:00:00Z"
    }
  }
}
```

### 7.2 错误码定义（v1）

| code | HTTP | 含义 | 客户端动作 |
|---|---:|---|---|
| OK | 200 | 成功 | 正常展示 |
| BAD_REQUEST | 400 | 参数错误 | 提示用户修正 |
| UNAUTHORIZED | 401 | 未登录/令牌无效 | 重新登录 |
| FORBIDDEN | 403 | 无权限 | 提示升级或联系管理员 |
| TOO_MANY_REQUESTS | 429 | 用户级限流 | 指数退避重试 |
| GLOBAL_RATE_LIMITED | 429 | 全局限流 | 稍后重试 |
| QUOTA_EXCEEDED | 429 | 用户额度耗尽 | 展示额度用尽信息 |
| AI_UNAVAILABLE | 503 | AI 服务不可用/熔断 | 切换非 AI 结果 |
| WEB_CONNECTOR_FAILED | 502 | 外部数据源失败 | 回退缓存或本地 |
| TIMEOUT | 504 | 上游超时 | 重试或降级 |
| INTERNAL_ERROR | 500 | 内部错误 | 重试并上报 |

### 7.3 重试规范

- 仅对 `502/503/504` 自动重试。
- 最大重试次数：2。
- 退避：`200ms, 600ms`（带 jitter）。
- 幂等接口需传 `Idempotency-Key`。

---

## 8. 配置项清单（建议放配置中心）

### 8.1 路由配置

- `router.local.enabled=true`
- `router.cache.enabled=true`
- `router.web.enabled=true`
- `router.ai.enabled=true`
- `router.ai.intent_allowlist=[summary, recommendation, open_qa]`

### 8.2 限流限额配置

- `rate_limit.user.free.rpm=10`
- `rate_limit.user.pro.rpm=60`
- `rate_limit.global.rps=2000`
- `quota.ai.free.daily_calls=20`
- `quota.ai.free.daily_tokens=60000`
- `quota.ai.pro.daily_tokens=1200000`

### 8.3 缓存配置

- `cache.l1.ttl_sec=60`
- `cache.l2.redis.url=redis://...`
- `cache.ttl.faq_sec=86400`
- `cache.ttl.web_sec=1800`
- `cache.ttl.ai_sec=3600`

### 8.4 降级与熔断

- `degrade.ai.timeout_ms=10000`
- `degrade.ai.error_rate_threshold=0.15`
- `degrade.ai.breaker.open_sec=60`
- `budget.daily_usd=800`
- `budget.warn_ratio=0.7`
- `budget.limit_ratio=0.85`

### 8.5 可观测性

- `observability.trace.sample_rate=0.1`
- `observability.log.redact_pii=true`
- `observability.metrics.namespace=onedish.prod`

---

## 9. 成本预算模型（可实现）

### 9.1 成本组成

`总成本 = AI token 成本 + 联网 API 成本 + 基础设施成本`

- AI 成本：
  - `cost_ai = input_tokens/1k * in_price + output_tokens/1k * out_price`
- 联网成本：
  - `cost_web = 请求次数 * 单次调用价格`
- 基础设施：
  - Redis、网关、计算实例按日折算

### 9.2 日预算估算公式

```text
daily_cost = Σ(user_tier_requests × ai_ratio × avg_cost_per_ai_req)
           + web_requests × web_cost_per_req
           + infra_daily_fixed_cost
```

### 9.3 示例参数（可在上线前校准）

- DAU：50,000
- 人均请求：8/日
- AI 渗透率：15%
- 单次 AI 平均成本：$0.0025
- 联网请求占比：20%，单次 $0.0004
- 固定基础设施：$120/日

估算：

- 总请求：400,000
- AI 请求：60,000 -> $150
- 联网请求：80,000 -> $32
- 固定成本：$120
- **合计：$302/日**（低于 $800 闸门，留有峰值余量）

### 9.4 预算控制动作

- 实时累计成本写入 `budget_usage` 指标。
- 达到 70%/85%/100% 自动触发策略（告警/限流/熔断）。
- 每日 UTC 00:00 重置用户日额度。

---

## 10. 上线检查清单（Go-Live Checklist）

### 10.1 功能与稳定性

- [ ] 路由链路（Local/Cache/Web/AI）集成测试通过
- [ ] 限流限额单测 + 压测通过（含边界值）
- [ ] 缓存命中率达到预期（>35%）
- [ ] 熔断/降级演练完成（L1/L2/L3）

### 10.2 性能与容量

- [ ] 峰值压测达到 2 倍预估流量
- [ ] P95/P99 延迟在目标内
- [ ] Redis/网关/模型并发容量评估完成

### 10.3 可观测性与告警

- [ ] 指标：QPS、错误率、超时率、AI 成本、缓存命中率
- [ ] 日志脱敏（PII）生效
- [ ] Trace 可追到 request_id 全链路
- [ ] 告警规则（预算、错误率、熔断）已验证

### 10.4 运营与回滚

- [ ] 灰度计划（5% -> 20% -> 50% -> 100%）
- [ ] 一键关闭 AI 开关可用
- [ ] 版本回滚脚本与 runbook 完整
- [ ] 值班表与故障升级流程确认

---

## 11. v1 实施建议（两周）

- **第 1 周**：
  - 完成路由器、限流器、缓存层、统一响应协议
  - 打通可观测性与预算统计
- **第 2 周**：
  - 完成降级熔断、压测、灰度发布、上线演练

建议先以“低风险租户 + Pro 用户”灰度，观测 24 小时后全量。

---

## 12. 附录：关键指标 SLO（v1）

- 可用性：99.9%
- 非 AI 请求 P95：< 800ms
- AI 请求 P95：< 6s
- 5xx 错误率：< 0.5%
- AI 超时率：< 8%
- 缓存命中率：> 35%
- 预算偏差：< ±10%

> 本文档为 v1 可开发落地版本，后续可在 v2 引入：按场景动态模型路由、精细化计费、跨地域容灾增强。