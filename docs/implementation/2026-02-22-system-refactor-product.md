# 2026-02-22 产品与前端配套改造实施说明

日期：2026-02-22  
负责人：OpenClaw Assistant（subagent）

## 1. 改造范围与落地结果

### 1.1 前端统一错误处理 + 路由来源展示（local/cache/web/ai）
- 已在 `frontend/src/api/client.ts` 统一响应结构：补齐 `meta.request_id/meta.route`，错误统一为 `{ message, code, http_status }`。
- 已在 `frontend/src/api/search.ts` 做来源归一：
  - `tianxing -> web`
  - 支持 `local/cache/web/ai` 统一 route_source。
- 已在 `frontend/src/screens/recipe/SearchScreen.tsx` 增加结果来源展示（Local/Cache/Web/AI）。

### 1.2 配额状态展示（设置页）
- 新增 `frontend/src/api/quota.ts`，接入 `GET /quota/status`（失败时降级为空配额，不阻塞页面）。
- `frontend/src/screens/profile/SettingsScreen.tsx` 增加“配额状态”项：展示 AI/Web 日配额使用量，并显示 reset 时间（若后端返回）。

### 1.3 购物清单V2与推荐/搜索流程兼容
- 复用并保留 V2 归一逻辑（`frontend/src/api/shoppingLists.ts`）。
- 购物清单页继续按 V2 七大类渲染与交互（`ShoppingListScreen.tsx`），保证筛选、勾选、增删项流程兼容。
- 搜索链路来源展示改为路由语义，不影响原有推荐/搜索调用。

### 1.4 埋点SDK最小实现 + 核心埋点
- 新增 `frontend/src/analytics/sdk.ts`：
  - `trackEvent` 事件封装
  - 会话/匿名ID生成
  - 公共字段自动注入（event_time/session/platform/page）
  - `/metrics/events` 上报失败时本地日志兜底
- 已接入核心事件（按 metrics spec 最小闭环）：
  - `app_opened`
  - `session_started`
  - `recipe_searched`
  - `recipe_list_viewed`
  - `recipe_detail_viewed`
  - `shopping_list_created`
  - `shopping_item_added`
  - `shopping_item_checked`
  - `api_request_failed`

### 1.5 周报数据导出基础脚本
- 新增 `scripts/metrics/export-weekly-events.mjs`：从 NDJSON 事件文件聚合 `event_name` 计数，导出 Markdown 周报基础表。
- 用法：
  - `node scripts/metrics/export-weekly-events.mjs backend/logs/events.ndjson docs/testing/reports/weekly-metrics-YYYY-MM-DD.md`

---

## 2. 验证结果

- `cd frontend && npm run type-check`：✅ 通过
- `bash scripts/test/smoke.sh`：✅ 7/7 通过
- 关键页面回归（替代证据：代码走查 + 冒烟联通）
  - 搜索页：来源切换、结果展示、详情进入路径 ✅
  - 设置页：配额状态展示与刷新 ✅
  - 购物清单页：V2 分类渲染、勾选、手动添加 ✅

---

## 3. 已知限制与后续建议

1. `/quota/status` 在未落后端时会显示默认空配额（前端已降级处理）。
2. `/metrics/events` 为最小上报接入，建议后续补：批量上报、离线重传、重试退避与 event_id 防重。
3. 建议在网关补 `x-route-source` 与 `request_id` 透传，提升前端 route 展示稳定性。
