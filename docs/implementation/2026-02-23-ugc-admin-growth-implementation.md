# 2026-02-23 实现记录（UGC 审核台 + 质量回流 + 增长基础）

## Backend
- 新增迁移：`20260223021001_create_ugc_quality_events_table.ts`
- UGC 服务：
  - `listForAdmin(status,page,limit)`
  - `batchReview(ids,action,note)`
  - `recordQualityEvent(report/adoption)`
  - `recomputeQualityScores` 改为基于事件聚合写回 `report_count/adoption_rate`
- 控制器/路由：
  - `GET /user-recipes/admin/list`
  - `POST /user-recipes/admin/batch-review`
  - `POST /user-recipes/:id/admin/quality-events`
- 新增定时/手动重算脚本：`src/scripts/recompute-ugc-quality.ts` + `npm run ugc:recompute-quality`
- 购物清单：item 标准化补齐 `assignee/status`；更新接口支持写入。
- 用户画像：`PUT /users/me/profile-tags` 写入 `preferences.profile_tags`。
- 推荐读取：`getDailyRecommendation` 按 `profile_tags`（meal_slots/flavors/baby_stage）做最小过滤。

## Frontend
- `MyRecipesScreen` 新增管理员“审核台”标签。
- 支持审核状态切换、选择项、批量通过/拒绝、备注输入。
- API 与 hooks 增加 admin list / batch review / quality event 接口封装。

## 兼容性
- 购物清单历史数据自动补默认值：`assignee=null,status=todo`。
- 推荐过滤为增量逻辑，不影响匿名用户。