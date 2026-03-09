已完成
- 后端已完成 `npm install`、`migrate`、`seed`，`npm run build` 通过。
- 已修复小程序联调阻塞：`/recipes` 的 SQLite 查询错误、缺失 `feeding-explanation-generator.service`、`ingredient-inventory` 的鉴权取值错误。
- 已修复 Redis 不可用时的阻塞降级：`redis.service` 现在会快速 fallback 到内存模式，不再持续重连把请求挂住。
- 已修复统一搜索超时：为外部搜索源增加请求超时和服务级兜底超时，`GET /api/v1/search` 不再卡死。
- 已修复 weekly review 超时：`GET/POST /api/v1/feeding-reviews/weekly*` 在新代码路径下已恢复。
- 已修复购物清单 `complete` 幂等顺序问题：同一 `client_operation_id` 的 replay 现在会在版本检查前命中，不会被误判成 `409`。
- 已新增迁移 `20260309130000_add_updated_at_to_shopping_lists.ts`，补齐 `shopping_lists.updated_at`，修复 SQLite 下 `complete` 更新时报 `no such column: updated_at`。
- 已提交并推送到远端：commit `c953619`，message 为 `fix: stabilize backend search and review flows`，已成功推送到 `origin/master`。
- 已验证通过：
  - guest 登录
  - `/recipes/daily`
  - `/recipes` 列表
  - `/recipes/:id`
  - `/feeding-feedbacks/recent`
  - `/feeding-feedbacks/summary`
  - `/shopping-lists`
  - `/shopping-lists/feedback-events`
  - `/shopping-lists/:listId/items` 幂等 replay 与 `409`
  - `/shopping-lists/:listId/complete` 幂等 replay 与 `409`
  - `/families` create/join
  - 过期家庭邀请码会返回 `400`
  - `/account/merge-preview`
  - `/account/merge-jobs`
  - `POST /account/merge`
  - `POST /account/merge-jobs/:jobId/retry`
  - `/api/v1/search`
  - `GET /api/v1/feeding-reviews/weekly`
  - `POST /api/v1/feeding-reviews/weekly/regenerate`
  - 家庭态喂养反馈：A 创建家庭并写入反馈后，B 加入家庭再查 `/feeding-feedbacks/recent`，可看到 A 的反馈

未完成
- 小程序端搜索页、推荐页、详情页、家庭态喂养反馈还未做完整页面回归。
- 需要在你本地常驻的 `npm run dev` 进程上再回归一遍最新代码，避免旧热更新进程残留旧行为。

风险/注意
- 这轮真实 HTTP 验证大量通过“新起一个临时后端进程”完成；你本地常驻 `npm run dev` 若未正确热更新，可能仍保留旧行为，需要手动重启。
- 当前 `127.0.0.1:6379` 的 Redis 仍不可用，但后端已有内存 fallback；功能可继续验证，只有缓存/分布式幂等/跨进程配额精度会退化。

下一步
- 回归小程序真实页面链路，重点看搜索页、推荐页、详情页和家庭态喂养反馈。
- 如果页面联调无误，再清理临时测试数据和日志文件。
