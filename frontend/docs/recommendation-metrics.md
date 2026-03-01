# Recommendation Metrics（前端口径）

本文定义 Home 推荐链路在前端侧的可执行指标口径，统一事件映射和维度约定，便于埋点校验与看板对齐。

> 事件来源统一说明：本文件涉及的主链路事件（`recommend_quality_scored` / `recommend_swap_click` / `swap_success` 等）已统一通过前端 metrics SDK 上报到后端 `/metrics/events`。本地 `trackMainFlowEvent` 日志仅作调试与降级兜底，不再作为唯一数据来源。

## 1. 事件与字段基线

当前核心事件：

- `home_view`
- `recommend_quality_scored`
- `recommend_swap_click`
- `swap_success`
- `shopping_list_generate_click`
- `cooking_start_click`

关键维度字段（建议必传）：

- `experimentBucket`：A/B 分桶（优先真实登录 `userId` 计算，缺失时用本地稳定 bucket）
- `swapConfigSource`：`remote` / `local` / `default`
- `recommendationSource`：`daily` / `swap`
- `recipeId`
- `userId`（可为空，匿名流量为 `null`）

> 注：`experimentBucket` 与 `swapConfigSource` 作为本批新增关键维度，是后续策略评估最小闭环。

---

## 2. 指标定义

### 2.1 `avg_quality_score`

- 含义：推荐质量综合分均值
- 分子：`sum(qualityScore)`，取自事件 `recommend_quality_scored.extras.qualityScore`
- 分母：`count(recommend_quality_scored)`
- 公式：

```text
avg_quality_score = sum(qualityScore) / count(recommend_quality_scored)
```

- 维度建议：`experimentBucket`, `swapConfigSource`, `recommendationSource`

### 2.2 `swap_success_rate`

- 含义：用户点击换菜后，推荐卡片“真正替换并渲染成功”的比率
- 事件口径：
  - `recommend_swap_click`：点击行为（意图）
  - `swap_success`：成功行为（结果），仅在推荐卡完成替换并渲染后上报
- 分子：`count(swap_success)`
- 分母：`count(recommend_swap_click)`
- 公式：

```text
swap_success_rate = count(swap_success) / count(recommend_swap_click)
```

- 维度建议：`experimentBucket`, `swapConfigSource`
- `swap_success` 必传字段：
  - `timestamp`
  - `userId`（可空）
  - `source` / `screen`
  - `prevRecipeId`
  - `nextRecipeId`
  - `experimentBucket`
  - `swapConfigSource`

### 2.3 `timeFit_avg`

- 含义：时间匹配维度得分均值
- 分子：`sum(scoreBreakdown.timeFit)` 或 `sum(timeFit)`
- 分母：`count(recommend_quality_scored)`
- 公式：

```text
timeFit_avg = sum(timeFit) / count(recommend_quality_scored)
```

### 2.4 `nutritionFit_avg`

- 含义：营养匹配维度得分均值
- 分子：`sum(scoreBreakdown.nutritionFit)` 或 `sum(nutritionFit)`
- 分母：`count(recommend_quality_scored)`
- 公式：

```text
nutritionFit_avg = sum(nutritionFit) / count(recommend_quality_scored)
```

### 2.5 `preferenceFit_avg`

- 含义：偏好匹配维度得分均值
- 分子：`sum(scoreBreakdown.preferenceFit)` 或 `sum(preferenceFit)`
- 分母：`count(recommend_quality_scored)`
- 公式：

```text
preferenceFit_avg = sum(preferenceFit) / count(recommend_quality_scored)
```

### 2.6 `stageFit_avg`

- 含义：月龄/阶段匹配维度得分均值
- 分子：`sum(scoreBreakdown.stageFit)` 或 `sum(stageFit)`
- 分母：`count(recommend_quality_scored)`
- 公式：

```text
stageFit_avg = sum(stageFit) / count(recommend_quality_scored)
```

---

## 3. 事件映射表（前端）

| 指标 | 主要事件 | 字段路径 |
|---|---|---|
| avg_quality_score | recommend_quality_scored | `extras.qualityScore` |
| timeFit_avg | recommend_quality_scored | `extras.scoreBreakdown.timeFit`（兼容 `extras.timeFit`） |
| nutritionFit_avg | recommend_quality_scored | `extras.scoreBreakdown.nutritionFit`（兼容 `extras.nutritionFit`） |
| preferenceFit_avg | recommend_quality_scored | `extras.scoreBreakdown.preferenceFit`（兼容 `extras.preferenceFit`） |
| stageFit_avg | recommend_quality_scored | `extras.scoreBreakdown.stageFit`（兼容 `extras.stageFit`） |
| swap_success_rate | recommend_swap_click / swap_success | `count(swap_success) / count(recommend_swap_click)` |

---

## 4. 维度切片规范

至少支持以下切片：

1. `experimentBucket`：A / B
2. `swapConfigSource`：remote / local / default

推荐补充：

- `recommendationSource`：daily / swap
- `screen`：HomeScreen（便于后续跨页面扩展）

---

## 5. 数据质量检查（前端自测建议）

1. 匿名态进入首页：应存在稳定 bucket，`swapConfigSource` 至少为 `default`
2. 登录态进入首页：同一 `userId` 重复访问 bucket 保持稳定
3. 配置远端不可用（超时/失败）：`swapConfigSource` 仍可回落到 `local` 或 `default`
4. `recommend_quality_scored` 需同时带 `qualityScore` 与维度分项字段

---

## 6. 口径边界说明

- 本文仅定义“前端可执行口径”；最终生产看板可在服务端增加更严格会话关联策略。
- 主链路事件统一进入 `/metrics/events` 后，服务端可按同一口径聚合灰度与正式流量。
- 当前已落地 `swap_success` 标准事件，`swap_success_rate` 采用标准事件分子计算；`recommend_swap_click` 保留为点击意图指标。
