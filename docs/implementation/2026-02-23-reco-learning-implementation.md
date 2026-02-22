# 实现说明：推荐长期学习与自动重算（2026-02-23）

## 改动概览
- 新增学习画像表：`recommendation_learning_profiles`
- 推荐服务：
  - 增加餐次权重配置读取与归一化
  - 增加7/30天衰减反馈信号
  - 增加 profile 优先读取 + 实时回退
  - 新增结构化 `ranking_reasons`
  - 新增 `recomputeRecommendationLearning`（可手动触发）
  - 新增 `startRecommendationLearningScheduler`（定时任务）
- 路由与控制器：新增 `/recommendations/recompute`
- 服务启动：挂载自动重算调度器
- 前端类型：补充 `ranking_reasons` 可选类型

## 关键细节
1. **餐次权重配置化**
   - 默认沿用历史权重。
   - 支持环境变量：
     - `REC_RANK_V2_BREAKFAST_WEIGHT_TIME` 等
     - `REC_RANK_V2_LUNCH_WEIGHT_*`
     - `REC_RANK_V2_DINNER_WEIGHT_*`
   - 启动时读取并归一化，保证总和=1。

2. **衰减策略**
   - 0~7天：权重1.0
   - 8~30天：权重0.35
   - 组合反馈分：`0.7*7d + 0.3*30d`

3. **排序原因稳定输出**
   - `ranking_reasons` 包含 code/label/contribution/detail
   - 先按 contribution 降序，再按 code 字典序，保证稳定
   - `explain` 从 top reason 派生，保持旧字段可读性

4. **自动重算任务**
   - 启动后 15 秒触发一次
   - 默认每 6 小时重算一次
   - 失败吞并，避免影响主服务

## 接口兼容
- 原响应字段未删除。
- 仅新增可选字段，不影响既有客户端反序列化。
