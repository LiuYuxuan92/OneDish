# 推荐反馈闭环 V1 方案（2026-02-22）

## 1. 目标与范围

目标：打通「系统推荐结果」与「用户真实选择」，形成可被统计和后续迭代消费的反馈数据闭环。

本期范围（V1 最小可用）：
- 后端新增推荐反馈记录接口
- 后端新增近 7 天反馈统计接口（采纳率、拒绝原因 TOP）
- 前端在推荐结果弹窗增加反馈交互（采纳 A / 采纳 B / 不采纳+原因）
- 前端在设置页展示近 7 天采纳率

非目标（V1 不做）：
- 不做个性化模型实时重排
- 不做管理后台复杂分析面板
- 不做反馈纠错/撤销流程

---

## 2. 数据模型设计

新增表：`recommendation_feedbacks`

字段：
- `id`：主键 UUID
- `user_id`：用户 ID
- `meal_type`：餐次（breakfast/lunch/dinner/all-day）
- `selected_option`：用户选择（A/B/NONE）
- `reject_reason`：不采纳原因（当 selected_option=NONE 可填）
- `event_time`：用户行为时间戳（客户端可传，服务端兜底 now）
- `created_at`：落库时间

索引：
- `user_id`
- `event_time`
- `(user_id, event_time)`

---

## 3. 接口设计

### 3.1 记录反馈

`POST /api/v1/meal-plans/recommendations/feedback`

请求示例：
```json
{
  "meal_type": "lunch",
  "selected_option": "A",
  "reject_reason": "",
  "event_time": "2026-02-22T15:30:00.000Z"
}
```

约束：
- `selected_option` 必须为 `A | B | NONE`
- `meal_type` 必须为 `breakfast | lunch | dinner | all-day`
- `event_time` 非法时返回 400

返回：`{ accepted: true, id: "..." }`

### 3.2 获取反馈统计

`GET /api/v1/meal-plans/recommendations/feedback/stats?days=7`

返回示例：
```json
{
  "window_days": 7,
  "total": 12,
  "accepted": 8,
  "rejected": 4,
  "adoption_rate": 0.6667,
  "reject_reason_top": [
    { "reason": "家里没食材", "count": 2 },
    { "reason": "时间不够", "count": 1 }
  ]
}
```

---

## 4. 前端交互方案

位置：`WeeklyPlanScreen` 三餐智能推荐弹窗。

新增交互：
- 「采纳A」按钮
- 「采纳B」按钮
- 「不采纳」按钮 + 原因输入框（可留空）

交互流程：
1. 用户触发反馈动作
2. 调用反馈接口
3. 成功后提示（Alert）并关闭弹窗

设置页展示：
- 在 `SettingsScreen` 增加「近7天推荐采纳率」条目
- 展示格式：`66.7% (8/12)`；无数据时显示 `暂无数据`

---

## 5. 风险与回滚

风险：
- 历史用户无反馈数据，统计为空
- 客户端重复点击导致重复写入

缓解：
- 统计接口兜底零值
- 前端反馈提交时加 loading 禁用

回滚：
- 前端可隐藏反馈按钮
- 后端可保留表结构并停止调用新接口

---

## 6. 验收标准

- 可成功提交 A/B/NONE 三类反馈
- 可返回近 7 天采纳率与拒绝原因 TOP
- 推荐弹窗可完成反馈操作
- 设置页可见近 7 天采纳率
