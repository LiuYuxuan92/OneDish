# 2026-02-23 UGC 审核台 + 增长基础 测试计划

## 必跑
1. backend build
2. frontend type-check
3. smoke（脚本 + 手动 API 冒烟）

## 专项用例（>=8）
1. 管理员审核列表：pending
2. 管理员审核列表：rejected
3. 管理员审核列表：published
4. 批量审核通过（含备注）
5. 批量审核拒绝（含备注）
6. 记录 report 事件并重算 report_count
7. 记录 adoption 事件并重算 adoption_rate
8. 手动重算入口 `/user-recipes/admin/recompute-quality`
9. 购物清单项更新 assignee/status
10. 更新用户 profile_tags 并查看推荐过滤行为

## 通过标准
- 构建通过，无 TS 错误。
- 关键接口返回 2xx 且字段符合预期。