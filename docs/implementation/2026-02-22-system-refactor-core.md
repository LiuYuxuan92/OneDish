# OneDish 核心后端能力改造实施记录（MVP）

- 日期：2026-02-22
- 范围：统一响应/错误码、配额接口、基础配额拦截、路由决策骨架、Prom 指标基础集、Redis Key Schema
- 状态：已完成 MVP（可编译、可运行、可扩展）

## 1. 本次改造内容

### 1.1 统一响应与错误码中间件

新增：
- `src/middleware/requestContext.ts`
- `src/middleware/responseNormalizer.ts`
- `src/config/error-codes.ts`

改造：
- `src/middleware/errorHandler.ts`
- `src/index.ts`

能力：
- 每个请求注入 `request_id`（支持透传 `x-request-id`）
- 统一返回结构并补齐 `meta.request_id / meta.route / meta.latency_ms`
- 错误码统一为业务码（如 `40001/42901/42902/50301/50401`）

### 1.2 配额查询接口 `/api/v1/quota/status`

新增：
- `src/routes/quota.routes.ts`
- `src/services/quota.service.ts`

实现：
- 返回用户当前 tier 的日配额使用情况（web/ai）与 `reset_at`
- 返回对应 Redis Key（用于运维与排障对照）

### 1.3 基础配额计数与拦截（用户级 + 全局级）

新增：
- `src/services/quota.service.ts`

在搜索路由决策中接入：
- 用户级：`web / ai` 日调用上限
- 全局级：`web / ai` 日调用上限
- 超限后记录拒绝指标，进入降级返回

### 1.4 路由决策骨架 + 降级返回

改造：
- `src/services/search.service.ts`
- `src/routes/search.routes.ts`

新增入口：
- `POST /api/v1/search/resolve`

决策顺序（MVP）：
1. cache
2. local
3. web（受 web quota 控制）
4. ai（受 ai quota 控制）
5. degrade（返回空结果 + `degrade_level=2`）

响应带：
- `route_used`（`local/cache/web/ai`）
- `cache_hit`
- `degrade_level`

### 1.5 Prometheus 指标基础集

新增：
- `src/services/metrics.service.ts`
- `src/middleware/metrics.ts`

改造：
- `src/index.ts` 增加 `GET /metrics`

已落地指标（基础集）：
- HTTP：`onedish_http_requests_total`、`onedish_http_request_duration_ms`
- 路由：`onedish_router_route_total`、`onedish_router_degrade_total`
- 配额：`onedish_quota_user_used_total`、`onedish_quota_global_used_total`、`onedish_quota_reject_total`
- 缓存：`onedish_cache_hit_total`、`onedish_cache_miss_total`、`onedish_cache_latency_ms`
- 上游：`onedish_upstream_requests_total`、`onedish_upstream_latency_ms`

### 1.6 Redis Key Schema（quota/cache/rate limit）

新增：
- `src/services/redis-key.service.ts`

Key 命名统一：
- `onedish:{env}:quota:user:{userId}:{yyyyMMdd}`
- `onedish:{env}:quota:global:{yyyyMMdd}`
- `onedish:{env}:ratelimit:user:{userId}:{route}`
- `onedish:{env}:cache:search:{sha1(...)}`
- `onedish:{env}:cache:recipe:{recipeId}`
- `onedish:{env}:cache:shopping:{userId}:{listId}`

## 2. 兼容性与稳定性

为避免破坏现有流程：
- 保持原有搜索接口 `GET /api/v1/search` 与 `GET /api/v1/search/source/:source`
- 在统一响应中兼容已返回 `code/message/data` 的旧路由
- 保留现有限流中间件行为，并修复超限异常传递（`next(err)`）

## 3. 验证结果

已执行：
1. `cd backend && npm run build` ✅
2. `cd backend && node scripts/test-search.js` ✅

结果：
- TypeScript 编译通过
- 搜索冒烟脚本通过

## 4. MVP 限制与 TODO

当前为最小可行实现（MVP），以下待下一步增强：

1. **Redis 真正接入**
   - 当前 quota/cache 使用进程内内存 Map（单实例有效）
   - TODO：接入 Redis 客户端，按 Key Schema 落真实 TTL 与原子计数

2. **Prometheus 客户端增强**
   - 当前为轻量自实现 exporter
   - TODO：切换 `prom-client`（含默认进程指标、注册器、label 校验）

3. **配额错误码细分返回**
   - 当前超限后主要通过降级兜底
   - TODO：在强制路径（如仅 AI 模式）直接返回 `42901/42902` + `retry_after_sec`

4. **路由策略参数化**
   - 当前为代码内策略
   - TODO：接入配置中心（intent allowlist、timeout、degrade level 等）

5. **全链路 request_id 透传**
   - 当前已在 API 层注入
   - TODO：透传到下游调用（web/ai adapter headers）与业务日志统一字段
