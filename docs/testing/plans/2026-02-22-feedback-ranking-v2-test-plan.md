# 反馈驱动推荐排序 V2 测试计划（2026-02-22）

## 1. 测试目标

验证反馈驱动重排 V2 的正确性、兼容性与可观测性：
- 推荐结果是否输出 `explain` 与 `vs_last`；
- 是否按餐次隔离应用反馈；
- 近 7 天采纳率、拒绝原因是否影响排序；
- 权重可配置是否生效；
- 不破坏现有构建与 smoke。

## 2. 测试范围

- 后端：`mealPlan.service.ts` 推荐排序逻辑、反馈统计读取、响应结构。
- 前端：`WeeklyPlanScreen` 推荐弹窗展示 explain / vs_last。
- 集成：推荐请求 + 反馈写入 + 再次推荐的链路。

## 3. 前置条件

1. 数据库迁移已执行（含 `recommendation_feedbacks`）。
2. 后端、前端依赖安装完成。
3. 可获取 guest token 并访问推荐接口。

## 4. 测试项

### 4.1 基础构建与回归
1. `backend` build 成功。
2. `frontend` type-check 成功。
3. `scripts/test/smoke.sh` 通过。

### 4.2 V2 专项验证（至少 4 条）

#### 用例 A：输出字段完整性
- 步骤：请求 `POST /meal-plans/recommendations`（meal_type=lunch）。
- 断言：每个推荐项存在：
  - `explain`（数组，长度 >=1）
  - `vs_last`（字符串）

#### 用例 B：餐次隔离学习
- 步骤：
  1) 写入 lunch 大量 `NONE + 时间不够` 反馈；
  2) breakfast 不写入或写入相反反馈；
  3) 分别请求 lunch 与 breakfast 推荐。
- 断言：
  - lunch explain 出现时间偏好相关描述；
  - breakfast 不应被 lunch 反馈显著影响（文案/排序差异）。

#### 用例 C：近 7 天采纳率影响
- 步骤：
  1) 在 dinner 写入近 7 天高采纳反馈；
  2) 对照组（低采纳或无反馈）进行请求。
- 断言：高采纳组推荐项 explain 包含“近期同餐次采纳率高”或同义说明，排序分值提升。

#### 用例 D：拒绝原因影响（库存）
- 步骤：
  1) 写入 lunch `NONE + 家里没食材`；
  2) 请求 lunch 推荐。
- 断言：排序更偏向缺口食材更少项；explain 包含库存覆盖相关说明。

#### 用例 E：vs_last 差异摘要
- 步骤：连续两次请求同一 meal_type，改变条件（如 max_prep_time）。
- 断言：第二次推荐的 `vs_last` 为非首次文案，并包含“主推荐变化/耗时变化/缺口变化”等信息。

#### 用例 F：权重可配置
- 步骤：调整 `REC_RANK_V2_WEIGHT_TIME` 为高值后重启后端，重复请求。
- 断言：更短时长菜品更容易上升，explain 中时间相关理由出现频率提高。

## 5. 退出标准

- 基础构建与 smoke 全部通过；
- 专项验证至少 4 条通过（本次目标 6 条）；
- 无新增阻断级问题。