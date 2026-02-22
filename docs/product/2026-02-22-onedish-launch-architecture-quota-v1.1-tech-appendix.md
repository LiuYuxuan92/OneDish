# OneDish 上线架构与配额策略 v1.1 技术附录

- 版本：v1.1
- 日期：2026-02-22
- 关联文档：`docs/product/2026-02-22-onedish-launch-architecture-quota-v1.md`
- 目的：给研发直接落地的接口定义（API 契约 + Redis Key Schema + Prometheus 指标名）

---

## 1) API 契约（v1）

统一响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "meta": {
    "request_id": "req_...",
    "route": "local|cache|web|ai",
    "latency_ms": 123
  }
}
```

统一错误：

```json
{
  "code": 42901,
  "message": "quota exceeded",
  "error": {
    "type": "QUOTA_EXCEEDED",
    "retry_after_sec": 3600,
    "hint": "upgrade tier or wait"
  },
  "meta": {"request_id": "req_..."}
}
```

### 1.1 搜索/推荐总入口（网关路由）

`POST /api/v1/search/resolve`

Request:
```json
{
  "query": "20分钟晚餐",
  "intent_type": "recommendation",
  "freshness_required": false,
  "user_tier": "free",
  "context": {
    "baby_age_months": 18,
    "allergens": ["peanut"],
    "inventory_ids": ["inv_1"]
  }
}
```

Response(data):
```json
{
  "items": [],
  "route_used": "local",
  "cache_hit": false,
  "degrade_level": 0
}
```

### 1.2 配额查询

`GET /api/v1/quota/status`

Response(data):
```json
{
  "user_id": "u_123",
  "tier": "free",
  "daily": {
    "web_used": 13,
    "web_limit": 50,
    "ai_used": 3,
    "ai_limit": 5
  },
  "reset_at": "2026-02-23T00:00:00Z"
}
```

### 1.3 购物清单 V2

`GET /api/v1/shopping-lists/:id`

Response(data):
```json
{
  "id": "sl_001",
  "schema_version": 2,
  "items": {
    "produce": [],
    "protein": [],
    "staple": [],
    "seasoning": [],
    "snack_dairy": [],
    "household": [],
    "other": []
  }
}
```

### 1.4 常用错误码

- `40001` 参数非法
- `40101` 未认证
- `40301` 无权限
- `40401` 资源不存在
- `40901` 状态冲突
- `42901` 用户配额超限
- `42902` 全局配额超限
- `50301` 上游不可用（已降级）
- `50401` 上游超时

---

## 2) Redis Key Schema（v1）

命名规范：`onedish:{env}:{module}:{scope}:{id}`

### 2.1 配额与限流

- 用户日配额计数
  - `onedish:prod:quota:user:{userId}:{yyyyMMdd}`
  - hash fields: `web_used`, `ai_used`, `web_limit`, `ai_limit`
  - TTL: 到次日 00:10

- 全局日配额计数
  - `onedish:prod:quota:global:{yyyyMMdd}`
  - hash fields: `web_used`, `ai_used`, `budget_used_usd`

- 用户令牌桶
  - `onedish:prod:ratelimit:user:{userId}:{route}`
  - string/int（剩余 token）

- 全局并发闸门
  - `onedish:prod:concurrency:{route}`
  - string/int

### 2.2 缓存

- 搜索结果缓存
  - `onedish:prod:cache:search:{sha1(query+context+tier)}`
  - value: JSON（items + meta）
  - TTL: 5m/30m/24h（按策略）

- 菜谱详情缓存
  - `onedish:prod:cache:recipe:{recipeId}`
  - TTL: 24h

- 购物清单聚合缓存
  - `onedish:prod:cache:shopping:{userId}:{listId}`
  - TTL: 10m（写操作后主动失效）

### 2.3 幂等与任务

- 写接口幂等键
  - `onedish:prod:idempotency:{requestId}`
  - TTL: 24h

- 异步任务状态
  - `onedish:prod:job:{jobId}`
  - hash fields: `status`, `progress`, `error`

---

## 3) Prometheus 指标名（v1）

### 3.1 请求与延迟

- `onedish_http_requests_total{route,method,status}` (counter)
- `onedish_http_request_duration_ms_bucket{route,le}` (histogram)
- `onedish_router_route_total{route_used,intent_type}` (counter)
- `onedish_router_degrade_total{degrade_level,reason}` (counter)

### 3.2 配额与限流

- `onedish_quota_user_used_total{channel,type,tier}` (counter)
- `onedish_quota_global_used_total{type}` (counter)
- `onedish_quota_reject_total{level,user_tier,type}` (counter)
- `onedish_ratelimit_reject_total{scope,route}` (counter)

### 3.3 缓存

- `onedish_cache_hit_total{layer,key_type}` (counter)
- `onedish_cache_miss_total{layer,key_type}` (counter)
- `onedish_cache_latency_ms_bucket{layer,op,le}` (histogram)

### 3.4 上游与AI

- `onedish_upstream_requests_total{provider,endpoint,status}` (counter)
- `onedish_upstream_latency_ms_bucket{provider,endpoint,le}` (histogram)
- `onedish_ai_tokens_total{model,direction}` (counter) // direction=input|output
- `onedish_ai_cost_usd_total{model}` (counter)
- `onedish_ai_fallback_total{from,to,reason}` (counter)

### 3.5 业务质量（关键）

- `onedish_recommendation_accept_total{tier}` (counter)
- `onedish_shopping_action_total{action,category}` (counter)
- `onedish_shopping_render_error_total{reason}` (counter)

---

## 4) 实施建议（落地顺序）

1. 先落统一响应与错误码中间件。
2. 再接入 Redis 配额键 + 限流键。
3. 第三步接 Prometheus 指标（HTTP/路由/配额先行）。
4. 最后补业务指标与看板。

---

## 5) 验收清单

- [ ] API 响应结构与错误码符合本附录
- [ ] Redis key 命名与 TTL 生效
- [ ] 关键 Prom 指标可抓取并在 Grafana 出图
- [ ] 配额超限返回 `42901/42902` 且包含 `retry_after_sec`
- [ ] 购物清单 V2 `schema_version=2` 数据可稳定返回
