# OneDish 发布前就绪检查清单（2026-02-22）

> 目标：基于当前仓库代码与已有文档，形成可执行、可验收的发布前检查清单，并给出 Go/No-Go 评分。
> 证据来源：
> - `docs/testing/reports/2026-02-22-build-and-smoke-test-report.md`
> - `docs/product/2026-02-22-onedish-launch-architecture-quota-v1.md`
> - `docs/product/2026-02-22-onedish-launch-architecture-quota-v1.1-tech-appendix.md`
> - `backend/src/**`（配置、路由、迁移、日志与指标实现）

---

## 1) 环境配置检查（dev / staging / prod）

### 1.1 Dev（开发环境）
- [x] `NODE_ENV!=production` 时使用 SQLite（`backend/src/config/database.ts`）
- [x] 本地数据库文件存在：`backend/dev.sqlite3`
- [x] `npm run migrate` / `npm run seed` 脚本已定义（`backend/package.json`）
- [x] `/health` 与 `/metrics` 端点可用（`backend/src/index.ts`）
- [x] 日志写入控制台 + 文件（`backend/src/utils/logger.ts`）

### 1.2 Staging（预发环境）
- [ ] 明确并固化预发环境变量模板（建议新增 `backend/.env.staging.example`）
- [ ] 预发数据库必须切 PostgreSQL，禁止沿用 SQLite
- [ ] 预发必须接入与生产同构的 Redis/限流配置（`QUOTA_GLOBAL_*` 等）
- [ ] 预发需开启 `/metrics` 抓取并验证 Grafana 出图
- [ ] 预发发布前执行一次完整 smoke（可复用 `scripts/test/smoke.sh`）

### 1.3 Prod（生产环境）
- [x] 生产数据库配置已支持 PostgreSQL（`DB_HOST/PORT/USER/PASSWORD/NAME`）
- [x] 生产环境 system database 健康接口做了信息收敛（`system.routes.ts`）
- [ ] 生产环境变量清单与密钥注入方式（CI/CD 或 Secret Manager）需形成 Runbook
- [ ] `LOG_LEVEL`、配额阈值、降级开关需在发布前完成审计签字
- [ ] 生产域名 / TLS / 反向代理超时配置需有验收记录

---

## 2) 数据与迁移检查（migrate / seed / 回滚）

### 2.1 迁移现状
- [x] 迁移目录存在且版本化：`backend/src/database/migrations/*.ts`
- [x] 含近期关键迁移：`20260222060001_add_v2_fields_to_shopping_lists.ts`
- [x] 种子数据目录存在：`backend/src/database/seeds/*.ts`

### 2.2 发布前必做
- [ ] **在 staging 执行**：`npm run migrate`，并保留输出日志
- [ ] **在 staging 执行**：`npm run seed`（如预发需要演示/回归数据）
- [ ] 核对迁移后关键表结构：`shopping_lists` V2 字段、`baby_stages`、`user_recipes`
- [ ] 对比迁移前后行数与核心接口可用性（`/recipes/daily`、`/shopping-lists`）

### 2.3 回滚策略（数据库）
- [ ] 在发布脚本中补充显式回滚命令：`knex migrate:rollback`
- [ ] 约定“结构回滚 + 应用版本回滚”双步骤，不允许仅回滚代码
- [ ] 生产发布前完成一次“预发回滚演练”（至少回滚最近 1 个 migration）
- [ ] 高风险迁移（DDL/字段删除）需有备份快照与恢复时间评估（RTO）

> 现状差距：`backend/package.json` 当前未内置 `migrate:rollback` 脚本，建议补齐。

---

## 3) 可观测性检查（日志、指标、告警）

### 3.1 日志
- [x] 统一 logger 已接入，支持 error/combined 文件日志
- [x] errorHandler + requestContext + responseNormalizer 已串联
- [ ] 校验日志目录挂载与轮转策略（当前仅 `maxsize/maxFiles`）
- [ ] 校验生产日志脱敏（PII）规则是否落地（文档有要求，需实测）

### 3.2 指标
- [x] HTTP 请求计数与时延 histogram 已埋点（`middleware/metrics.ts`）
- [x] `/metrics` Prometheus 文本端点已开放
- [x] 配额、路由、缓存等指标命名规范已有文档定义（v1.1 tech appendix）
- [ ] 将文档指标与实际导出指标做逐项对照（避免“定义有、实现缺”）

### 3.3 告警
- [ ] 必配告警：5xx 错误率、P95 延迟、AI 超时率、预算水位（70/85/100）
- [ ] 必配告警：`42901/42902` 突增、`/health` 连续失败
- [ ] 告警需完成“触发-通知-处置-恢复”演练并留痕

---

## 4) 灰度与回滚策略

### 4.1 灰度发布
- [ ] 灰度节奏：`5% -> 20% -> 50% -> 100%`（与架构文档一致）
- [ ] 每一阶段最短观测窗口：30~60 分钟（含错误率/延迟/配额）
- [ ] 灰度期间优先放量低风险租户或内部白名单
- [ ] 灰度期间启用降级开关预案（AI 可随时关闭）

### 4.2 回滚触发条件（建议）
- [ ] 连续 10 分钟：5xx > 1% 或 P95 超阈值 2 倍
- [ ] 核心链路（登录/推荐/周计划/购物清单）任一阻断
- [ ] 配额或限流逻辑误伤率异常（429 激增且无流量增长解释）

### 4.3 回滚执行顺序
1. 入口限流/降级（先止血）
2. 回滚应用版本到上一稳定版本
3. 按迁移策略回滚或恢复数据库快照
4. 执行 smoke 验证并恢复流量

---

## 5) Go / No-Go 打分项（发布闸门）

> 评分规则：每项 0~5 分，权重见下；总分 100。建议阈值：
> - **Go**：≥ 85 且无 P0/P1 阻断
> - **Conditional Go**：75~84（需发布负责人签字+限流灰度）
> - **No-Go**：< 75 或存在未关闭阻断问题

| 维度 | 权重 | 当前评估 | 说明 |
|---|---:|---:|---|
| 构建与基础 smoke | 20 | 18 | 既有报告 7/7 通过，且本次最小验证通过 |
| 环境配置完备度（dev/staging/prod） | 20 | 12 | dev/prod 基础具备，staging 规范与模板待补 |
| 数据迁移与回滚可执行性 | 20 | 11 | migrate/seed 可用，rollback 脚本与演练不足 |
| 可观测性（日志/指标/告警） | 20 | 13 | 日志和基础指标已接入，告警闭环未验收 |
| 灰度与发布运行手册 | 20 | 12 | 策略有文档，执行清单与演练记录不足 |
| **总分** | **100** | **66** | **当前结论：No-Go（需先补齐关键发布项）** |

---

## 6) 本次最小验证命令与结果

- 执行时间：2026-02-22（UTC）
- 命令：

```bash
cd backend && npm run build
```

- 结果：✅ 成功（`tsc` 无报错退出）
- 输出摘要：

```text
> jianjiachu-backend@1.0.0 build
> tsc
```

---

## 7) 发布前 24 小时内建议补齐（可直接执行）

1. 补充 `backend/package.json`：`migrate:rollback` 脚本。
2. 新增 `backend/.env.staging.example` 与 `backend/.env.production.example`（仅占位，不含密钥）。
3. 在 staging 走一遍：`migrate -> seed(可选) -> smoke.sh -> rollback 演练 -> 再 smoke`。
4. 将告警规则配置与值班人写入单独 Runbook（含升级路径）。
5. 依据上述 Go/No-Go 表重新打分，达到门槛后再发版。
