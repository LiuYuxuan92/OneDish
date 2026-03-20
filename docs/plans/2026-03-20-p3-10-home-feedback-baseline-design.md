# P3-10 Home Feedback Baseline Convergence Design

**Goal:** 在不重做首页的前提下，把 P3-10 Task 2 的首页反馈回流能力收敛成一个小而清晰、可评审的实现闭环。

**Scope:** 仅处理首页推荐上的反馈摘要展示链路：获取最近反馈、映射成展示状态、在推荐理由附近显示 recap block，并把测试聚焦到这条行为本身。不借此任务重构整个首页，也不顺手清理与 P3-10 无关的大量首页功能。

## Problem

当前 `p3-10-resume` worktree 里的首页文件已经带有更大范围的首页改造历史。即使反馈摘要能力本身工作正常，review 时仍会被整页其它状态和逻辑噪音干扰，导致 Task 2 难以被当作“一个独立、最小、可评审的增量”通过。

## Recommended Approach

采用“最小收敛”方案：
- 保留当前首页主体结构，不重写首页
- 仅把 P3-10 Task 2 必需的反馈摘要链路保留为一个独立闭环
- 让测试只覆盖 feedback summary 的页面状态契约，不扩大到整页行为
- 对明显属于本轮尝试产生的噪音逻辑做减法，但不借机重构首页其它功能

这是最合适的方案，因为它：
- 改动最小
- 最符合当前继续推进 P3-10 的目标
- 最不容易引入新的首页回归

## Alternatives Considered

### 方案 A：最小收敛（推荐）
只保留 feedback summary 需要的状态、拉取、映射、展示和测试。

优点：
- 改动最小
- 容易 review
- 最快继续 Task 3 / Task 4

缺点：
- 首页整体不会因此完全变干净
- 只是把 P3-10 Task 2 这一条链路收干净

### 方案 B：重建首页最小骨架后再重加 P3-10

优点：
- review 最干净

缺点：
- 代价高
- 风险大
- 实质接近重做首页，不适合当前节奏

### 方案 C：跳过收敛，继续做 Task 3 / 4

优点：
- 眼前最快

缺点：
- review 噪音继续累积
- 后续更难收口

## Convergence Boundaries

### 必须保留的内容

以下属于 P3-10 Task 2 的最小闭环，必须保留：
- `recommendationFeedbackSummary` 页面状态
- `api.getRecentFeedingFeedback({ recipe_id, limit: 3 })`
- `summarizeFeedbackState(items)`
- 推荐理由附近的小 recap block
- 无 summary 时完全不显示 recap

### 不再围绕它们扩展的内容

以下内容即使仍存在于首页文件中，也不应继续成为本次 Task 2 的实现中心：
- swap / undo 能力链
- membership banner
- hero cover / shortcut grid
- 收藏 / 加采购 / 分享动作
- 与 feedback summary 无关的首页交互优化

原则是：
- 如果是当前尝试新增出来、但与 Task 2 无关的明显噪音，可删
- 如果是基线已有结构，不借 P3-10 任务名义做大重构

## Minimal Implementation Shape

### `home.js`

聚焦于这条最小链路：
1. recommendation load / apply
2. 拉取 recent feedback
3. 通过 `summarizeFeedbackState(items)` 映射
4. 写入 `recommendationFeedbackSummary`

不在这次任务里继续扩大其它首页状态面。

### `home.wxml`

在推荐理由附近渲染一个小 recap block：
- 有 summary 时显示
- 无 summary 时不显示
- 只展示必要信息，不引入新的复杂交互

### `home.wxss`

只保留 recap block 需要的最小样式：
- accepted / rejected / retry 的轻量状态样式
- 不单独引入新的大卡片体系

## Testing Strategy

测试只围绕 feedback summary 这条行为链，不扩大到整页复杂交互。

### 保留的测试重点
- `loadTodayRecommendation` / `applyRecommendation` 后会写入 `recommendationFeedbackSummary`
- `like` -> `accepted`
- `reject` -> `rejected`
- no feedback -> `null`

### 不再承担的测试职责
- 不用 `home-feedback-summary.test.js` 证明整个首页工作正常
- 不把 swap/undo、收藏、会员、hero 等行为混入这份测试
- 不把它升级成整页全链路集成测试

## Acceptance Criteria

满足以下条件即可认为这次“基线收敛”完成：
- reviewer 能清楚看出 Task 2 只是在首页加 feedback 回流展示
- `home-feedback-summary.test.js` 聚焦 feedback summary 本身
- `home.js` 里与 Task 2 无关的本轮噪音不再扩散
- Task 1 + Task 2 相关测试输出清晰且聚焦

## Out of Scope

这次收敛明确不做：
- 首页整体重构
- swap/undo 完整再设计
- membership / hero / shortcut 清理
- 把首页所有历史噪音一次性消灭
- P3-10 Task 3 / Task 4 的实际实现
