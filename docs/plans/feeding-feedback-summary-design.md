# Feeding Feedback Summary Design

日期：2026-03-08
状态：draft / 可继续落地
范围：在已上线的最小版喂养反馈基础上，补足“最近记录可持续浏览”和“按菜谱聚合回看”能力，为后续推荐解释与周计划轻接入做准备。

---

## 1. 背景

当前系统已经支持最小版喂养反馈：
- 创建用餐反馈 `POST /api/v1/feeding-feedbacks`
- 查看最近反馈 `GET /api/v1/feeding-feedbacks/recent`

但仍有两个明显缺口：
1. 最近记录只有简单 `limit`，无法继续分页浏览；
2. 缺少按 recipe 聚合后的摘要视图，不利于在推荐解释、计划回顾、菜谱详情里复用。

本轮目标是优先把 backend 能力补齐，前端/小程序后续只需最小接入。

---

## 2. 目标

### 2.1 本轮目标
- `recent` 接口支持 `limit + offset` 分页；
- 新增 `summary` 接口，返回按 recipe 聚合的反馈摘要；
- 保持现有 API 风格，不破坏既有创建/查询契约；
- 输出字段足够支撑后续推荐解释的轻接入。

### 2.2 非目标
- 不做复杂成长曲线；
- 不在本轮直接改推荐排序；
- 不引入新的学习画像表；
- 不改动既有 config 或大范围前端结构。

---

## 3. API 设计

## 3.1 最近反馈分页

### 接口
`GET /api/v1/feeding-feedbacks/recent`

### Query
- `limit`：1~20，默认 10
- `offset`：>=0，默认 0
- `recipe_id`：可选，按菜谱过滤

### 返回
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 23,
      "has_more": true
    }
  }
}
```

### 设计说明
- 沿用已有 `items` 风格；
- 新增 `pagination`，不影响旧调用方读取 `data.items`；
- 为避免大偏航，本轮先用 offset 分页，不引入 cursor。

---

## 3.2 菜谱聚合摘要

### 接口
`GET /api/v1/feeding-feedbacks/summary`

### Query
- `limit`：1~20，默认 10

### 返回
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "recipe_id": "recipe-1",
        "recipe_name": "番茄鸡蛋面",
        "recipe_image_url": ["https://..."],
        "feedback_count": 3,
        "like_count": 2,
        "ok_count": 1,
        "reject_count": 0,
        "allergy_count": 0,
        "latest_feedback_at": "2026-03-08T12:00:00.000Z",
        "latest_accepted_level": "like",
        "average_baby_age_at_feedback": 11.3
      }
    ]
  }
}
```

### 字段用途
- `feedback_count`：表示该菜谱已被尝试多少次；
- `like/ok/reject_count`：支持推荐解释或菜谱详情页摘要；
- `allergy_count`：给风险提示，不直接等于过敏诊断；
- `latest_*`：支持“最近一次表现”；
- `average_baby_age_at_feedback`：保留时间维度概念，避免 8 个月和 18 个月反馈完全混看。

---

## 4. Backend 实现建议

### 4.1 service 层
文件：`backend/src/services/feedingFeedback.service.ts`

新增能力：
- `listRecentFeedbacks({ user_id, limit, offset, recipe_id })`
- `listRecipeSummaries({ user_id, limit })`

原则：
- 仍以 backend 作为业务中心；
- 先基于已有 `feeding_feedbacks + recipes` join 实现；
- 不新建平行表。

### 4.2 controller / routes
文件：
- `backend/src/controllers/feedingFeedback.controller.ts`
- `backend/src/routes/feedingFeedback.routes.ts`

新增：
- `GET /recent` 支持 `offset`
- `GET /summary` 返回聚合摘要

### 4.3 测试
文件：`backend/src/services/__tests__/feedingFeedback.service.test.ts`

至少覆盖：
- 最近反馈分页；
- recipe 过滤；
- 聚合摘要计数正确；
- 平均月龄与过敏计数正确。

---

## 5. 后续可继续的小步

### 5.1 推荐解释轻接入
在 `/recipes/daily` 或 `/recipes` explanation 中增加弱提示，例如：
- “宝宝最近 3 次对这道菜接受度较高”
- “这类口味最近更容易接受”

注意：
- 只做 explanation，不要本轮直接大改排序；
- 有 `allergy_count > 0` 时，解释应更偏保守提醒。

### 5.2 菜谱详情页接入
在 frontend / miniprogram 的 recipe detail 中展示：
- 最近一次反馈
- 累计喜欢/一般/拒绝次数

### 5.3 周计划回顾
在 meal plan 完成后的回顾页展示：
- 本周尝试的新菜数
- 接受度较高的菜谱
- 需要谨慎回避的记录

---

## 6. 风险与约束

1. 不把主观拒绝和真实过敏混成同一判断逻辑；
2. 不在 frontend / miniprogram 各写一套聚合规则；
3. 不为了 summary 新建过重的数据模型；
4. 如果后续数据量上来，再考虑 SQL 聚合 / 物化优化，本轮先以可用为先。

---

## 7. 一句话结论

喂养成长最小版之后，最合理的一小步不是直接上复杂画像，而是先把“最近反馈分页 + 按 recipe 聚合摘要”补齐。这样既能让记录真正可回看，也为下一步推荐解释和计划回顾预留稳定 backend 基础。
