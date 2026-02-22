# 反馈驱动推荐排序 V2 实现说明（2026-02-22）

## 1. 实现概览

本次按“文档先行 + 实现 + 测试 + 报告”完成了推荐排序 V2 最小可用版本：
- 后端：接入反馈驱动排序，新增 explain / vs_last 输出，保持 API 兼容。
- 前端：在推荐结果弹窗展示 explain 与“与上次不同点”。
- 测试：完成 build / type-check / smoke 与专项验证。

## 2. 后端改动

文件：`backend/src/services/mealPlan.service.ts`

### 2.1 排序升级（V2）
- 将智能推荐从纯启发式升级为多维加权：
  - 时间（time）
  - 库存（inventory）
  - 宝宝适配（baby）
  - 反馈（feedback）
- 支持环境变量配置权重：
  - `REC_RANK_V2_WEIGHT_TIME`
  - `REC_RANK_V2_WEIGHT_INVENTORY`
  - `REC_RANK_V2_WEIGHT_BABY`
  - `REC_RANK_V2_WEIGHT_FEEDBACK`

### 2.2 反馈信号接入
- 新增按用户 + 餐次 + 近 7 天读取反馈：
  - 采纳率 `adoptionRate`
  - 拒绝原因关键词（时间压力/库存不足/宝宝相关）
- 严格餐次隔离：breakfast/lunch/dinner 分开统计和使用。

### 2.3 输出字段增强
- 推荐项新增：
  - `explain: string[]`
  - `vs_last: string`
- `explain` 由高贡献维度生成，例如：
  - 近期同餐次采纳率高
  - 准备时间更短
  - 库存覆盖更好，缺口食材更少
  - 宝宝月龄适配更好
- `vs_last` 为简版摘要：首次/基本一致/主推荐与耗时缺口变化。

### 2.4 API 兼容
- 旧字段全部保留；
- 新增 `ranking_v2` 元信息（enabled、window、weights）；
- 老客户端可忽略新增字段，不影响现有流程。

## 3. 前端改动

### 3.1 类型定义
文件：`frontend/src/api/mealPlans.ts`
- `SmartRecommendationItem` 增加：
  - `explain?: string[]`
  - `vs_last?: string`

### 3.2 推荐弹窗展示
文件：`frontend/src/screens/plan/WeeklyPlanScreen.tsx`
- 在 A/B 方案卡片中新增：
  - 推荐理由（explain 拼接）
  - 与上次不同（vs_last）
- UI 采用最简可见方案，便于测试与验收。

## 4. 文档与测试产物

- 方案文档：`docs/plans/2026-02-22-feedback-ranking-v2-plan.md`
- 测试计划：`docs/testing/plans/2026-02-22-feedback-ranking-v2-test-plan.md`
- 测试报告：`docs/testing/reports/2026-02-22-feedback-ranking-v2-test-report.md`
- 本实现文档：`docs/implementation/2026-02-22-feedback-ranking-v2-implementation.md`

## 5. 已知限制（MVP）

- `vs_last` 使用进程内存快照，不持久化；服务重启后会重置。
- 拒绝原因分类为关键词规则，后续可升级为更细粒度标签体系。