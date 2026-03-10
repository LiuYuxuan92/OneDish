# OneDish 现有页面 ↔ Figma 版页面/组件映射表

日期：2026-03-09  
状态：已落库，可继续用于迁移排期与逐页替换  
用途：把当前 React Native / 小程序现状与 Figma 目标页拆成可执行映射，避免后续“按感觉重做”。

---

## 1. 说明

目前仓库里**没有找到单独落库的 Figma 导出文件/页面清单**，所以本表采用以下原则：

1. 先以现有信息架构与 UI 设计规范（`docs/04-UI设计规范.md`）为基线；
2. 将“Figma 版页面/组件”定义为：后续要统一到的产品化页面骨架与设计组件；
3. 先做**现状页面 → 目标 Figma 页面/组件**映射；
4. 后续如果补到真实 Figma 页面链接/Frame 名称，只需要在本表补充 `Figma Frame` 列，不需要重写迁移逻辑。

> 结论：这版先把“页面和组件迁移关系”钉住，足够支撑今晚继续推进；等拿到实际 Figma frame 名后再补精确命名。

---

## 2. 页面级映射总表

| 端 | 现有页面 / 文件 | 当前职责 | 目标 Figma 页面 | 复用/拆分组件 | 迁移优先级 | 备注 |
|---|---|---|---|---|---|---|
| RN | `frontend/src/screens/home/HomeScreen.tsx` | 首页、今日推荐、快捷入口 | Home / Today Recommendation | Header, RecipeHeroCard, QuickActionGrid, BabyStageCard, InventoryBanner | P0 | 首页是主入口，最适合先做视觉统一 |
| 小程序 | `miniprogram/pages/home/*` | 小程序首页、今日推荐、换菜、加入清单 | Mini Home / Today Recommendation | SearchEntry, RecommendationCard, ReasonList, ActionButtons | P0 | 与 RN 首页同主题，可并行对齐 |
| RN | `frontend/src/screens/recipe/SearchScreen.tsx` | 搜索、来源切换、场景 chips、联网详情 | Search / Search Result / Online Recipe Detail | SearchBar, SourceTabs, ScenarioChips, ResultCard, ResultMetaBadge | P0 | 当前信息密度高，但结构已成熟，适合按组件分拆 |
| 小程序 | `miniprogram/pages/search/*` | 搜索页 | Mini Search | SearchBar, SourceTabs, ScenarioChips, ResultListCard | P0 | 已有功能闭环，主要做视觉和结构收口 |
| RN | `frontend/src/screens/recipe/RecipeListScreen.tsx` | 菜谱列表、筛选 | Recipe Library | FilterBar, RecipeCard, StageEntryBanner | P1 | 依赖搜索/详情卡片统一后再收口 |
| 小程序 | `miniprogram/pages/recipe/*` | 菜谱列表 + 详情承接(tabBar) | Mini Recipe Library / Recipe Detail | RecipeListCard, DetailHero, VersionTabs, FeedbackBlock | P1 | tabBar 限制决定先不大改跳转方式 |
| RN | `frontend/src/screens/recipe/RecipeDetailScreen.tsx` | 菜谱详情、同步烹饪、反馈 | Recipe Detail | HeroImage, VersionSwitch, IngredientSection, StepSection, FeedbackPanel, CTAFooter | P0 | 详情页是高频决策页，优先统一 |
| RN | `frontend/src/screens/recipe/CookingModeScreen.tsx` | 沉浸式烹饪 | Cooking Mode | StepCard, Timer, CrossLineAlert, ProgressHeader | P2 | 功能已重，视觉统一可后置 |
| RN | `frontend/src/screens/plan/WeeklyPlanScreen.tsx` | 一周计划、智能生成、分享、模板入口 | Weekly Plan / Planner | WeekSwitcher, DayMealCard, SmartRecModal, EmptyState, TopActions | P0 | 已是产品核心流程，需先补入口和层级整理 |
| 小程序 | `miniprogram/pages/plan/*` | 当前清单 / 智能生成 / 历史清单 | Mini Plan / Shopping List / Generate Plan | SegmentedTabs, SummaryCard, ShoppingItem, GenerateForm | P0 | 承担计划+清单双角色，先做信息架构映射 |
| RN | `frontend/src/screens/plan/ShoppingListScreen.tsx` | 当前购物清单 | Shopping List | SummaryBanner, GroupedItems, SourceBadge, FooterActions | P1 | 依赖周计划入口清晰后再细化 |
| RN | `frontend/src/screens/plan/ShoppingListDetailScreen.tsx` | 清单详情 | Shopping List Detail | ItemGroup, CoverageSummary, CompletionCTA | P1 | 与 ShoppingListScreen 一起收口 |
| RN | `frontend/src/screens/plan/TemplateDiscoveryScreen.tsx` | 模板发现页 | Plan Templates | TemplateCard, FilterChips, TemplateHero | P2 | 业务优先级本来就在 P2 |
| RN | `frontend/src/screens/profile/ProfileScreen.tsx` | 个人中心入口 | Profile / Me | UserSummaryCard, MenuList, PreferenceEntry, FavoritesEntry | P1 | 与设置、偏好页一起统一 |
| 小程序 | `miniprogram/pages/profile/*` | 小程序个人中心、AI 配置、登录入口 | Mini Profile / Preferences | MemberCard, MenuCells, PreferenceModal, PlanEntry | P0 | 当前缺计划入口，今晚已先补小改动 |
| RN | `frontend/src/screens/profile/PreferenceSettingsScreen.tsx` | 饮食偏好设置 | Preference Settings | SectionCard, MultiInputField, OptionChips, SaveBar | P1 | 已有功能，适合组件化替换 |
| RN | `frontend/src/screens/profile/InventoryScreen.tsx` | 库存管理 | Inventory | InventorySummary, ExpiringList, ActionCTA | P1 | 可复用首页临期 banner 组件 |
| RN | `frontend/src/screens/profile/FavoritesScreen.tsx` | 收藏页 | Favorites | RecipeGridCard, EmptyState | P2 | 依赖统一 RecipeCard |
| 小程序 | `miniprogram/pages/favorites/*` | 收藏页 | Mini Favorites | FavoriteCard, EmptyState | P2 | 次级流程，后置 |
| RN | `frontend/src/screens/auth/LoginScreen.tsx` / `RegisterScreen.tsx` | 登录/注册/guest 升级 | Auth / Login / Register | AuthHeader, FormCard, SubmitButton, MergeHint | P1 | 已有功能完成，视觉统一即可 |
| 小程序 | `miniprogram/pages/login/*` | 小程序登录 | Mini Auth | AuthHero, ActionButton, GuestHint | P1 | 与 guest 升级文案一致即可 |
| 小程序 | `miniprogram/pages/membership/*` | 会员页 | Membership | PricingCard, BenefitList, CTA | P2 | 非当前主迁移链路 |

---

## 3. 组件级映射表

### 3.1 全局基础组件

| 现有组件/模式 | 文件 | 对应 Figma 基础组件 | 迁移建议 |
|---|---|---|---|
| Button | `frontend/src/components/common/Button.tsx` | Primary / Secondary Button | 作为统一按钮 token 基础，优先回收首页/计划页散落按钮样式 |
| Card | `frontend/src/components/common/Card.tsx` | Surface Card | 用作卡片壳层，优先统一 Home / Search / Plan |
| EmptyState | `frontend/src/components/common/EmptyState.tsx` | Empty State | 补齐 icon / title / desc / CTA 四段规范 |
| ImageCarousel | `frontend/src/components/common/ImageCarousel.tsx` | Media Carousel | 先服务详情页 hero |
| OfflineIndicator | `frontend/src/components/common/OfflineIndicator.tsx` | Global Status Banner | 保留行为，只做视觉对齐 |
| Skeleton | `frontend/src/components/common/Skeleton.tsx` | Loading Skeleton | 搜索/首页/计划复用 |

### 3.2 首页域组件

| 现有组件 | 文件 | 目标 Figma 组件 | 说明 |
|---|---|---|---|
| Header | `frontend/src/screens/home/Header.tsx` | Home Top Bar | 统一标题、搜索入口、个人入口 |
| `screens/home/RecipeCard.tsx` | `frontend/src/screens/home/RecipeCard.tsx` | Recommendation Hero Card | 首页核心卡片，未来也可喂给小程序样式参照 |
| BabySection | `frontend/src/screens/home/BabySection.tsx` | Baby Stage Highlight | 作为宝宝阶段说明卡 |
| IngredientGrid | `frontend/src/screens/home/IngredientGrid.tsx` | Ingredient Quick Filter | 可继续收敛成 icon grid |
| ActionGrid | `frontend/src/screens/home/ActionGrid.tsx` | Quick Action Grid | 今晚小改动会把动作扩展为 4 宫格，更接近 Figma 常见结构 |
| ExpiryNotificationBanner | `frontend/src/screens/home/ExpiryNotificationBanner.tsx` | Inventory Warning Banner | 可复用到库存页 |

### 3.3 搜索/菜谱域组件

| 现有组件 | 文件 | 目标 Figma 组件 | 说明 |
|---|---|---|---|
| RecipeCard | `frontend/src/components/recipe/RecipeCard.tsx` | Recipe List Card | 本地菜谱列表标准卡 |
| Search results card pattern | `frontend/src/screens/recipe/SearchScreen.tsx` 内联 | Search Result Card | 建议后续抽离，避免页面内样式过重 |
| StageGuideCard | `frontend/src/components/recipe/StageGuideCard.tsx` | Stage Guide Card | 继续保留，可直接 Figma 化 |
| TimelineView | `frontend/src/components/recipe/TimelineView.tsx` | Sync Cooking Timeline | 属于深页组件，可后置 |

### 3.4 计划/清单域组件

| 现有组件 | 文件 | 目标 Figma 组件 | 说明 |
|---|---|---|---|
| WeekDayCard | `frontend/src/components/plan/WeekDayCard.tsx` | Weekly Day Card | 周计划最关键组件，优先统一卡片密度和 CTA |
| TodayDetailTab | `frontend/src/components/plan/TodayDetailTab.tsx` | Today Plan Detail | 今日视图可直接从周计划延展 |
| SmartRecommendationModal | `frontend/src/components/plan/SmartRecommendationModal.tsx` | Smart Recommendation Sheet | 保留行为，统一层级与按钮 |
| GenerateOptionsModal | `frontend/src/components/plan/GenerateOptionsModal.tsx` | Generate Plan Sheet | 对齐标准表单 sheet |
| WeeklyShareModal | `frontend/src/components/plan/WeeklyShareModal.tsx` | Share / Family Sheet | 后续会和家庭体系统一 |
| ShareTemplateModal | `frontend/src/components/plan/ShareTemplateModal.tsx` | Save as Template Sheet | P2 再精修 |

---

## 4. 迁移执行顺序（严格可执行版）

基于用户昨晚要求的顺序，这里给出**页面迁移顺序**，不是功能开发优先级的重复。

### 第 1 波：高频主链路先统一（现在就该做）
1. **Home / Mini Home**
   - 原因：一打开就看到，且同时承接推荐、换菜、加清单、去搜索/计划。
   - 目标：统一 hero card、原因说明、快捷入口、banner 层次。
2. **Weekly Plan / Mini Plan**
   - 原因：首页跳出后最常见下一步就是计划/清单；现有信息密度高但入口层级还可继续收口。
   - 目标：明确“本周计划 / 当前清单 / 智能生成 / 家庭共享”的层次。
3. **Recipe Detail / Mini Recipe Detail**
   - 原因：决定“做不做这道菜”的关键页，应该紧跟首页和计划页之后统一。
   - 目标：统一图片、版本切换、食材/步骤/反馈区块和 CTA。
4. **Search / Mini Search**
   - 原因：结构复杂，但依赖上面几页的卡片样式沉淀；放在第四步最稳。

### 第 2 波：账户与个人域收口
5. **Profile / Preferences / Mini Profile**
6. **Inventory / Favorites**
7. **Login / Register / Mini Login**

### 第 3 波：深流程与低频页
8. **Shopping List Detail / History**
9. **Cooking Mode**
10. **Templates / Membership / BabyStage 深页**

---

## 5. 今晚可以直接落地的小改动清单

### 已选中并执行的小改动
1. **小程序个人中心补“本周计划”入口**
   - 原因：计划是当前主链路，但小程序 profile 只有会员、月龄、AI 配置、客服、账号，缺明显计划入口。
   - 价值：不用重构页面即可增强主链路可达性。

2. **React Native 首页快捷操作从 3 项扩为 4 项，补“饮食偏好”入口**
   - 原因：首页现有快捷操作只覆盖购物清单/一周计划/菜谱大全，偏好设置已是核心基础设施，应该进入主入口层。
   - 价值：更贴近 Figma 常见 2x2 quick actions，也让“推荐为什么这样排”与“去改偏好”形成闭环。

### 今晚先不动的改动
- 不直接大改小程序 tabBar 信息架构；
- 不在没有真实 Figma frame 的情况下做大面积视觉重写；
- 不同时重构 SearchScreen 内联样式和 RecipeDetail，大概率收益不成正比。

---

## 6. 后续补全真实 Figma 信息时怎么接

如果后面拿到真实 Figma 链接/Frame 名称，只需要给本表追加两列：

- `Figma Link`
- `Frame / Component Name`

并把当前“目标 Figma 页面”替换成真实命名即可。迁移顺序和组件拆分不需要重做。

---

## 7. 一句话结论

先把 **首页 → 周计划/清单 → 详情页 → 搜索页** 这条主链路映射钉死，再做个人中心与设置页；今晚先落**映射文档 + 低风险入口增强**，这是最稳且能继续推进的做法。
