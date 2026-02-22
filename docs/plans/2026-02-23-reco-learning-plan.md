# 推荐长期学习与自动重算方案（2026-02-23）

## 目标
1. 将反馈驱动排序从临时计算升级为可持续策略（可配置、可衰减、可重算）。
2. 输出稳定 explain 与结构化排序原因字段。
3. 不破坏现有推荐接口结构（向后兼容）。

## 范围
- 权重配置化（按早餐/午餐/晚餐分配 time/inventory/baby/feedback 权重）。
- 引入近7天与近30天衰减信号。
- 增加自动重算（定时）与手动触发重算。

## 设计
### 数据层
新增表 `recommendation_learning_profiles`：
- `user_id + meal_type` 唯一
- `weight_config`：该餐次当前权重快照
- `signal_snapshot`：7/30天衰减反馈统计
- `computed_at`：最近重算时间

### 计算层
- 反馈读取优先 profile；无 profile 时实时回退计算。
- 7天窗口权重=1，8-30天权重=0.35（衰减）。
- 输出 `feedback_score = 0.7*adoption_7d + 0.3*adoption_30d`。

### 排序层
- 餐次权重：`REC_RANK_V2_{MEAL}_WEIGHT_*`（meal 可为 BREAKFAST/LUNCH/DINNER）。
- 打分公式保持4维：time/inventory/baby/feedback。
- 新增稳定字段 `ranking_reasons[]`（按贡献度降序）。

### 任务层
- 服务启动后 15s 首次重算。
- 周期重算间隔 `REC_RECOMPUTE_INTERVAL_MS`（默认6小时）。
- 手动触发接口：`POST /api/v1/meal-plans/recommendations/recompute`。

## 兼容策略
- 保留原有 `explain`、`switch_hint`、`vs_last`。
- 新增字段为可选，不影响旧前端。

## 验收
- backend build 通过
- frontend type-check 通过
- smoke：推荐/反馈/重算链路可用
- 专项测试 >= 5 项
