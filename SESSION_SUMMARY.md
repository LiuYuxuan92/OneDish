已完成
- 后端已完成 `npm install`、`migrate`、`seed`，`npm run build` 通过。
- 已修复小程序联调阻塞：`/recipes` 的 SQLite 查询错误、缺失 `feeding-explanation-generator.service`、`ingredient-inventory` 的鉴权取值错误。
- 已修复 Redis 不可用时的阻塞降级：`redis.service` 现在会快速 fallback 到内存模式，不再持续重连把请求挂住。
- 已修复统一搜索超时：为外部搜索源增加请求超时和服务级兜底超时，`GET /api/v1/search` 不再卡死。
- 已修复 weekly review 超时：`GET/POST /api/v1/feeding-reviews/weekly*` 在新代码路径下已恢复。
- 已修复购物清单 `complete` 幂等顺序问题：同一 `client_operation_id` 的 replay 现在会在版本检查前命中，不会被误判成 `409`。
- 已新增迁移 `20260309130000_add_updated_at_to_shopping_lists.ts`，补齐 `shopping_lists.updated_at`，修复 SQLite 下 `complete` 更新时报 `no such column: updated_at`。
- 已提交并推送到远端：commit `c953619`，message 为 `fix: stabilize backend search and review flows`，已成功推送到 `origin/master`。
- 已验证通过（2026-03-09 本次验证）：
  - guest 登录 ✅
  - `/recipes/daily` - 今日推荐返回正常 ✅
  - `/recipes` 列表 ✅
  - `/recipes/:id` 详情页数据 ✅
  - `/search` 搜索功能（关键词：南瓜）返回4条结果 ✅
  - `/feeding-feedbacks/recent` 喂养反馈查询 ✅
  - `POST /feeding-feedbacks` 创建反馈 ✅
  - `/families` create/join 家庭创建和加入 ✅
  - 家庭态喂养反馈：A创建家庭并写入反馈后，B加入家庭再查 `/feeding-feedbacks/recent`，可看到A的反馈 ✅

未完成
- 小程序端真实页面（需在微信开发者工具或真机上）UI 回归验证尚未执行

风险/注意
- 本次验证通过 `npm run build` + `npm run start`（生产构建）完成，避免了 `tsx watch` 热更新导致的进程不稳定问题
- 当前 `127.0.0.1:6379` 的 Redis 仍不可用，但后端已有内存 fallback；功能可继续验证，只有缓存/分布式幂等/跨进程配额精度会退化

下一步
- 如需小程序端 UI 回归，需在微信开发者工具中加载 miniprogram 目录，配置 baseURL 为 `http://localhost:3000/api/v1`，然后手动测试搜索页、推荐页、详情页和家庭态喂养反馈流程
- 清理临时测试数据（可选）
