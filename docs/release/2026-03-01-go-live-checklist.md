# OneDish 上线日检查单（Go-Live Checklist）

- 日期：2026-03-01
- 适用：发布窗口 T-60min ~ T+120min

---

## A. 配置项检查（发布前）
- [ ] `NODE_ENV=production`（生产）/ `staging`（预发）
- [ ] 数据库连接（PG）可连通，账号最小权限
- [ ] Redis/缓存连接可用（若启用）
- [ ] 限流/配额阈值已复核（QUOTA_GLOBAL_*）
- [ ] 日志级别与脱敏策略已确认
- [ ] `/health`、`/metrics` 可访问

## B. 数据库迁移检查
- [ ] 执行 `npm run migrate` 并保留日志
- [ ] 核验关键表：
  - [ ] `shopping_list_shares`
  - [ ] `meal_plan_shares`
  - [ ] `share_invite_revocations`
  - [ ] `metrics_events`
- [ ] 若需演示数据：执行 `npm run seed`
- [ ] 回滚命令已准备并实测（至少 staging）

## C. 发布脚本/命令检查
- [ ] 后端构建通过：`npm run build`
- [ ] 前端构建通过：`npm run build`
- [ ] 后端全量校验：`npm run verify`
- [ ] 前端全量校验：`npm run verify`
- [ ] smoke 脚本可执行：`scripts/test/smoke.sh`

## D. 监控告警检查
- [ ] 错误率告警在线
- [ ] 关键接口 P95 告警在线
- [ ] 429 激增告警在线
- [ ] 业务指标面板可读：
  - [ ] avg_quality_score
  - [ ] swap_success_rate
  - [ ] share_join_success
- [ ] 值班群与升级路径明确

## E. 回滚命令（必须就绪）
- [ ] 应用版本回滚命令可执行（按部署平台）
- [ ] DB 回滚命令可执行（Knex / 快照恢复）
- [ ] 发生回滚时的通知模板可直接发送

---

## 发布窗口执行记录

| 时间(UTC) | 操作 | 结果 | 执行人 | 备注 |
|---|---|---|---|---|
|  | 发布开始 |  |  |  |
|  | Phase-0 5% |  |  |  |
|  | Phase-1 20% |  |  |  |
|  | Phase-2 50% |  |  |  |
|  | 全量 100% |  |  |  |

---

## 结论签字
- Release Owner：__________
- Backend Oncall：__________
- QA：__________
- Product/Ops：__________

- 最终结论：`Go / No-Go`
