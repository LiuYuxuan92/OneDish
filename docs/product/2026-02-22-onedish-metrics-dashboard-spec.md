# OneDish 指标看板定义与埋点规范（可实施版）

- 文档版本：v1.0
- 创建日期：2026-02-22
- 适用范围：OneDish Web（frontend）+ API（backend）
- 目标读者：产品、前端、后端、数据开发、测试

---

## 1. 文档目标

本文档用于统一 OneDish 的**埋点事件定义、指标口径、看板维度与数据质量规则**，确保研发与数据同学可直接实现，支持每周稳定输出业务周报。

核心原则：
1. **同名指标唯一口径**（避免各端各算）
2. **事件原子化**（行为可复用）
3. **字段最小必需**（先可用，再扩展）
4. **可追溯**（事件→明细→指标）

---

## 2. 业务目标与北极星指标

### 2.1 北极星指标（North Star）

**NSM：周活跃烹饪成功用户数（WACS）**

- 定义：在统计周内，至少完成 1 次“开始烹饪→完成烹饪”闭环的去重用户数。
- 计算：
  - 用户层闭环：同一用户在 7 天内存在 `cooking_started` 且存在 `cooking_completed`。
  - 去重粒度：`user_id`。
- 选择原因：直接反映 OneDish 核心价值“帮助用户真正做完一顿饭”。

### 2.2 北极星配套守护指标

1. **烹饪完成率** = 完成烹饪用户数 / 开始烹饪用户数
2. **首周留存（新用户）** = 注册后 7 天内再次发生核心行为（查看菜谱/开始烹饪）的用户占比
3. **购物清单使用率** = 创建或更新购物清单用户数 / 活跃用户数
4. **内容互动深度** = 人均菜谱详情浏览次数、人均收藏次数

---

## 3. 核心漏斗定义

漏斗（按用户去重）

1. **访客到达**：`app_opened`
2. **注册/登录成功**：`auth_success`
3. **查看菜谱列表**：`recipe_list_viewed`
4. **查看菜谱详情**：`recipe_detail_viewed`
5. **开始烹饪**：`cooking_started`
6. **完成烹饪**：`cooking_completed`
7. **复访（7天）**：在 T+1~T+7 发生任一核心事件

口径说明：
- 每步人数按 `user_id + 自然日` 去重（漏斗分析时按分析窗口内“首次触达该步”计算）。
- 默认分析窗口：近 7 天、近 30 天。
- 允许按端（web/h5）与流量来源切分。

---

## 4. 埋点公共字段规范

以下字段为所有事件公共字段（必传/选传）：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| event_name | string | 是 | 事件名（见事件表） | `recipe_detail_viewed` |
| event_time | string(ISO8601) | 是 | 客户端事件时间（UTC） | `2026-02-22T08:20:31Z` |
| user_id | string | 是* | 登录用户ID，未登录传匿名ID | `u_102938` |
| anonymous_id | string | 是 | 设备/浏览器匿名ID | `anon_8af2...` |
| session_id | string | 是 | 会话ID（30分钟无行为切新） | `s_20260222_xxx` |
| platform | string | 是 | `web`/`h5` | `web` |
| app_version | string | 是 | 前端版本号 | `1.4.2` |
| os | string | 否 | 操作系统 | `macOS` |
| browser | string | 否 | 浏览器 | `Chrome 123` |
| page_id | string | 是 | 页面标识 | `recipe_detail` |
| page_url | string | 是 | 页面URL | `/recipes/123` |
| referrer_url | string | 否 | 上一页URL | `/recipes` |
| source_channel | string | 否 | 流量来源渠道 | `seo` |
| request_id | string | 否 | 对应后端请求ID，便于对账 | `req_abcd1234` |

> 说明：`user_id` 在未登录状态下可为空，但必须有 `anonymous_id`。数据仓库需构建 user stitching（匿名ID与登录ID映射）。

---

## 5. 事件定义表（event_name / 触发时机 / 字段 / 示例）

### 5.1 用户与会话

| event_name | 触发时机 | 事件字段（除公共字段外） | 示例 |
|---|---|---|---|
| app_opened | 首屏加载完成（每次会话首次进入） | `entry_page`, `is_first_open` | `{ "entry_page":"home", "is_first_open": false }` |
| auth_success | 登录或注册成功 | `auth_type`(`password`/`wechat`), `is_new_user` | `{ "auth_type":"password", "is_new_user": true }` |
| session_started | 新会话开始（客户端生成session） | `entry_page`, `utm_source`, `utm_campaign` | `{ "entry_page":"home", "utm_source":"google" }` |

### 5.2 内容浏览与互动

| event_name | 触发时机 | 事件字段（除公共字段外） | 示例 |
|---|---|---|---|
| recipe_list_viewed | 菜谱列表页曝光完成 | `list_type`(`home/recommend/search_result`), `result_count` | `{ "list_type":"search_result", "result_count": 48 }` |
| recipe_searched | 用户提交搜索 | `keyword`, `result_count`, `search_mode` | `{ "keyword":"鸡胸肉", "result_count":12, "search_mode":"manual" }` |
| recipe_filter_applied | 用户筛选条件变更并生效 | `filter_keys`, `filter_values` | `{ "filter_keys":["difficulty","time"], "filter_values":["easy","<30"] }` |
| recipe_detail_viewed | 菜谱详情页渲染完成 | `recipe_id`, `recipe_name`, `author_id`, `cook_time_min`, `difficulty` | `{ "recipe_id":"r_1001", "recipe_name":"宫保鸡丁", "cook_time_min":25, "difficulty":"medium" }` |
| recipe_favorited | 收藏菜谱成功 | `recipe_id`, `favorite_action`(`add/remove`) | `{ "recipe_id":"r_1001", "favorite_action":"add" }` |
| recipe_shared | 点击分享并成功调起 | `recipe_id`, `share_channel` | `{ "recipe_id":"r_1001", "share_channel":"wechat" }` |

### 5.3 烹饪流程

| event_name | 触发时机 | 事件字段（除公共字段外） | 示例 |
|---|---|---|---|
| cooking_started | 用户点击“开始烹饪”成功进入烹饪模式 | `recipe_id`, `step_count`, `expected_duration_min` | `{ "recipe_id":"r_1001", "step_count":6, "expected_duration_min":25 }` |
| cooking_step_completed | 用户完成某一步（点击下一步） | `recipe_id`, `step_index`, `step_duration_sec` | `{ "recipe_id":"r_1001", "step_index":2, "step_duration_sec":180 }` |
| cooking_paused | 用户暂停烹饪 | `recipe_id`, `current_step_index`, `pause_reason` | `{ "recipe_id":"r_1001", "current_step_index":3, "pause_reason":"manual" }` |
| cooking_resumed | 用户恢复烹饪 | `recipe_id`, `current_step_index`, `pause_duration_sec` | `{ "recipe_id":"r_1001", "current_step_index":3, "pause_duration_sec":420 }` |
| cooking_completed | 用户点击“完成”并提交成功 | `recipe_id`, `actual_duration_min`, `completed_step_count`, `is_all_steps_completed` | `{ "recipe_id":"r_1001", "actual_duration_min":31, "completed_step_count":6, "is_all_steps_completed":true }` |
| cooking_abandoned | 退出烹饪模式且24小时未完成 | `recipe_id`, `last_step_index`, `elapsed_min` | `{ "recipe_id":"r_1001", "last_step_index":3, "elapsed_min":14 }` |

### 5.4 购物清单

| event_name | 触发时机 | 事件字段（除公共字段外） | 示例 |
|---|---|---|---|
| shopping_list_created | 新建购物清单成功 | `list_id`, `source`(`manual/recipe`) | `{ "list_id":"sl_889", "source":"recipe" }` |
| shopping_item_added | 添加清单项成功 | `list_id`, `item_name`, `quantity`, `unit`, `source` | `{ "list_id":"sl_889", "item_name":"生抽", "quantity":1, "unit":"瓶", "source":"manual" }` |
| shopping_item_checked | 勾选/取消勾选清单项 | `list_id`, `item_id`, `checked` | `{ "list_id":"sl_889", "item_id":"it_1", "checked":true }` |
| shopping_list_completed | 清单全部勾选完成 | `list_id`, `total_item_count`, `completed_item_count` | `{ "list_id":"sl_889", "total_item_count":12, "completed_item_count":12 }` |

### 5.5 异常与性能（建议）

| event_name | 触发时机 | 事件字段（除公共字段外） | 示例 |
|---|---|---|---|
| api_request_failed | 关键接口请求失败 | `api_name`, `http_status`, `error_code`, `latency_ms` | `{ "api_name":"GET /recipes/:id", "http_status":500, "error_code":"DB_TIMEOUT", "latency_ms":3200 }` |
| page_render_slow | 页面渲染超阈值（如 >3s） | `page_id`, `render_time_ms`, `network_type` | `{ "page_id":"recipe_detail", "render_time_ms":4210, "network_type":"4g" }` |

---

## 6. 指标口径（Metric Dictionary）

### 6.1 用户规模类

1. **DAU**：日内发生任一事件的去重用户数（`user_id`优先，否则`anonymous_id`）。
2. **WAU**：近7天去重活跃用户数。
3. **新用户数**：首次 `auth_success.is_new_user=true` 的用户数。

### 6.2 漏斗转化类

1. **登录转化率** = `auth_success_uv / app_opened_uv`
2. **详情到开煮转化率** = `cooking_started_uv / recipe_detail_viewed_uv`
3. **开煮完成率** = `cooking_completed_uv / cooking_started_uv`
4. **整体核心转化率** = `cooking_completed_uv / app_opened_uv`

> 统一要求：分子分母同周期、同维度、同去重规则。

### 6.3 内容质量类

1. **人均详情浏览** = `recipe_detail_viewed_pv / DAU`
2. **收藏率** = `recipe_favorited(add)_uv / recipe_detail_viewed_uv`
3. **搜索成功率** = `recipe_searched(result_count>0)_pv / recipe_searched_pv`

### 6.4 购物清单类

1. **清单渗透率** = `shopping_list_created_uv / DAU`
2. **清单完成率** = `shopping_list_completed_uv / shopping_list_created_uv`
3. **人均加购项数** = `shopping_item_added_pv / shopping_list_created_uv`

### 6.5 留存类

1. **D1留存**：T日新用户在T+1再次活跃占比。
2. **D7留存**：T日新用户在T+7再次活跃占比。
3. **首周核心留存**：T日新用户在T+1~T+7发生`cooking_started`或`recipe_detail_viewed`占比。

---

## 7. 分层维度定义

看板需支持以下切片维度：

1. 时间：日/周/月
2. 平台：`platform`（web/h5）
3. 渠道：`source_channel`、`utm_source`、`utm_campaign`
4. 用户类型：新用户/老用户（注册时间划分）
5. 活跃层级：轻度（1-2天活跃）/中度（3-4天）/重度（5-7天）
6. 内容维度：菜系、难度、预计时长区间（需从recipe维表关联）
7. 地域（可选）：国家/省市（IP映射，注意合规）

---

## 8. 数据建模与实现建议（研发+数据）

### 8.1 数据链路

前端埋点SDK → 日志网关（可批量）→ ODS明细表 → DWD标准事件表 → ADS看板宽表。

### 8.2 表结构建议

1. **ods_event_log**（原始）
2. **dwd_event_fact**（清洗标准化，字段对齐）
3. **dim_user**（注册时间、用户分群）
4. **dim_recipe**（菜谱属性）
5. **ads_onedish_metrics_daily**（日指标宽表）

### 8.3 去重与归因

- 事件主键建议：`event_id`（客户端uuid）+ 服务端接收时间。
- 防重：`event_id` 7天窗口唯一。
- 渠道归因：优先首次会话UTM；无UTM回退`referrer_url`。

---

## 9. 数据质量校验规则（DQ Rules）

每日例行校验（T+1 09:00 前完成）：

1. **事件量波动**：核心事件日环比波动阈值 ±30%，超阈告警。
2. **空值率**：`event_name/event_time/session_id/platform/page_id` 空值率必须 < 0.1%。
3. **枚举合法性**：如 `platform` 仅允许 `web/h5`；非法值占比 < 0.05%。
4. **时序合法性**：`cooking_completed` 必须晚于同会话 `cooking_started`。
5. **漏斗顺序一致性**：同一用户同一recipe，`completed` 无 `started` 占比 < 2%。
6. **重复率**：按 `event_id` 统计重复率 < 0.5%。
7. **延迟监控**：事件入仓延迟 P95 < 15 分钟。
8. **对账规则**：`cooking_completed` 事件数与业务库“完成记录”偏差 < 3%。

异常处理机制：
- DQ任务告警到群（数据+研发+产品）。
- 重大异常（核心指标偏差>10%）暂停周报发布，先修复再回填。

---

## 10. 指标看板页面建议（供BI实现）

### 10.1 页面1：总览
- NSM（WACS）
- DAU/WAU、新增用户
- 开煮完成率
- 清单渗透率
- 近4周趋势（周同比）

### 10.2 页面2：核心漏斗
- app_opened → auth_success → recipe_detail_viewed → cooking_started → cooking_completed
- 支持按渠道、平台、新老用户切片

### 10.3 页面3：内容与清单
- 搜索成功率
- 收藏率
- 人均详情浏览
- 清单完成率、人均加购项数

### 10.4 页面4：质量与稳定性
- API失败率
- 渲染慢页占比
- DQ告警趋势

---

## 11. 周报模板（可直接复用）

```markdown
# OneDish 数据周报（YYYY-WW）

## 1）核心结论（TL;DR）
- 本周北极星指标（WACS）：xxx，环比 x%
- 最大正向变化：xxx
- 最大风险项：xxx

## 2）核心指标看板
- DAU：xxx（WoW x%）
- WAU：xxx（WoW x%）
- 新增用户：xxx（WoW x%）
- 开煮完成率：xx%（WoW xpp）
- 清单渗透率：xx%（WoW xpp）

## 3）漏斗分析
- app_opened → auth_success：xx%
- auth_success → recipe_detail_viewed：xx%
- recipe_detail_viewed → cooking_started：xx%
- cooking_started → cooking_completed：xx%
- 主要流失环节：xxx（原因假设）

## 4）分层洞察
- 渠道：xxx 渠道转化最佳/最差
- 平台：web 与 h5 差异
- 新老用户：新用户在 xxx 环节流失明显

## 5）数据质量
- 本周DQ告警：x次（已修复 x 次，待处理 x 次）
- 是否影响结论：是/否（说明）

## 6）下周动作
- [产品] xxx
- [研发] xxx
- [数据] xxx
- 预计影响指标：xxx
```

---

## 12. 实施清单（Checklist）

### 前端
- [ ] 接入统一埋点SDK并支持批量上报
- [ ] 按事件表补齐埋点触发点
- [ ] 公共字段自动注入（session/page/utm）
- [ ] 离线重传与失败重试机制

### 后端
- [ ] 提供埋点接收网关与鉴权限流
- [ ] request_id 透传与日志对齐
- [ ] 核心业务表对账字段输出（完成烹饪记录）

### 数据
- [ ] 建立 ODS/DWD/ADS 分层任务
- [ ] 指标SQL固化（口径字典化）
- [ ] DQ规则任务与告警
- [ ] BI看板搭建与权限配置

### 测试
- [ ] 事件触发时机联调用例
- [ ] 字段完整性与枚举值校验
- [ ] 漏斗链路端到端回放

---

## 13. 版本变更记录

| 版本 | 日期 | 变更人 | 说明 |
|---|---|---|---|
| v1.0 | 2026-02-22 | 数据产品/AI助手 | 首版：埋点事件+指标口径+DQ+周报模板 |
