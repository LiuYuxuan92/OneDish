# 三餐智能推荐 V1 方案（2026-02-22）

## 1. 目标与范围
- 功能范围：早餐 / 午餐 / 晚餐（支持单餐 `meal_type=breakfast|lunch|dinner`）及全天 `all-day`。
- 每个餐别输出两套可执行方案：A / B。
- 输入家庭约束：
  - 宝宝月龄 `baby_age_months`
  - 可接受耗时 `max_prep_time`
  - 家庭库存 `inventory`（并自动合并库存表）
  - 忌口 `exclude_ingredients`
- 输出关键元信息：
  - `time_estimate`（预计耗时）
  - `missing_ingredients`（缺口食材）
  - `baby_suitable`（宝宝适配）
  - `switch_hint`（A/B切换理由）

## 2. A/B 方案生成规则

### 2.1 候选池
1. 从 `recipes` 中筛选 `is_active=true`。
2. 依据 `meal_type` 过滤餐别（all-day 则取三餐）。
3. 按 `prep_time <= max_prep_time` 过滤耗时。
4. 命中忌口食材则直接过滤。

### 2.2 评分规则（V1 启发式）
- 宝宝适配：适配 +30，不适配 +5
- 耗时：`max(0, 20 - prep_time)`
- 库存缺口：`max(0, 10 - 缺口数*2)`
- 总分降序；同分按耗时升序。

### 2.3 A/B 选取
- A：当前餐别最高分候选
- B：与 A 不同的下一名候选
- 若候选不足，A/B 可能为空（前端提示“暂无可推荐”）

## 3. 输入与输出定义

## 输入（POST /meal-plans/recommendations）
```json
{
  "meal_type": "all-day",
  "baby_age_months": 10,
  "max_prep_time": 40,
  "inventory": ["鸡蛋", "番茄"],
  "exclude_ingredients": ["花生"]
}
```

## 输出（示意）
```json
{
  "meal_type": "all-day",
  "constraints": {
    "baby_age_months": 10,
    "max_prep_time": 40,
    "inventory_count": 12,
    "exclude_ingredients": ["花生"]
  },
  "recommendations": {
    "breakfast": {
      "A": {
        "id": "...",
        "name": "...",
        "time_estimate": 15,
        "missing_ingredients": ["燕麦"],
        "baby_suitable": true,
        "switch_hint": "缺少燕麦，建议切换B方案降低采购量"
      },
      "B": {"...": "..."}
    }
  }
}
```

## 4. 前端展示方案（V1）
- 在周计划页增加 A/B 推荐入口（按钮）。
- 弹窗展示三餐结果：按餐别分组，展示 A/B 两套方案及四项元信息。
- UI 可简化，不阻塞已有流程。

## 5. 非目标
- 不做复杂营养学模型、卡路里精算。
- 不做个性化长期学习与画像。
- 不做多目标优化（成本/营养/口味）自动平衡。
- 不做多天联动推荐（仅当前请求维度）。

## 6. 风险与应对
- 食材命名不一致导致缺口误判：V1 用“包含匹配”，后续引入标准化词典。
- 宝宝适配规则偏粗：V1 使用现有适配函数，后续细化分龄规则。
- 菜谱池不足导致 A/B 空：前端兜底提示，后续补库与回退策略。
- 响应时间增长：V1 逻辑在单次 DB 查询基础上处理，后续可加缓存。