# OneDish 前端 UI 改造方案文档

- 日期：2026-03-10
- 项目：`/root/.openclaw/workspace/OneDish`
- 参考原型：`/root/.openclaw/workspace/Onedishproductprototype`
- 文档性质：执行前方案文档，后续 UI 改造需严格按本文档推进，不先改业务代码

---

## 1. 背景与结论

本次改造不是“把 prototype 直接抄进 OneDish”，而是：

1. **以 prototype 的 UI 结构、信息架构、组件表达为参考蓝本**；
2. **以 OneDish 现有真实业务能力为主干**，包括但不限于：
   - AI 宝宝版（`useAIBabyVersion` / `/recipes/:id/transform` / `/recipes/transform/raw`）
   - sync cooking / timeline（`useTimeline` / `/recipes/:id/timeline`）
   - 周计划生成与智能推荐（`mealPlansApi.generateWeekly` / `getSmartRecommendations`）
   - 购物清单闭环（库存覆盖、缺口、完成后扣减、共享清单）
   - 家庭协作 / 周计划共享 / 家庭邀请码
   - 喂养反馈与周回顾真实接口
3. **主线是“UI/信息架构迁移 + 真实业务接线”**，而不是 mock data 搬运。

结论：

- Onedishproductprototype 已经足够作为视觉与交互参考；
- OneDish 当前前后端能力也已经覆盖大部分真实业务闭环；
- 因此前端改造可开工，但必须先做 **字段映射层 / ViewModel 层 / 组件抽象层**，避免页面直接耦合 prototype 数据结构。

---

## 2. 改造目标与范围

## 2.1 改造目标

本次前端 UI 改造目标是：

1. 将 OneDish 当前 React Native 前端页面，迁移为更贴近 prototype 的移动端产品表达；
2. 强化“One Dish, Two Ways / 一菜两吃”主叙事，让“成人版 + 宝宝版 + 同步烹饪 + 喂养反馈 + 计划闭环”在页面中形成统一体验；
3. 将现有功能从“可用但分散”重构为“结构清晰、状态可感知、决策更低成本”的界面；
4. 建立一套 **跨页面复用的 UI 组件与数据适配规范**，支撑后续持续迭代。

## 2.2 本次纳入范围

本次纳入 UI 改造范围的页面：

- Home
- RecipeDetail
- Search
- WeeklyPlan
- ShoppingList
- FeedingFeedback
- WeeklyReview
- Family

本次纳入范围的支撑层：

- 公共状态标签 / 徽章 / 推荐卡片 / 适龄标签等组件层
- 页面 ViewModel / selector / adapter 层
- 前端导航层和页面间 CTA 串联
- 真实接口字段到展示字段的映射策略

## 2.3 本次不纳入范围

以下内容本次不作为“先手目标”，除非某页面接线必须小幅补充：

- 后端协议大改
- 数据库结构重构
- 小程序端与 RN 端同时统一大改
- 新增长链路业务能力（如全新社交系统）
- 非本次页面范围内的大规模视觉重构（如登录/注册/设置全量重做）

---

## 3. 当前项目结构判断

## 3.1 OneDish 当前结构

### 前端

`OneDish/frontend` 为 React Native + Expo + React Navigation + React Query 架构，当前已经具备：

- 页面分层清晰：`screens/home`、`screens/recipe`、`screens/plan`、`screens/profile`
- API 层：`src/api/*`
- Hooks 层：`src/hooks/*`
- 通用组件：`src/components/common/*`
- 部分业务组件：`src/components/plan/*`、`src/components/recipe/*`

### 后端

`OneDish/backend` 为 Express + Knex + PostgreSQL/SQLite 风格结构，已具备：

- recipes / meal plans / shopping lists / feeding feedback / weekly review / family 等控制器与服务
- AI 转换、同步时间线、家庭协作、购物清单闭环等能力
- 数据迁移记录表明家庭协作、喂养反馈、周回顾、购物清单闭环均已进入真实实现阶段

## 3.2 Prototype 当前结构

`Onedishproductprototype` 是一套偏 Web 的原型工程，优势在于：

- 页面 IA 已经成型
- 组件命名清晰，适合迁移设计语言
- “一菜两吃”叙事一致性很强
- Home / RecipeDetail / Search / WeeklyPlan / ShoppingList / FeedingFeedback / WeeklyReview / Family 的界面风格统一

但它的局限也很明确：

- 数据完全基于 `src/app/data/mock-data.ts`
- 类型模型是原型专用，不等价于 OneDish 真实返回结构
- 页面交互多为前端临时状态，并不代表后端真实闭环

因此，**prototype 只能迁 UI 与信息架构，不能直接迁数据模型。**

---

## 4. 本次改造遵循的原则

## 4.1 沿用 prototype 的部分

以下内容优先沿用 prototype：

1. **页面层级与区块顺序**
   - 尤其是 Home / RecipeDetail / Search / WeeklyPlan 的信息分层
2. **组件概念与命名**
   - `DualBadge`
   - `StatusTag`
   - `BabySuitabilityChips`
   - `AdaptationSummary`
   - `RecommendationCard`
   - `PlannedMealCard`
3. **状态表达方式**
   - In plan / On shopping list / Retry suggested / Low confidence 等
4. **卡片化 UI 语言**
   - 强化推荐理由、适配说明、喂养状态、库存状态、共享状态
5. **“One Dish, Two Ways”主叙事**
   - 在首页、详情页、计划页、回顾页持续可见

## 4.2 必须保留 OneDish 现有真实能力的部分

以下内容不能因为 UI 改造而被削弱：

1. **AI 宝宝版能力**
   - 当前详情页已有 AI 生成宝宝版本能力，必须保留并更自然融入新版 RecipeDetail
2. **sync cooking / timeline**
   - 当前已有 timeline 模式和同步烹饪入口，必须保留
3. **周计划生成 / 智能推荐**
   - 当前 WeeklyPlan 支持生成、A/B 推荐、反馈闭环，必须保留
4. **购物清单闭环**
   - 当前 ShoppingList 已有库存覆盖、缺口、共享、完成后回写等能力，必须保留
5. **家庭共享能力**
   - Family、WeeklyPlan、ShoppingList 的 share / family invite / member remove 不能丢
6. **喂养反馈与周回顾真实接口**
   - 不能退化成仅展示 mock timeline

## 4.3 明确不做的事

1. 不盲目照搬 prototype mock data；
2. 不把 RN 页面改成 Web 原型样式后再回头补接口；
3. 不在页面中硬编码 prototype 的 `Milo / Sarah / James` 之类虚拟角色；
4. 不为了“先像 prototype”而绕过真实 hooks / API；
5. 不在第一阶段同时重做所有底层业务逻辑。

## 4.4 推荐实现原则

1. **先做 ViewModel，再做页面替换**；
2. **先做组件层复用，再做页面拼装**；
3. **优先改信息架构，不先大动交互链路**；
4. **旧能力优先通过 adapter 接到新 UI，而不是重写业务**；
5. **每个页面改造都必须能独立回归。**

---

## 5. 总体实施策略

建议采用三层迁移法：

### 第一层：设计语义层
先把 prototype 中稳定的 UI 语义抽象为 RN 组件：

- Badge / Tag / Chip / Card / Summary / CTA 样式体系
- 页面区块头、状态条、提醒条、推荐卡

### 第二层：数据适配层
在 OneDish 前端新增页面级 adapter / mapper / selector：

- 将真实 API 返回映射成 prototype 风格展示结构
- 统一处理缺失字段、状态组合、展示优先级

### 第三层：页面迁移层
按页面分批迁移：

- 先高频首页链路
- 再详情/搜索/计划闭环
- 再反馈、回顾、家庭页

---

## 6. 页面级改造清单

## 6.1 Home

### 当前 OneDish 现状

`frontend/src/screens/home/HomeScreen.tsx` 当前重点是：

- 今日推荐单卡
- 宝宝阶段入口
- 食材入口
- 快捷操作
- 临期食材推荐 banner

问题：

- “一菜两吃”叙事不够显性
- 今日计划、购物状态、喂养待记录等信息没有统一收拢
- 推荐理由表达偏算法视角，弱于原型中的“家庭/宝宝/适配”表达

### 目标形态

参考 prototype `HomePage.tsx`，重构为以下区块：

1. Header
   - 问候语 + 通知入口
2. Today Dashboard
   - 今日已计划/已完成/待决定
   - 今日餐次列表
   - 跳转周计划
3. Quick Actions
   - 计划 / 找一菜两吃 / 记录喂养 / 购物清单
4. Reminder Strip
   - 待记录喂养 / 购物剩余 / retry suggestion
5. One Dish, Two Ways 推荐区
   - RecommendationCard 横滑
6. Quick Filters
   - 快手 / 宝宝可吃 / 易改造 / 双版本等
7. Baby section / Explore

### Home 页面改造要点

- 保留现有 `useHomeRecommendation` 的真实推荐逻辑
- 新增 `useHomeDashboardViewModel`，整合以下数据源：
  - home recommendation
  - weekly plan summary
  - latest shopping list summary
  - feeding feedback summary / weekly review summary
- 推荐区从“单张今日推荐”扩展为：
  - 置顶主推荐 1 张
  - 一菜两吃候选列表若干
- 临期食材 banner 保留，但位置调整为 reminder / secondary block

### Home 依赖的真实能力

- 推荐：`useHomeRecommendation`
- 计划：`mealPlansApi.getWeekly`
- 购物：`shoppingListsApi.getAll / latest`
- 喂养反馈：需新增轻量 summary hook，复用 feeding feedback / weekly review

---

## 6.2 RecipeDetail

### 当前 OneDish 现状

`RecipeDetailScreen.tsx` 功能很强，但结构偏“功能堆叠”：

- 成人版 / 宝宝版 / timeline tab
- AI 生成宝宝版
- 营养信息
- 同步烹饪卡片
- 购物清单加入
- 最近反馈

问题：

- 信息很全，但决策成本高
- “为什么这道菜适合我家”表达不足
- 缺少 prototype 那种“版本切换 + 状态标签 + 适配摘要 + 喂养反馈”的一体化观感

### 目标形态

参考 prototype `RecipeDetailPage.tsx`，改为：

1. Hero 区
   - 图片 / 返回 / 核心 badge
2. 标题卡
   - 标题、时长、份量、热量/难度
   - BabySuitabilityChips
   - StatusTag 列表
3. Why this fits 区
   - 推荐原因 / 家庭匹配原因
4. One Dish Two Ways 主区
   - Family / Baby 版本切换
   - adaptation method / texture / split step / allergen notes / baby steps
5. Action 区
   - 加入计划 / 加入购物清单 / 收藏 / 分享
6. Ingredients
7. Steps
8. Timeline / Sync cooking（从独立 tab 下沉为重要子区块或次级 tab）
9. Feeding feedback 区
10. AI 宝宝版生成区

### RecipeDetail 页面改造要点

- **不能丢掉现有三大能力**：
  - AI 宝宝版
  - sync cooking timeline
  - feeding feedback
- 建议将当前 `adult / baby / timeline` 三 tab 改为：
  - 默认页面式布局
  - 页面内部版本切换只控制成人/宝宝做法与适配区
  - timeline 作为独立折叠卡片或次级 segmented tab
- 新增 `useRecipeDetailViewModel`，将以下合并：
  - `useRecipeDetail`
  - `useBabyVersion`
  - `useAIBabyVersion`
  - `useTimeline`
  - `useRecentFeedingFeedback`
  - `useWeeklyPlan` / `useLatestShoppingList` 中是否已加入状态

### 特别要求

- prototype 中的 `Why this fits your household` 必须改造成真实逻辑生成，不写死文案；
- `StatusTag` 至少支持：
  - 已在计划中
  - 已在购物清单中
  - 曾被拒绝 / 建议重试
  - 数据不足
- `AdaptationSummary` 要兼容两类来源：
  - 后端静态 baby_version
  - AI 实时转换结果

---

## 6.3 Search

### 当前 OneDish 现状

`SearchScreen.tsx` 已支持：

- 本地 / 联网 / AI 搜索源切换
- 搜索详情页查看
- 联网结果宝宝版智能转换
- 库存优先 / 场景搜索 / 偏好 hint

问题：

- 信息架构偏工具型，不够产品化
- 高价值场景“一菜两吃”“月龄适配”“曾喜欢过”缺少稳定入口
- 搜索结果卡片展示维度与 prototype 不一致

### 目标形态

参考 prototype `SearchPage.tsx`，改造为：

1. 搜索框 + filter 按钮
2. Smart filters
   - 一菜两吃 / 快速 / 宝宝接受过 / 易改造 / 库存优先 / 无过敏提示
3. 搜索 tab
   - 关键词 / 2-in-1 / 冰箱食材 / 场景 / 按月龄
4. 结果区
   - RecipeCard 宽卡 + relevance labels + status chips
5. 无输入时的探索区
   - popular searches
   - scenario cards
   - age filters

### Search 页面改造要点

- 保留当前真实多源搜索，不替换为 prototype 假搜索
- 新增 `useSearchExperienceViewModel`
  - 将本地 / 联网 / AI 结果统一映射为统一卡片结构
  - 根据 recipe source 决定可展示能力
- 页面不只按“来源”组织，而是按“任务”组织；来源切换可以下沉为 secondary filter
- 对联网/AI结果，如果缺完整步骤，卡片和详情要明确提示“可先收藏/可生成宝宝版/可转入本地后续补全”

---

## 6.4 WeeklyPlan

### 当前 OneDish 现状

`WeeklyPlanScreen.tsx` 功能非常完整：

- 周计划生成
- 今日详情
- 智能推荐 A/B
- 周计划分享
- 模板保存
- 家庭协作

问题：

- 信息密度大，但卡片抽象不足
- prototype 中的“计划完成度 / 购物准备度 / 重复推荐 / 餐次卡片”更轻、更适合移动端

### 目标形态

参考 prototype `WeeklyPlanPage.tsx`：

1. Header + 周概览
2. 周统计 strip
   - meals / dual meals / shopping readiness
3. completion progress bar
4. day selector
5. 当日 meals 列表
   - `PlannedMealCard`
6. repeat suggestions
7. shopping CTA

### WeeklyPlan 页面改造要点

- 现有 `week / today` tab 保留，但“week”页内部采用 prototype 风格卡片组织
- `WeekDayCard` 需要部分升级或替换为更轻量 day selector + meal cards 组合
- 智能推荐 A/B、分享模板、共享计划等高级能力仍保留入口，但从主视图降为次级操作
- `PlannedMealCard` 要明确展示：
  - 餐次
  - 菜谱缩略图
  - dual badge
  - 是否已完成
  - 宝宝接受情况
  - 购物准备度
  - replace / remove / mark complete

---

## 6.5 ShoppingList

### 当前 OneDish 现状

`ShoppingListScreen.tsx` 已经是相对成熟的真实业务页：

- 按区域分组
- 搜索与筛选
- merge
- 缺口 / 覆盖 / 临期
- 来源区分
- 手动增删
- 全选

问题：

- prototype 的价值不在于替代现有能力，而在于强化“购物闭环状态展示”
- 当前页面偏管理工具，缺少“从计划到采购 readiness”的一眼感知

### 目标形态

参考 prototype `ShoppingListPage.tsx` 的“摘要层”，保留现有真实能力：

1. Header
2. progress bar
3. meal readiness + still needed summary
4. smart context chips
5. grouped list
6. back to plan CTA

### ShoppingList 页面改造要点

- **保留现有分区、筛选、添加、共享、完成闭环逻辑**；
- 只迁移顶部摘要与 item 卡片表现：
  - meal readiness
  - still needed
  - pantry covered / low stock / baby-specific / shared-across-meals chips
- 现有“闭环摘要/库存覆盖/缺口”是 OneDish 的强项，应保留并升级展示，不降级为 prototype 简化版
- 列表 item 建议引入状态微组件，替代当前局部逻辑分支样式

---

## 6.6 FeedingFeedback

### 当前 OneDish 现状

前端已有详情页内最小反馈闭环，后端有：

- 创建反馈
- 最近反馈
- recipe summaries

但当前缺少一个成熟、独立、产品化的 React Native `FeedingFeedback` 页面。

### 目标形态

参考 prototype `FeedingFeedbackPage.tsx`：

1. Header
2. recipe acceptance summary 横滑
3. retry suggestions
4. worth repeating
5. cautious / rejected alerts
6. filter tabs
7. recent records 列表
8. 新建记录 CTA

### FeedingFeedback 页面改造要点

- 需要从后端接口出发，而不是照搬 prototype 的 `initialFeedingRecords`
- 前端新增页面和 hook 组合：
  - recent feedback list
  - recipe summaries
  - retry suggestion derivation
  - loved / okay / cautious / rejected filter
- 该页需承担“回流到 RecipeDetail / WeeklyPlan”的作用：
  - 重复做过且喜欢 -> 去计划
  - 谨慎项 -> 去详情查看
  - 拒绝项 -> 用于周回顾

---

## 6.7 WeeklyReview

### 当前 OneDish 现状

后端已有 `weeklyReview.controller.ts` 和相关 service / test；前端尚未形成完整、产品化页面表达。

### 目标形态

参考 prototype `WeeklyReviewPage.tsx`：

1. Header
2. 总览统计
3. One Dish, Two Ways insights
4. nutrition balance
5. accepted recipes
6. cautious items
7. rejected items
8. next week recommendations
9. CTA：去计划下一周 / 查看反馈

### WeeklyReview 页面改造要点

- 严格以 `/feeding-reviews/weekly` 返回结果为主，不使用 prototype 假 summary
- 若接口字段不完全覆盖 prototype 展示，前端可先做 graceful degradation：
  - 有什么显示什么
  - 没有的区块隐藏或展示“数据积累中”
- 该页是“喂养反馈 -> 下周计划”的桥，因此 CTA 必须明确

---

## 6.8 Family

### 当前 OneDish 现状

后端家庭能力已存在：

- create family
- join family
- regenerate invite
- remove member
- meal plan / shopping list / weekly share 协作

前端 Family 页面目前偏弱，更多能力散落在周计划页内部。

### 目标形态

参考 prototype `FamilyPage.tsx`：

1. Header
2. Members 列表
3. Baby profile 卡片
4. Shared spaces
   - Weekly Plan / Shopping List / Feeding Tracker / One Dish, Two Ways
5. Activity feed
6. This week stats

### Family 页面改造要点

- 不是做“纯展示页”，而是家庭协作总入口
- 保留 OneDish 真实能力：
  - 邀请码
  - 成员管理
  - 家庭共享上下文
- 可将当前分散在 WeeklyPlan/ShoppingList 的 share 能力，在 Family 页统一收口入口
- Baby profile 信息需来自真实 user / family context，而非 prototype 常量

---

## 7. 组件层改造清单

以下组件建议在 `frontend/src/components/ui-migration/` 或更合适的业务组件目录中建立，作为本次改造的基础设施。

## 7.1 DualBadge

### 作用
统一表达：

- 一菜两吃 / dual
- 宝宝适吃 / baby-friendly
- 宝宝专属 / baby-only
- 家庭专属 / family-only

### 改造策略

- 从 prototype 迁移语义和样式体系
- RN 重写，不直接复用 Web className
- 需要支持：
  - `xs | sm | md`
  - showLabel / icon-only
  - OneDish 真实数据映射

### OneDish 数据来源

- `recipe.baby_version`
- `sync_cooking`
- `is_baby_suitable`
- 是否存在双版本/双路线

建议新增字段映射函数：
`getDualTypeFromRecipe(recipe, babyVersion, syncInfo)`

---

## 7.2 StatusTag

### 作用
统一表达上下文状态：

- in-plan
- on-shopping-list
- previously-rejected
- retry-suggested
- low-confidence
- pantry-covered
- few-missing
- updated-by-other

### 改造策略

- 提取为跨页面状态系统
- 页面只传状态枚举 + detail
- 避免每页手写一套彩色小 pill

### 真实数据来源

- 周计划：`mealPlansApi.getWeekly`
- 购物清单：`shoppingListsApi`
- 喂养反馈：`feedingFeedback`
- 家庭协作更新：share / family context

---

## 7.3 BabySuitabilityChips

### 作用
统一表达：

- 适用月龄
- 是否适合当前宝宝
- 额外准备量级
- 质地信息
- shared meal 属性

### 改造策略

- prototype 的 chip 模型基本可沿用
- 但字段必须来自真实 recipe + baby profile + transform result

### 真实数据来源

- `user.baby_age` / `preferences.default_baby_age`
- `baby_version.age_range / stage / texture`
- `recipe.stage / first_intro / texture_level`
- `is_baby_suitable`

---

## 7.4 AdaptationSummary

### 作用
统一表达宝宝改造摘要：

- 改造方式
- 质地
- 分流步骤 / split step
- 额外 prep
- 过敏提醒

### 改造策略

- 这是 RecipeDetail / PlannedMealCard / RecommendationCard 的核心复用组件
- 必须同时兼容：
  - 静态宝宝版
  - AI 生成宝宝版
  - sync cooking 信息

### 真实数据来源

- `useBabyVersion`
- `useAIBabyVersion.lastResult`
- `useTimeline`
- `recipe-transform.service` 返回结构

---

## 7.5 RecommendationCard

### 作用
用于首页 / 搜索 / 推荐模块展示推荐菜谱

### 展示内容

- 图
- 标题
- DualBadge
- 时长 / 难度
- 推荐理由
- 相关标签

### 改造策略

- prototype 的结构直接可迁
- 推荐理由必须真实生成，不写死

### 推荐理由来源

- home recommendation reasons
- search ranking reasons
- 用户偏好匹配提示
- 喂养反馈命中（宝宝爱吃 / 曾拒绝 / 建议重试）

---

## 7.6 PlannedMealCard

### 作用
用于 WeeklyPlan 中的餐次卡片

### 展示内容

- 餐次 / recipe / dual badge
- completion status
- accept status
- ingredients readiness
- adaptation summary（简版）
- replace / remove / add empty

### 改造策略

- 以 prototype 为骨架，但保留 OneDish 实际业务动作
- 接口驱动，不做 purely local state 卡片

---

## 7.7 建议新增的配套组件

除题目指定组件外，建议同时落地以下组件：

1. `SectionHeader`
2. `SummaryStatCard`
3. `ReminderChip`
4. `ProgressStrip`
5. `InsightCard`
6. `FeedbackBadge`
7. `MealReadinessBadge`
8. `SharedContextChip`

否则页面会继续复制粘贴样式。

---

## 8. 数据映射 / 接口适配策略

这是本次改造最关键部分。

## 8.1 总原则

**prototype 字段 ≠ OneDish 真实字段**。

因此必须建立中间层：

- `view-model`
- `adapter`
- `mapper`

推荐目录：

- `frontend/src/viewmodels/`
- `frontend/src/mappers/`
- 或按页面 colocate：`screens/*/viewModel.ts`

页面组件禁止直接按 prototype 字段结构消费后端原始返回。

---

## 8.2 原型 Recipe -> OneDish Recipe 映射

### prototype 关键字段

- `title`
- `image`
- `cookTime`
- `difficulty`
- `servings`
- `dualType`
- `babyFriendly`
- `babyAgeMonths`
- `feedbackScore`
- `whyItFits`
- `extraPrepForBaby`
- `babyAdaptation`
- `ingredients`
- `steps`

### OneDish 真实来源

- `recipe.name`
- `recipe.image_url[0]`
- `recipe.prep_time` / `cook_time` / `total_time`
- `recipe.difficulty`
- `recipe.servings`
- `recipe.baby_version`
- `recipe.tags / stage / texture_level / recommendation_explain`
- transform / timeline / feedback 查询结果

### 建议映射产物

定义统一展示模型，例如：

```ts
interface RecipeDisplayModel {
  id: string;
  title: string;
  image?: string;
  cookTimeText: string;
  difficultyLabel: string;
  servingsLabel: string;
  dualType: 'dual' | 'baby-friendly' | 'baby-only' | 'family-only';
  babySuitability?: {
    minAgeMonths?: number;
    currentAgeSuitable?: boolean;
    texture?: string;
    extraPrep?: 'none' | 'minimal' | 'moderate' | 'heavy';
  };
  adaptation?: {
    method?: string;
    texture?: string;
    splitStep?: number;
    allergenNotes?: string[];
    babySteps?: string[];
  };
  whyItFits?: string;
  feedback?: {
    latest?: 'like' | 'ok' | 'reject' | 'cautious';
    score?: number;
    count?: number;
  };
}
```

---

## 8.3 prototype Home summary -> OneDish dashboard 映射

### prototype 字段

- today planned / cooked / undecided
- shopping unchecked / pct
- unlogged feeding count
- retry recipes

### OneDish 真实来源

- `weekly plan` 当前周数据
- `shopping list latest`
- `feeding feedback recent`
- `weekly review`

### 处理策略

- 由 `useHomeDashboardViewModel` 计算展示值
- 页面不直接做跨接口聚合

---

## 8.4 prototype feeding records -> OneDish feedback 映射

### prototype 字段

- `acceptance: loved | okay | cautious | rejected`
- `amount: full | half | taste`
- `retrySuggested`

### OneDish 真实字段

当前后端主要是：

- `accepted_level`
- `note`
- `baby_age_at_that_time`
- `meal_plan_id`
- `recipe_id`
- `created_at`

### 适配策略

前端映射统一为：

- `like -> loved`
- `ok -> okay`
- `reject -> rejected`
- `cautious` 若后端暂无明确字段，则通过规则推导：
  - note 含“观察/谨慎/少量尝试/首次尝试”
  - weekly review cautious items

即：

- **UI 可展示 cautious，但不能要求底层必须已有同名字段**
- cautious 可由 review / derived state 得出

---

## 8.5 prototype WeeklyReview 数据 -> OneDish weekly review 映射

### prototype 字段

- `weekLabel`
- `totalMeals`
- `babyMeals`
- `dualMeals`
- `acceptedRecipes`
- `cautiousItems`
- `rejectedItems`
- `suggestions`
- `dualMealInsights`
- `nutritionSummary`

### OneDish 真实来源

- `/feeding-reviews/weekly`
- 补充来源：weekly plan / feeding feedback / recipes

### 适配策略

- 如果 weekly review 已返回上述绝大部分字段，直接映射
- 如果只有部分字段：
  - `dualMeals` 从 weekly plan + recipe dual 判定推导
  - `acceptedRecipes` 从 feeding feedback 汇总
  - `nutritionSummary` 若暂无稳定后端字段，可先隐藏或展示“数据积累中”

---

## 8.6 prototype Family 数据 -> OneDish family context 映射

### prototype 字段

- family members
- baby profile
- recent activity
- shared spaces
- weekly stats

### OneDish 真实来源

- `family.controller`
- meal plan share
- shopping list share
- user info
- baby age / preferences

### 适配策略

- family 页面不依赖单接口返回全部字段
- 建议聚合：
  - family context
  - current user
  - latest share states
  - weekly stats selectors

---

## 8.7 明确的数据适配实现建议

建议至少新增以下前端适配文件：

- `frontend/src/mappers/recipeDisplayMapper.ts`
- `frontend/src/mappers/feedingFeedbackMapper.ts`
- `frontend/src/mappers/weeklyReviewMapper.ts`
- `frontend/src/mappers/familyMapper.ts`
- `frontend/src/mappers/shoppingListMapper.ts`
- `frontend/src/mappers/mealPlanMapper.ts`

以及页面 ViewModel：

- `frontend/src/screens/home/useHomeDashboardViewModel.ts`
- `frontend/src/screens/recipe/useRecipeDetailViewModel.ts`
- `frontend/src/screens/recipe/useSearchPageViewModel.ts`
- `frontend/src/screens/plan/useWeeklyPlanPageViewModel.ts`
- `frontend/src/screens/plan/useShoppingListPageViewModel.ts`
- `frontend/src/screens/feedback/useFeedingFeedbackViewModel.ts`
- `frontend/src/screens/feedback/useWeeklyReviewViewModel.ts`
- `frontend/src/screens/family/useFamilyPageViewModel.ts`

---

## 9. 分阶段实施顺序

## Phase 0：方案冻结与基线确认

### 目标

在不改业务逻辑前提下，完成：

- 页面改造范围确认
- adapter / component 命名确认
- 字段映射草案确认

### 产出

- 本方案文档
- 页面/组件 checklist
- 风险清单

### 原因

如果不先冻结结构，后面很容易滑向“边改边想”，导致页面风格和数据模型都反复。

---

## Phase 1：组件层 + 数据适配层先行

### 优先事项

1. 搭建通用视觉组件：
   - DualBadge
   - StatusTag
   - BabySuitabilityChips
   - AdaptationSummary
   - RecommendationCard
   - PlannedMealCard
2. 建立 mapper / view-model 层
3. 不大面积替换页面，仅做局部接入验证

### 原因

- 这是后续 8 个页面的共用基础
- 先做这个，能防止每页自己实现一套 badge/tag/card
- 可以最早暴露字段缺口和状态冲突

### 完成标准

- 组件可在 Story-like demo / screen sandbox 中渲染
- 至少能接通 Recipe / MealPlan / ShoppingList / Feedback 的真实数据

---

## Phase 2：核心用户路径页面改造

### 顺序建议

1. Home
2. RecipeDetail
3. Search
4. WeeklyPlan
5. ShoppingList

### 原因

这五页串成主链路：

**首页发现 -> 搜索/详情决策 -> 加入计划 -> 生成购物清单 -> 做饭**

这条链路优先打通，用户就能感知改造价值。

---

## Phase 3：反馈闭环页面改造

### 顺序建议

1. FeedingFeedback
2. WeeklyReview

### 原因

这两页是“做完之后”的反馈闭环，价值高，但频次略低于主链路。适合在主链路稳定后接入。

---

## Phase 4：家庭协作入口整合

### 顺序建议

1. Family
2. share 入口统一整理（WeeklyPlan / ShoppingList / Family）

### 原因

家庭页依赖多个模块的数据汇总，放在后面做更稳。

---

## 10. 风险与注意事项

## 10.1 最大风险：prototype 数据模型误导实现

风险表现：

- 直接按 `mock-data.ts` 结构写 RN 页面
- 后续接真实接口时大量返工

规避方式：

- 所有页面先写 mapper / view model
- 禁止页面组件直接依赖 prototype types

## 10.2 第二风险：把现有真实能力改丢

重点警惕：

- AI 宝宝版入口消失
- sync cooking 被 UI 替换掉
- 周计划智能推荐入口被弱化到不可用
- 购物清单闭环摘要和共享能力被简化掉

规避方式：

- 每页改造必须列“旧能力保留清单”
- PR / 开发自查以能力保留为硬约束

## 10.3 第三风险：页面太像 prototype，但不适合 RN

问题：

- prototype 是 Web/Tailwind 结构
- RN 的滚动、SafeArea、点击态、布局约束不同

规避方式：

- 迁“结构与语义”，不是迁 className
- RN 要使用现有 theme token、spacing、shadow 体系
- 横滑列表、sticky 区、底部 CTA 要按 RN 习惯做

## 10.4 第四风险：一个页面聚合接口过多，导致性能抖动

规避方式：

- ViewModel 层集中控制请求
- 优先使用已有 query cache
- summary 信息允许分层加载
- 首屏只展示关键块，次级区块延迟展示

## 10.5 第五风险：字段不齐导致 UI 逻辑分叉失控

规避方式：

- mapper 统一兜底
- 所有 badge/status/chip 的显示规则收敛在 helper 中
- 页面只消费“已归一化的展示状态”

---

## 11. 验证计划

## 11.1 视觉与结构验证

每个页面改造完成后，验证：

1. 页面区块顺序是否与方案一致
2. 视觉语言是否与 prototype 统一
3. CTA 是否明确
4. 状态表达是否一致

## 11.2 真实业务能力验证

### Home
- 是否可正常展示真实推荐
- 是否能跳转计划/购物/喂养/搜索
- reminder 是否来自真实数据

### RecipeDetail
- 成人版/宝宝版/AI 宝宝版/sync cooking 是否都可达
- 加入计划/加入购物清单是否正常
- 最近反馈是否可见

### Search
- 本地/联网/AI 搜索是否正常
- 结果卡片状态是否正确
- 联网结果宝宝版转换是否正常

### WeeklyPlan
- 周计划生成正常
- A/B 智能推荐正常
- meal card 替换/完成/跳详情正常
- 模板/共享入口保留

### ShoppingList
- 生成、筛选、勾选、删除、添加、全选正常
- 缺口/覆盖/闭环摘要正确
- 共享能力不丢

### FeedingFeedback
- 新建反馈正常
- recent / summaries / filter 正常
- 可跳 RecipeDetail / WeeklyReview / WeeklyPlan

### WeeklyReview
- 可取到真实 weekly review
- 数据为空时降级展示合理
- 可回流计划页

### Family
- 家庭信息可读
- 邀请/加入/移除成员可用
- shared spaces 可跳转

## 11.3 回归验证

每完成一个阶段至少执行：

- 类型检查：`frontend npm run type-check`
- 基础测试：`frontend npm test -- --passWithNoTests`
- 关键手工回归：Home / RecipeDetail / WeeklyPlan / ShoppingList

## 11.4 验收标准

满足以下四点才算本次改造通过：

1. UI 结构明显向 prototype 对齐；
2. OneDish 真实业务能力没有丢失；
3. 页面间形成“发现 -> 决策 -> 计划 -> 购物 -> 喂养反馈 -> 周回顾”的闭环；
4. 页面不依赖 prototype mock data。

---

## 12. 执行建议（供后续开发时遵循）

## 12.1 推荐提交粒度

按“组件层 / 页面层 / 适配层”分批执行，而不是一个超大改动：

1. 组件层与 mapper 层
2. Home + RecipeDetail
3. Search + WeeklyPlan
4. ShoppingList
5. FeedingFeedback + WeeklyReview
6. Family + 收尾统一

## 12.2 页面开发顺序中的硬约束

每改一个页面，都要先回答三件事：

1. 这个页面从 prototype 迁哪些区块？
2. 这个页面保留 OneDish 哪些真实能力？
3. 这个页面的数据是由哪个 view-model 提供？

如果三件事答不清，不进入编码。

---

## 13. 第一阶段建议执行内容

可以据此直接开始第一阶段改造，建议第一阶段任务拆分为：

1. 建立 UI migration 基础组件目录
2. 实现以下组件 RN 版：
   - DualBadge
   - StatusTag
   - BabySuitabilityChips
   - AdaptationSummary
   - RecommendationCard
   - PlannedMealCard
3. 建立以下 mapper / view-model：
   - recipeDisplayMapper
   - mealPlanMapper
   - shoppingListMapper
   - feedingFeedbackMapper
4. 选取 `RecipeDetail` 和 `WeeklyPlan` 做组件接线试点

原因：

- 这两个页面最能验证“组件复用 + 真实业务接线”是否成立；
- 一旦这两个页面接得顺，Home / Search / ShoppingList 的迁移会顺很多。

---

## 14. 最终结论

本次前端 UI 改造的正确方向不是“做一个像 prototype 的新壳”，而是：

**在 OneDish 现有真实业务能力之上，把 prototype 已验证过的信息架构和视觉表达迁入 React Native 前端。**

核心原则已明确：

- 不照搬 mock data
- 不丢现有真实能力
- 以 UI / 信息架构迁移 + 真实业务接线 为主线
- 先组件与适配层，后页面层

据此，后续可以进入第一阶段执行。
