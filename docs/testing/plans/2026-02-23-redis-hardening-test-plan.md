# Redis 生产化补强测试计划（2026-02-23）

## 测试目标
验证 Redis 生产化补强后：
- 配额逻辑原子一致；
- 缓存与幂等键行为正确；
- Redis 故障下可平滑降级；
- 不破坏现有构建与基础 smoke。

## 测试清单
1. **Backend build**：`cd backend && npm run build`
2. **Frontend type-check**：`cd frontend && npm run type-check`
3. **Smoke**：`cd backend && npx tsx scripts/ugc-quality-smoke.ts`
4. **Redis 专项（>=5）**：`cd backend && npx tsx scripts/redis-hardening-smoke.ts`

## Redis 专项用例
- TC01 用户配额命中上限拒绝
- TC02 全局配额命中上限拒绝
- TC03 搜索缓存 key 稳定性与 tier 隔离
- TC04 Redis 故障注入（eval/get/set/mget）下配额降级放行
- TC05 幂等键重复请求 replay
- TC06 幂等键同 key 不同 payload 冲突
- TC07 Redis quota 脚本故障返回可控结果（不抛异常）

## 通过标准
- build/type-check/smoke 全绿；
- Redis 专项全部通过；
- 无阻断级回归。