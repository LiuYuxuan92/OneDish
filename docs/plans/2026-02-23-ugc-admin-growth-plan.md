# 2026-02-23 UGC 审核台 + 质量回流 + 增长基础 方案

## 目标
1. UGC 审核台最小版：按状态查看 + 批量审核 + 审核备注。
2. 质量分真实回流：举报/采纳事件落库，驱动 `report_count`/`adoption_rate` 与质量分重算。
3. 增长基础：购物清单协作字段（`assignee/status`）+ 用户画像标签（口味/餐次/月龄段）并供推荐读取。

## 范围与实现策略
- Backend 为主，Frontend 最小补齐审核台入口。
- 不做告警联调。
- 手动入口 + 定时脚本入口（`npm run ugc:recompute-quality`）。

## 关键改动
- `ugc_quality_events` 事件表。
- `user_recipes` 管理端列表与批量审核接口。
- 购物清单 item 结构兼容 `assignee/status`。
- 用户画像标签写入 `preferences.profile_tags`，推荐读取并参与过滤。

## 验收
- 管理员可筛选 pending/rejected/published。
- 管理员可批量通过/拒绝并写备注。
- 写入举报/采纳事件后，质量字段重算可见变化。
- 购物清单项可携带分工信息。
- profile tags 可写入并影响日推荐筛选。