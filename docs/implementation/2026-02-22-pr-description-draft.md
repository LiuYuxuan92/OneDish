# PR Draft: `clean/refactor-shopping-v2` -> `master`

## 标题建议
`feat: stabilize OneDish architecture (shopping-list v2 + quota/metrics + testing standardization)`

## 变更摘要
本 PR 完成了 OneDish 一轮系统化改造，重点包括：

1. **购物清单 V2 重构（兼容旧数据）**
   - 分类统一升级为 V2（`produce/protein/staple/seasoning/snack_dairy/household/other`）
   - 服务层与前端 API 层均做了旧字段兼容映射（避免历史数据渲染异常）

2. **后端核心能力增强（MVP）**
   - 统一响应包络与错误码
   - request_id / route / latency 元信息
   - quota/status 接口与基础配额拦截逻辑
   - search resolve 路由骨架（local/cache/web/ai + degrade）
   - 基础 metrics 暴露（含 `/metrics`）

3. **前端配套改造**
   - 搜索来源展示（Local/Cache/Web/AI）
   - 设置页配额状态展示
   - 基础埋点 SDK 与核心事件接入

4. **测试规范化落地**
   - 一键 smoke 脚本
   - 测试计划/测试报告/模板体系
   - 页面回归与专项回归报告补齐
   - staging 回滚演练报告（migrate -> smoke -> rollback -> smoke -> restore）

## 关键文档（评审建议必看）
- `docs/implementation/2026-02-22-final-cleanup-report.md`
- `docs/implementation/2026-02-22-staging-rollback-drill-report.md`
- `docs/testing/reports/2026-02-22-shopping-list-v2-test-report.md`
- `docs/product/2026-02-22-onedish-launch-architecture-quota-v1.1-tech-appendix.md`

## 测试与验证
- backend: `npm run build` ✅
- frontend: `npm run type-check` ✅
- smoke: `bash scripts/test/smoke.sh` ✅（7/7）
- rollback drill: ✅（已恢复至可开发状态）

## 风险与限制
1. quota/cache 当前仍有内存态实现（多实例一致性需 Redis 化完善）
2. 告警门禁尚需接入完整监控平台（见告警清单）
3. 页面级真机交互回归建议在合并前再补一轮

## 回滚方案
- 代码回滚：回退 PR
- 数据回滚：`npx knex migrate:rollback`
- 验证：回滚后执行 `bash scripts/test/smoke.sh`

## 合并建议
- 建议先由研发+测试进行评审
- 评审通过后，在低峰窗口合并
- 合并后立即执行 smoke + 关键页面抽测
