## 标题
feat: stabilize OneDish architecture (shopping-list v2 + quota/metrics + testing standardization)

---

## 背景与目标
本 PR 聚焦 OneDish 上线前的稳定性改造，目标是：
- 统一购物清单 V2 分类并确保历史数据兼容
- 补齐后端最小可观测与配额能力
- 完成前端展示与埋点配套
- 通过规范化测试与回滚演练降低上线风险

---

## 主要变更

### 1) 购物清单 V2 重构（兼容旧数据）
- 分类统一为：`produce/protein/staple/seasoning/snack_dairy/household/other`
- 服务层和前端 API 层均加入旧字段映射兼容
- 目标：避免历史数据在新版本下出现分类丢失、渲染异常

### 2) 后端核心能力增强（MVP）
- 统一响应包络与错误码
- 响应元信息：`request_id` / `route` / `latency`
- 配额能力：`quota/status` 接口与基础拦截逻辑
- 搜索编排：`local/cache/web/ai` + degrade 路由骨架
- 指标暴露：基础 metrics（含 `/metrics`）

### 3) 前端配套改造
- 搜索结果来源标识（Local / Cache / Web / AI）
- 设置页展示配额状态
- 基础埋点 SDK 与核心事件接入

### 4) 测试规范化落地
- 一键 smoke 脚本
- 测试计划 / 报告 / 模板体系
- 页面回归与专项回归报告补齐
- staging 回滚演练完成（migrate -> smoke -> rollback -> smoke -> restore）

---

## 评审建议必看文档
- `docs/implementation/2026-02-22-final-cleanup-report.md`
- `docs/implementation/2026-02-22-staging-rollback-drill-report.md`
- `docs/testing/reports/2026-02-22-shopping-list-v2-test-report.md`
- `docs/product/2026-02-22-onedish-launch-architecture-quota-v1.1-tech-appendix.md`

---

## 验证记录
- backend: `npm run build` ✅
- frontend: `npm run type-check` ✅
- smoke: `bash scripts/test/smoke.sh` ✅（7/7）
- rollback drill: ✅（已恢复至可开发状态）

---

## 风险与限制
1. quota/cache 仍有内存态实现，多实例一致性需 Redis 化
2. 告警门禁需接入实际监控平台（见 `docs/ops/alert-rules-promql.md`）
3. 合并前建议再补一轮关键页面真机回归

---

## 回滚方案
- 代码回滚：回退 PR
- 数据回滚：`npx knex migrate:rollback`
- 回滚后验证：`bash scripts/test/smoke.sh`

---

## 合并与发布建议
- 先由研发 + 测试联合评审
- 通过后在低峰窗口合并
- 合并后立即执行 smoke + 关键页面抽测 + 告警链路联调

---

## PR 检查清单
- [ ] 代码评审通过
- [ ] CI 通过（build / type-check / smoke）
- [ ] 回滚路径已二次确认
- [ ] 告警规则已配置并完成一次演练
- [ ] 值班人确认 Runbook 可执行
