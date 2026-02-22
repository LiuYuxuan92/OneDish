# Redis 生产化补强实现说明（2026-02-23）

## 实现概览
本次补强围绕“原子一致 + 降级韧性 + 可配置”展开：

1. **Redis 服务增强**（`backend/src/services/redis.service.ts`）
   - 新增 `getRaw/setRaw`，供幂等场景读写结构化 payload。
   - 新增故障注入开关 `REDIS_FAULT_INJECT_MODE`（connect/get/set/mget/eval/all/off）。
   - 保留并强化 fallback 语义：异常仅触发降级，不中断主流程。
   - 增加 `evalIdempotencyBegin` Lua：同 key 原子判断 proceed/replay/conflict。

2. **幂等键能力新增**
   - `backend/src/services/redis-key.service.ts`：新增 `idempotency(namespace, key)`。
   - `backend/src/services/idempotency.service.ts`：
     - begin：按请求体指纹控制重复请求；
     - complete：写入 done payload；
     - replay：命中后直接回放。
     - Redis 不可用时回退内存实现。

3. **搜索路由接入幂等**（`backend/src/routes/search.routes.ts`）
   - `POST /resolve` 读取 `Idempotency-Key`。
   - `replay`：直接返回缓存响应，并附带 `X-Idempotency-Replayed: true`。
   - `conflict`：返回 409（`ErrorCodes.CONFLICT`）。
   - 未带头：保持原有行为，不影响存量调用。

4. **配置文档补齐**
   - 新增 `backend/.env.example`，补充 Redis/Quota/Idempotency 默认项。

5. **专项验证脚本**
   - 新增 `backend/scripts/redis-hardening-smoke.ts`，覆盖 7 个 Redis 强相关测试点。

## 关键路径说明
- 用户配额 / 全局配额：`quota.service.consume -> redis.evalQuotaConsume(lua)`
- 搜索缓存：`search.service.getCache/setCache`（Redis 优先，内存兜底）
- 幂等键：`search.routes -> idempotency.service -> redis.evalIdempotencyBegin`

## 非目标
- 未接入真实告警链路联调（按任务要求排除）。