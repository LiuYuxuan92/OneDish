# OneDish 灰度发布计划（Canary）

- 文档版本：v1.0
- 日期：2026-03-01
- 目标：在控制风险前提下完成增量发布，并在异常时快速回滚

---

## 1. 发布分批策略

## 1.1 分批节奏（建议）
1. Phase-0（内部）: 5% 流量 / 白名单用户（30 分钟）
2. Phase-1: 20% 流量（30~60 分钟）
3. Phase-2: 50% 流量（60 分钟）
4. Phase-3: 100% 全量

> 每阶段必须满足“观察指标不过阈值”才可升批。

## 1.2 放量前置条件
- UAT 通过（无 P0/P1）
- 数据库迁移完成并回滚预案可执行
- 监控与告警在线（错误率、耗时、业务指标）
- 值班与沟通群到位

---

## 2. 观察指标与口径

## 2.1 必看指标（硬性）
1. `avg_quality_score`
   - 口径：`AVG(user_recipes.quality_score)`（按发布窗口）
2. `swap_success_rate`
   - 口径：`swap_success / recommend_swap_click`
3. 错误率（Error Rate）
   - 口径：`5xx / 总请求`
4. 关键接口耗时（P95）
   - 推荐接口、换菜接口、购物清单共享接口、周计划共享接口

## 2.2 建议观察（辅助）
- `share_join_success` 事件量
- 429 比例（限流误伤）
- `api_request_failed` 事件量

## 2.3 建议 SQL/查询（示例）
```sql
-- swap_success_rate（最近30分钟）
SELECT
  SUM(CASE WHEN event_name='swap_success' THEN 1 ELSE 0 END)::float /
  NULLIF(SUM(CASE WHEN event_name='recommend_swap_click' THEN 1 ELSE 0 END),0) AS swap_success_rate
FROM metrics_events
WHERE event_time >= NOW() - INTERVAL '30 minutes';

-- avg_quality_score（已发布内容）
SELECT AVG(quality_score) AS avg_quality_score
FROM user_recipes
WHERE status='published';
```

---

## 3. 回滚阈值（任一触发即回滚）

1. 错误率连续 10 分钟 > 1%
2. 关键接口 P95 > 基线 2 倍 且持续 10 分钟
3. `swap_success_rate` 低于基线 -20% 且持续两个观察窗口
4. 共享主链路失败（加入/移除/邀请码失效）出现 P0 权限问题
5. `avg_quality_score` 异常突降（相对近 7 日均值下降 > 30%，且非数据延迟导致）

---

## 4. 回滚步骤（可执行）

1. 立即冻结升批，停止继续放量
2. 开启降级（若可用）：AI/推荐降级到稳定路径
3. 回滚应用版本到上一稳定版本
4. 如涉及迁移兼容问题，执行数据库回滚或恢复快照
5. 运行 smoke + 核心 UAT 抽样复验
6. 在群内发布“回滚完成 + 影响范围 + 下一步”

---

## 5. 发布当天沟通模板

## 5.1 开始发布
```text
[OneDish 灰度发布开始]
版本: <version>
阶段: Phase-0 (5%)
时间: <UTC time>
观察窗口: 30分钟
值班: <owner / backend / qa>
```

## 5.2 升批通知
```text
[OneDish 灰度升批]
从 <phase-x> 升至 <phase-y>
理由: 关键指标稳定（error_rate / p95 / swap_success_rate / avg_quality_score）
下一观察点: <time>
```

## 5.3 异常与回滚
```text
[OneDish 灰度异常回滚]
触发阈值: <具体指标>
动作: 已停止放量并回滚到 <stable_version>
影响范围: <users / duration>
后续: 根因分析预计 <ETA>
```

---

## 6. 角色分工
- Release Owner：升批/冻结/回滚最终决策
- Backend Oncall：接口与数据库处置
- QA：UAT 抽样复验 + 指标复核
- Product/Ops：外部口径与风险确认

---

## 7. Go/No-Go 判定（灰度）
- Go：所有必看指标在阈值内，且无 P0/P1 事件
- No-Go：触发任一回滚阈值或关键链路不可用
