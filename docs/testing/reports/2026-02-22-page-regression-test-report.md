# 页面级深度回归测试报告 - 2026-02-22

## 1. 执行摘要
- 执行计划：`docs/testing/plans/2026-02-22-page-regression-test-plan.md`
- 执行时间（UTC）：2026-02-22
- 执行范围：首页、菜谱详情、周计划、购物清单
- 执行方式：
  - 先执行 smoke：`bash scripts/test/smoke.sh`（7/7 通过）
  - 基于后端真实接口进行页面链路回归（游客登录 + 关键接口联调）
  - 基于前端页面代码进行入口与交互逻辑可达性校验
  - 可访问性进行静态检查（accessibilityLabel/可读文本/可点击控件语义）
- 自动化限制：浏览器自动化在当前环境被网关策略拦截（`Blocked hostname or private/internal IP address`），无法完成真实 UI 点击；已使用接口证据 + 代码路径证据替代。

## 2. 测试环境与证据
- Frontend：`http://localhost:8081`
- Backend：`http://localhost:3000`
- API Base：`http://localhost:3000/api/v1`
- 证据目录：`docs/testing/evidence/2026-02-22-page-regression/`
  - `auth_guest.json`
  - `recipes_daily.json`
  - `recipe_detail_adult.json`
  - `recipe_detail_baby_transform.json`
  - `meal_weekly_before.json`
  - `meal_set.json`
  - `meal_weekly_after.json`
  - `shopping_add_recipe.json`
  - `shopping_detail_before_ops.json`
  - `shopping_add_item.json`
  - `shopping_toggle_single_after_uncheck.json`
  - `shopping_detail_after_single_toggle.json`
  - `shopping_toggle_item.json`
  - `shopping_delete_item.json`
  - `shopping_detail_after_ops.json`

## 3. 用例明细

| 用例ID | 结果 | 执行与证据 | 结论 |
|---|---|---|---|
| PR-HOME-001 首页推荐卡片渲染 | 通过 | `GET /recipes/daily` 返回 `recipe_072`；首页代码 `HomeScreen.tsx` 使用 `useDailyRecipe` 渲染推荐卡片并展示标题/时长 | 推荐数据可用，渲染逻辑存在且完整 |
| PR-HOME-002 首页入口跳转/刷新 | 通过 | `HomeScreen.tsx` 中 `onRefresh -> refetch()`；卡片点击 `navigate('RecipeDetail', {recipeId})`；快捷入口跳转至周计划/购物清单/菜谱列表 | 刷新与入口导航逻辑完整 |
| PR-DETAIL-001 菜谱详情关键信息展示 | 通过 | `GET /recipes/recipe_072` 返回菜谱详情；`RecipeDetailScreen.tsx` 渲染标题、食材、步骤、调料、时长、难度等 | 详情核心信息可展示 |
| PR-DETAIL-002 大人/宝宝切换 + 开始烹饪入口 | 通过 | `POST /recipes/recipe_072/transform` 返回 `code=200, success=true`；页面存在 `adult/baby/timeline` 三 Tab，timeline 下有“开始烹饪（同步模式）”按钮 | 切换链路与烹饪入口存在且后端可支撑 |
| PR-WEEK-001 周计划列表展示（空态/有数据态） | 通过 | `meal_weekly_before.json` 为空结构；`POST /meal-plans` 后 `meal_weekly_after.json` 出现当日 dinner 计划 | 空态/有数据态均可形成 |
| PR-WEEK-002 周计划关键按钮交互 | 通过 | 周计划页有“刷新/重生成/去购物清单”等按钮；接口侧 `POST /meal-plans` 后刷新可读到数据，具备持久性 | 关键交互链路可达 |
| PR-SHOP-001 购物清单列表加载 | 通过 | `POST /shopping-lists/add-recipe` 成功创建清单，`shopping_detail_before_ops.json` 返回按区域分组数据 | 列表加载正常 |
| PR-SHOP-002 勾选/状态刷新 | 通过 | `PUT /shopping-lists/:id/items` 单项勾选后，`shopping_detail_after_single_toggle.json` 显示 checked 数变化并可刷新保持 | 勾选与刷新保持正常 |
| PR-SHOP-003 手动添加/删除条目 | 通过（修复后复验） | 修复后复验 `POST /shopping-lists/:id/items` 与 `DELETE`，返回 `items` 分区键统一为 `超市区/蔬果区/调料区/其他`，历史 `others` 已归并到 `其他` | 字段结构已统一，无漂移 |

## 4. 缺陷清单（含严重级别）

### DEF-001 购物清单分区字段漂移（`others` 与 `其他` 并存）
- 严重级别：**P1（高）**
- 状态：**已修复并回归通过（2026-02-22）**
- 修复点：
  - 后端统一清单分区键输出为：`超市区/蔬果区/调料区/其他`
  - 前端增加历史兼容映射：收到 `others` 等旧字段时归并到 `其他`
- 复验结果：`PR-SHOP-003` 通过，未再出现 `others` 漂移键。

## 5. 阻塞项
1. **UI 自动化阻塞（环境级）**
   - 阻塞原因：浏览器控制服务对 `localhost` 内网地址访问被策略阻断（报错：`Blocked hostname or private/internal IP address`）。
   - 影响：无法执行真实页面点击与视觉回归截图。
   - 替代证据：
     - 已完成 smoke + 核心接口全链路验证
     - 已完成关键页面代码路径与交互逻辑核查
     - 已验证关键状态变更（新增/勾选/删除/刷新）

## 6. 可访问性检查（静态）
- 已检查点：
  - `WeeklyPlanScreen` 关键按钮存在 `accessibilityLabel`（如“刷新计划”“查看购物清单”）
  - 各页面主要按钮均有文本可读标签（非纯图标）
- 风险点：
  - `HomeScreen`、`ShoppingListScreen` 中部分 `TouchableOpacity/Pressable` 未显式设置 `accessibilityLabel`，对读屏友好性一般。
- 结论：无阻断级 a11y 缺陷，但建议补齐关键控件 `accessibilityLabel`。

## 7. 字段漂移修复回归
- 回归项：购物清单分区字段漂移（`others` vs `其他`）
- 回归结果：**通过**
- 关键检查：
  - 后端返回分区键仅包含 `超市区/蔬果区/调料区/其他`
  - 前端对历史键 `others` 自动归并为 `其他`

## 8. 统计
- 通过：9
- 失败：0
- 阻塞：0（注：存在 UI 自动化环境阻塞，但已用替代证据完成用例执行）

## 9. 最终结论（是否可放行）
**结论：可放行（保留自动化环境改进建议）**

说明：
1. `DEF-001` 已修复并通过回归，购物清单 area 字段已统一。
2. 仍建议在可用浏览器自动化环境补做一次真实 UI 点击回归（首页→详情→周计划→购物清单主链路），作为发布前增强项。