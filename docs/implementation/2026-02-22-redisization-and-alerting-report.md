# OneDish Redis 化与最小告警门禁实施报告（2026-02-22）

## 1. 实施目标

在不改变现有 API 契约的前提下，完成以下最小可行改造：

1. quota / search cache 从内存态升级为 **Redis 优先**
2. Redis 不可用时自动降级到内存模式（记录日志与指标）
3. 提供可直接接入的 PrometheusRule 告警样例，覆盖：5xx / P95 / 429 / budget

---

## 2. 改动文件

### Backend

- `backend/src/services/redis.service.ts`（新增）  
  - 提供 Redis 连接、JSON 读写、mget、配额 Lua 原子消费能力
  - 内置 fallback 状态机（ready/fallback/disabled）
  - Redis 异常时记录 warning 并上报 `onedish_redis_fallback_total`

- `backend/src/services/quota.service.ts`（改造）  
  - `consume` 改为异步：Redis 优先执行 Lua 原子计数 + TTL
  - user/global 配额 key 按 `:web` / `:ai` 维度拆分
  - Redis 不可用时回退到原有内存 Map 逻辑
  - `getStatus` 改为异步：优先从 Redis 汇总读取，失败回退内存

- `backend/src/services/search.service.ts`（改造）  
  - L2 查询缓存从内存 Map 改为 Redis 优先
  - `getCache/setCache` 封装为 async；Redis 写失败自动落回本地 Map
  - 保持 `resolve/search/searchFromSource` 返回结构不变

- `backend/src/routes/quota.routes.ts`（改造）  
  - `/quota/status` 路由改为 async，适配 `quotaService.getStatus` 异步化
  - 响应结构保持不变（`code/message/data`）

- `backend/src/services/metrics.service.ts`（改造）  
  - 新增计数器：`onedish_redis_fallback_total`

- `backend/package.json` / `backend/package-lock.json`（改造）  
  - 新增依赖：`redis@^4.7.0`

### Monitoring/Alert

- `monitoring/alerts/onedish-rules.yaml`（新增）  
  - `OneDishHigh5xxRate`
  - `OneDishHighP95Latency`
  - `OneDishTooMany429`
  - `OneDishQuotaBudgetPressure`（以 global quota reject 近似预算压力）

---

## 3. 配置样例（最小可用）

> 可用于容器环境变量或 `.env` 管理系统中。

```bash
# Redis 开关（默认 true）
REDIS_ENABLED=true

# 二选一：优先 REDIS_URL
REDIS_URL=redis://127.0.0.1:6379

# 或者 host/port 组合
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 现有全局配额上限（保留）
QUOTA_GLOBAL_WEB_LIMIT=200000
QUOTA_GLOBAL_AI_LIMIT=50000
```

---

## 4. 验证结果

### 4.1 backend build

在 `backend/` 执行：

```bash
npm run build
```

结果：**通过**（TypeScript 编译成功）

### 4.2 frontend type-check

在 `frontend/` 执行：

```bash
npm run type-check
```

结果：**通过**

### 4.3 smoke

在仓库根目录执行：

```bash
bash scripts/test/smoke.sh
```

结果：**7/7 全通过**

- backend/fronted 服务可达
- auth/guest、recipes、meal-plans、shopping-lists 接口冒烟通过

---

## 5. API 契约影响评估

- `search` 相关接口：**无返回字段变化**
- `quota/status`：顶层契约保持 `code/message/data`，并保留原有关键字段；新增 `global_daily` 为向后兼容的增强信息
- 其余路由：未改动

---

## 6. 回滚方案

若线上出现异常，可按以下最小影响路径回滚：

1. **快速软回滚（不改代码）**：设置 `REDIS_ENABLED=false`，服务将自动使用内存兜底路径
2. **代码回滚**：回退以下文件到改造前版本
   - `backend/src/services/quota.service.ts`
   - `backend/src/services/search.service.ts`
   - `backend/src/routes/quota.routes.ts`
   - `backend/src/services/metrics.service.ts`
   - 删除 `backend/src/services/redis.service.ts`
   - 删除 `monitoring/alerts/onedish-rules.yaml`
3. 执行验证：`backend build + frontend type-check + smoke`

---

## 7. 备注

本次为“最小可行改造”：

- 优先保证主流程稳定与可回退
- Redis 失效不会阻断核心链路
- 告警规则提供可直接接入样例，可按生产阈值继续微调
