# Redis 生产化补强计划（2026-02-23）

## 目标
1. 梳理 quota/cache 关键路径，补齐 Redis 原子一致实现。
2. 增加 Redis 故障注入与降级验证，确保主流程不中断。
3. 补充 env 配置项与默认值文档。

## 范围
- 用户配额、全局配额：通过 Lua 保证检查+扣减原子性。
- 搜索缓存：统一 key 生成，优先 Redis，失败回退内存。
- 幂等键：为 `POST /api/v1/search/resolve` 增加 `Idempotency-Key` 支持，防重复提交。
- Redis 故障注入：支持连接/读写/eval 注入，验证 fail-soft。

## 关键路径梳理
- 搜索入口：`routes/search.routes.ts` -> `services/search.service.ts`
- 配额扣减：`services/quota.service.ts` -> `services/redis.service.ts#evalQuotaConsume`
- 搜索缓存：`services/search.service.ts#getCache/setCache`
- Redis key 规范：`services/redis-key.service.ts`

## 实施步骤
1. 先补齐 Redis 服务能力（raw get/set、幂等 begin、故障注入开关）。
2. 新增幂等服务，并接入 `search/resolve` 路由。
3. 补充 `.env.example` 默认项与说明。
4. 增加专项 smoke（>=5 用例）验证原子、冲突、降级。
5. 执行 build / type-check / smoke / 专项并产出报告。

## 风险与回滚
- 风险：幂等冲突返回 409 可能影响旧调用方。
- 缓解：仅在带 `Idempotency-Key` 时启用；不带头行为保持不变。
- 回滚：移除 route 幂等接入与新增服务文件即可恢复。