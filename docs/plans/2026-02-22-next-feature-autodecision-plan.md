# OneDish 下一功能自动决策方案（2026-02-22）

## 1. 自动决策结论
本轮选择功能：**“三餐智能推荐埋点闭环 v1”**（后端事件接收 + 数据落库 + 前端关键事件上报）。

## 2. 决策依据（简明）
对候选项做了价值/风险/可验证性评估：
1. **指标看板规范已定义，但链路未闭环**：`frontend/src/analytics/sdk.ts` 已上报 `/metrics/events`，后端尚无对应路由，导致数据断点。
2. **高价值**：直接支撑《metrics dashboard spec》的核心目标（可观测、可归因、可复盘），尤其是推荐入口使用率。
3. **低风险**：不改动核心交易链路，仅新增路由与表；失败不阻塞主流程。
4. **一轮可交付**：可在一轮内完成开发、迁移、验证，并纳入 smoke 之外的专项验证。

## 3. 与下厨房对标视角
- **差异化点**：OneDish 强调“家庭决策 + 宝宝适配 + A/B 推荐”的闭环追踪，不只统计内容浏览。
- **差异化点**：事件模型包含推荐上下文（meal_type、是否有忌口/宝宝月龄条件），方便做家庭场景分析。
- **本轮不做项（明确）**：不做下厨房式社区互动埋点（评论、话题、达人关系链）；不做复杂推荐排序模型升级；不做 BI 大屏实现。

## 4. 范围（In Scope）
- 新增 `/api/v1/metrics/events` 接口。
- 新增 `metrics_events` 存储表。
- 新增 `smart_recommendation_requested / smart_recommendation_viewed` 前端上报。
- Prometheus 指标补充 `onedish_product_events_total`。

## 5. 验收标准
- 合法事件可写入库并返回 200。
- 非法事件名返回 400。
- 缺失必填字段返回 400。
- `backend build`、`frontend type-check`、`smoke` 全通过。
