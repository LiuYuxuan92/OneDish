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
- 已修复小程序搜索页 API 响应适配问题：后端 `/search` 返回 `results`，原代码错误使用 `items`，已修复并提交推送（commit `c8df67e`）
- 已补前端/小程序详情与喂养反馈兼容处理：
  - 小程序 `pages/recipe/recipe.js` 现在会兼容 `adult_version` / `baby_version` 为 JSON 字符串或对象、`image_url` 为字符串或数组，避免详情页因后端字段形态变化出现空白或取值错误。
  - 小程序最近喂养反馈列表改为兼容 `items` / `data.items` / 直接数组三种返回结构，降低 family 共享或后端包装层变化导致的空列表风险。
  - React Native `RecipeDetailScreen` 现在会兼容 `recipe.image_url` 为字符串或数组，并对最近反馈时间做安全兜底，避免 `length` / 日期解析异常导致详情页报错。
- 已完成针对搜索页、推荐页、详情页、喂养反馈页、weekly review/家庭共享相关代码的静态审查，当前未发现会直接阻断页面的高概率字段取值错误；weekly/family 主要风险集中在联调层而非现有 UI 逻辑。

未完成
- 小程序端真实页面（需在微信开发者工具或真机上）UI 回归验证尚未执行
- weekly review 页面级联调与真实入口核对尚未在前端/小程序端完成，当前更多是接口与周计划/家庭共享代码层审查

风险/注意
- 本次验证通过 `npm run build` + `npm run start`（生产构建）完成，避免了 `tsx watch` 热更新导致的进程不稳定问题
- 当前 `127.0.0.1:6379` 的 Redis 仍不可用，但后端已有内存 fallback；功能可继续验证，只有缓存/分布式幂等/跨进程配额精度会退化
- 代码审阅发现：小程序端暂无家庭管理 UI 入口（profile 页面无 family 相关功能），但后端家庭 API 已验证可用
- `frontend` 现有 `npm run lint` 失败是仓内历史遗留问题（本次看到 2 errors + 大量 warnings，分布在多个旧文件，不是本次改动独有）；本次新增改动未额外引入已确认的运行时高风险点
- `miniprogram/package.json` 仍未配置可执行测试脚本，当前无法用 `npm test` 做自动校验

新增进展（2026-03-09 深夜继续推进）
- 已新增页面/组件映射文档：`docs/plans/2026-03-09-figma-page-component-mapping.md`
  - 完成现有页面 ↔ 目标 Figma 页面/组件映射总表
  - 补充组件级映射表（Home / Search / Plan / Recipe / Profile 域）
  - 明确迁移执行顺序：`首页 -> 周计划/清单 -> 详情页 -> 搜索页 -> 个人中心/设置 -> 深流程页`
  - 标记今晚已落地的小改动与后续不建议现在动的大项
- 已直接落地一个小程序小改动：`miniprogram/pages/profile/profile.*`
  - 个人中心新增“📅 本周计划”入口，直接 `switchTab('/pages/plan/plan')`
  - 目的：补齐小程序主链路入口，让“个人中心 -> 计划/清单”更顺手
- 已直接落地一个 React Native 小改动：
  - `frontend/src/screens/home/HomeScreen.tsx`：首页快捷操作新增“⚙️ 饮食偏好”入口
  - `frontend/src/screens/home/ActionGrid.tsx`：快捷操作从原先偏 3 项横排，调整为支持 4 项网格布局，更贴近后续 Figma 化方向

下一步
- 明早联调建议顺序：
  1. 小程序搜索页：验证 `results` 渲染、库存优先、场景词、空结果态。
  2. 小程序推荐页 → 详情页：验证今日推荐、换菜、进入详情、图片/成人版/宝宝版字段展示。
  3. 小程序详情页喂养反馈：验证提交反馈、最近反馈列表、家庭共享后反馈可见性。
  4. React Native 首页：验证快捷操作 4 宫格在手机宽度下排布正常，且“饮食偏好”能进入 `PreferenceSettings`。
  5. 小程序个人中心：验证“本周计划”入口可正常切到计划 tab。
  6. Weekly plan / family share：验证创建家庭、加入家庭、周计划共享邀请码、成员移除与 invite regenerate。
  7. Weekly review：最后核对真实页面入口、接口返回结构和空态展示。
- 如需小程序端 UI 回归，需在微信开发者工具中加载 miniprogram 目录，配置 baseURL 为 `http://localhost:3000/api/v1`，然后手动测试搜索页、推荐页、详情页、个人中心计划入口和家庭态喂养反馈流程
- 清理临时测试数据（可选）
