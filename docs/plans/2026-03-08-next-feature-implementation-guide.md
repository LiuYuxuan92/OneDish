# OneDish 下一轮功能开发实施文档（给接手模型的落地手册）

日期：2026-03-08  
状态：可实施  
用途：给后续接手实现的模型/工程师直接照着做，尽量减少误判、返工和回归。

---

## 0. 先看这个：当前项目已经完成到哪里了

截至当前主干（`origin/master` 最新已包含最近几轮提交），OneDish 已经具备这些基础：

### 已完成能力
1. **游客账号隔离**
   - backend `POST /auth/guest` 已按 `device_id` 生成稳定 guest 账号，不再所有游客共用同一账号。
   - 小程序登录页会生成并持久化 `guest_device_id`。

2. **用户偏好读写**
   - backend 已有：
     - `GET /users/me/preferences`
     - `PUT /users/me/preferences`
   - 偏好保存在 `users.preferences` JSON 字段。
   - 已支持字段：
     - `default_baby_age`
     - `prefer_ingredients`
     - `exclude_ingredients`
     - `cooking_time_limit`
     - `difficulty_preference`

3. **偏好驱动推荐链路**
   - 已接入：
     - 每日推荐 `/recipes/daily`
     - 换菜 `/recipes/swap`
     - 周计划 `mealPlanService`
     - 菜谱列表/搜索 `/recipes`
   - 规则现状：
     - `exclude_ingredients` = 硬过滤
     - `cooking_time_limit` / `default_baby_age` = 筛选或强约束
     - `prefer_ingredients` / `difficulty_preference` = 排序加权

4. **多端偏好体验**
   - React Native App 已有“饮食偏好”设置页。
   - 小程序首页/搜索/计划页已有基础偏好解释文案。

5. **测试/构建现状**
   - backend build 与关键测试可通过
   - frontend build 与 Jest 可通过
   - miniprogram 有最小 Jest 测试（不是全量构建体系）

---

## 1. 推荐开发顺序（非常重要）

按当前代码结构和业务价值，建议按下面顺序做，不要乱跳：

### P0（最优先）
1. **游客转正式账号 / 微信账号合并**
2. **购物清单闭环升级**

### P1
3. **家庭协作能力（家庭级共享）**
4. **AI / 搜索继续进化**

### P2
5. **模板与复用**
6. **喂养成长视角**

> 建议原因：
> - P0 做完，产品从“好看能用”变成“能长期留存”。
> - P1 做完，开始形成家庭场景壁垒。
> - P2 做完，产品才有明显的内容沉淀和长期个性化价值。

---

## 2. 接手实现前必须牢记的工程约束（避坑区）

这部分很关键，后面的实现请**优先遵守这些约束**。

### 2.1 frontend 的 `apiClient` 已经“拍平响应”了
文件：`frontend/src/api/client.ts`

#### 现状
响应拦截器返回的是：
- `response.data` 的 body 展平结果
- 不是原始 axios `response`

#### 结论
前端业务里优先使用：
- `const payload = res?.data || res`

#### 不要犯的错
不要再写：
- `response.data.data.xxx`
- `response.data.token`（除非你确认这里拿到的是原始 axios，而不是 apiClient 的返回）

---

### 2.2 miniprogram 的 `request()` 也已经解包了 `payload.data`
文件：`miniprogram/utils/request.js`

#### 现状
成功时返回：
- `payload.data !== undefined ? payload.data : payload`

#### 结论
小程序 API 调用方应优先直接读：
- `result.recipe`
- `result.items`
- `result.preferences`

#### 不要犯的错
不要再写：
- `result.data.recipe`
- `result.code === 200 && result.data...`

此前换菜逻辑就因为这个坑坏过一次。

---

### 2.3 小程序 `recipe` 页是 tabBar 页面，不能 `navigateTo`
相关文件：
- `miniprogram/pages/home/home.js`
- `miniprogram/pages/favorites/favorites.js`
- `miniprogram/pages/recipe/recipe.js`

#### 现状
已经采用：
- `wx.setStorageSync('pending_recipe_detail_id', recipeId)`
- `wx.switchTab('/pages/recipe/recipe')`
- `recipe.js onShow()` 消费 pending id

#### 不要犯的错
不要把它改回：
- `wx.navigateTo('/pages/recipe/recipe?id=xxx')`

否则小程序主路径会再次坏掉。

---

### 2.4 guest 账号不能再共享
相关文件：
- `backend/src/controllers/auth.controller.ts`
- `miniprogram/pages/login/login.js`

#### 现状
guest 账号已经按 `device_id` 隔离。

#### 不要犯的错
后续做“游客转正式账号”时：
- 不能把 guest 逻辑改回固定 `guest` 用户
- 不能丢掉 `guest_device_id`
- 不能只迁 token，不迁数据

---

### 2.5 用户偏好是共用基础设施，别新造一套平行模型
相关文件：
- `backend/src/services/user-preference.service.ts`
- `backend/src/routes/user.routes.ts`
- `frontend/src/api/users.ts`
- `miniprogram/utils/api.js`

#### 现状
偏好统一走 `users.preferences`。

#### 不要犯的错
不要再额外发明：
- 新的“轻量 preferences 表”
- 再复用 `/ai-configs` 去存食材偏好
- 前端一套字段名，小程序另一套字段名

优先在现有 `users.preferences` 上扩展。

---

### 2.6 做任何功能时，优先让 backend 成为真实业务中心
当前系统已经明显是：
- backend 决定推荐/搜索/周计划/换菜结果
- frontend / miniprogram 主要负责展示与交互

#### 结论
新功能优先做法：
- **backend 先落业务规则**
- frontend/miniprogram 只接结果，不各写一套本地规则

#### 不要犯的错
不要把核心规则写在：
- React hook 里单独判断一遍
- 小程序页面里再写一份简化版本

否则后面一定漂。

---

## 3. 功能一：游客转正式账号 / 微信账号合并（P0）

## 3.1 目标
让用户可以这样使用：
1. 先游客使用（有偏好、收藏、周计划、购物清单等）
2. 后续注册 / 登录 / 微信登录
3. **原 guest 数据不丢失，自动并到正式账号**

这是目前最值得做的留存功能。

---

## 3.2 当前状态
### 已有
- guest 账号已独立，不会串号
- 登录 / 注册 / 微信登录 都可用
- 偏好、收藏、周计划、购物清单等数据已经围绕 `user_id` 存储

### 缺口
- guest -> 正式账号没有数据合并流程
- 注册后仍是新账号视角，guest 数据会“看起来丢了”

---

## 3.3 推荐实现方案（最稳）

### 方案原则
不要做“前端把 guest 数据搬一份再上传”的假合并。  
应做 **backend 原子合并**：
- 当前请求里同时带：
  - guest token（当前设备在用）
  - 注册/登录/微信登录凭证
- backend 在事务里把 guest 数据 merge 到 target user

### 推荐接口方案
新增一个明确接口，别在现有 `/auth/login` 上悄悄塞太多分支：

#### 方案 A（推荐）
- `POST /auth/upgrade-guest/register`
- `POST /auth/upgrade-guest/login`
- `POST /auth/upgrade-guest/wechat`

请求体包含：
- 注册/登录/微信参数
- 当前 guest token 通过 Authorization 头传

#### 方案 B（也可）
扩展现有：
- `/auth/register`
- `/auth/login`
- `/auth/wechat`

但要增加一个明确参数，例如：
- `merge_guest: true`

> 建议优先 A：更清晰，也更不容易把普通登录逻辑搞乱。

---

## 3.4 需要迁移/合并的数据（先核实表名，再实施）
优先看这些表：
- `favorites`
- `meal_plans`
- `shopping_lists`
- `ingredient_inventory`
- `recommendation_feedbacks`
- `recommendation_learning_profiles`
- 可能还有：共享关系表、模板表、UGC 草稿表（如果已有）

### 合并规则建议
#### favorites
- 按 `recipe_id` 去重
- target 有的保留 target，guest 的重复数据忽略

#### meal_plans
- 以 `(plan_date, meal_type, user_id)` 为自然冲突键
- 若 target 已有，优先保留 target
- 若 guest 有而 target 没有，迁过去

#### shopping_lists
- 不建议粗暴 merge JSON
- 先迁整张 list 的 owner
- 冲突时保留多份 list，不要自动把两张不同日期/同日期清单强行揉成一张

#### ingredient_inventory
- 同名食材可考虑累加 quantity
- 但不同 expiry_date / location 最好不要强行合并成一条
- 稳妥做法：保留多条库存记录

#### preferences
- 使用“正式账号优先 + guest 补全”的 merge
- 建议规则：
  - target 有值 → 保留 target
  - target 无值、guest 有值 → 补到 target
  - `exclude_ingredients` / `prefer_ingredients` → union 去重

#### recommendation_feedbacks / learning_profiles
- feedback 行为数据直接迁 user_id
- learning profile 可选择：
  - 删除 target profile 后重算
  - 或 merge 后重算
- **推荐做法：重算，不要尝试人工合并 profile snapshot**

---

## 3.5 backend 实施步骤
### Step 1. 新增合并服务
建议新增：
- `backend/src/services/account-merge.service.ts`

职责：
- 校验 guest user / target user
- 校验 guest 是否真的是 guest
- 按事务迁移数据
- 清理或标记旧 guest 账号

### Step 2. 设计事务边界
必须单事务处理：
- 找到 guest user
- 找到/创建 target user
- 各业务表迁移
- 重算 learning profile
- 返回新 token

### Step 3. guest 账号收尾策略
不要直接物理删除 guest 用户，优先：
- 标记 `merged_into_user_id`
- 或设置 `is_active = false`
- 或至少写审计日志

这样出问题时可追溯。

### Step 4. 增加接口与 controller
建议位置：
- `backend/src/controllers/auth.controller.ts`
- 或新增 `auth-upgrade.controller.ts`

### Step 5. 增加测试
必须补：
- guest -> register 合并成功
- guest -> login 合并成功
- guest -> wechat 合并成功
- target 已有 favorites / plan / preferences 的冲突场景
- 非 guest token 不能走合并

---

## 3.6 前端 / 小程序实施步骤
### React Native
- 登录/注册成功前，如果当前是 guest，会走“升级账号”路径
- UI 层至少给一个温和提示：
  - “正在迁移你的收藏与计划...”

相关文件可能涉及：
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/screens/auth/LoginScreen.tsx`
- `frontend/src/screens/auth/RegisterScreen.tsx`
- 如果有微信登录页，也要接同样逻辑

### 小程序
- 登录页也要接入同样逻辑
- 当前 guest token 与 `guest_device_id` 仍保留，用于识别当前设备 guest 身份

相关文件可能涉及：
- `miniprogram/pages/login/login.js`
- `miniprogram/utils/api.js`

---

## 3.7 验收标准
- 游客创建的收藏在注册/登录后仍可见
- 游客创建的周计划在升级后仍可见
- 游客购物清单在升级后仍可见
- 偏好不会丢
- target 原数据不被脏覆盖
- backend build + 测试通过
- frontend/miniprogram 关键登录链路验证通过

---

## 3.8 这一项最容易踩的坑
1. **只换 token，不迁数据**
2. **合并不用事务，迁到一半失败**
3. **把 learning profile 当普通 JSON merge**
4. **把 shopping list 的 items JSON 强行深度合并**
5. **微信登录直接新建用户，不尝试合并当前 guest**

---

## 4. 功能二：购物清单升级成真正闭环（P0）

## 4.1 目标
让购物清单不只是“导出的一个列表”，而是贯穿：
- 周计划
- 菜谱
- 采购
- 库存
- 做菜完成

最终目标是：
**计划 -> 清单 -> 买菜 -> 做饭 -> 库存回写** 完整闭环。

---

## 4.2 当前状态
### 已有
- 可生成 shopping list
- 可从菜谱加入清单
- `markComplete()` 已尝试将勾选项入库
- 已有分享/协作基础服务

### 已知问题 / 现有坑
文件：`backend/src/services/shoppingList.service.ts`

#### 重点坑 1：共享场景 `markComplete()` 更新条件不一致
当前逻辑：
- 前面用 `getAccessibleListOrThrow + canWriteList`
- 但最终更新时仍：
  - `.where('id', listId).where('user_id', userId).update(...)`

这会导致：
- 共享成员能写库存
- 但清单完成状态可能没更新
- 数据不一致

> 做这项功能时，建议优先把这个坑一起修掉。

#### 重点坑 2：购物清单目前还是“以整张 list + items JSON”为主
这意味着：
- 自动合并规则不能太激进
- 容易在多人协作和自动去重时出现脏合并

---

## 4.3 建议分两步做
### 第一步：先做“个人闭环”
只处理个人场景：
- 从周计划一键生成当周清单
- 按 recipe / day / meal 标识来源
- 合并同名食材
- 做完菜自动扣库存

### 第二步：再做“家庭协作闭环”
- 支持多人分工采购
- 支持共享完成状态
- 支持缺口视图

不要一口气全上。

---

## 4.4 推荐落地内容（第一步）
### A. 购物清单项增加来源元信息
建议每个 item 增加：
- `source`: `meal_plan | recipe | manual`
- `source_date`
- `source_meal_type`
- `source_recipe_id`
- `servings`

这样后面才能做：
- 按天/按餐查看缺口
- 取消某一餐时反向清理清单

### B. 生成清单时做“同名食材合并”
建议规则：
- 仅在 **同 category + 同 unit + 同 name** 时合并
- 单位不同不要自动相加
- 无法确定数量时宁愿保留两条，不要乱合

### C. 加一个“缺口视图”
核心是：
- 哪些食材库存已覆盖
- 哪些需要采购
- 哪些是本周新增需求

backend 可先返回：
- `covered_items`
- `missing_items`
- `expiring_items`

### D. 做菜完成时回写库存
已有基础，但要补强：
- 不是购物清单完成才回写
- meal plan 完成也要可靠扣库存
- 要优先消耗最近过期库存

---

## 4.5 建议涉及文件
backend：
- `backend/src/services/shoppingList.service.ts`
- `backend/src/services/shoppingList/shoppingListGeneration.service.ts`
- `backend/src/controllers/shoppingList.controller.ts`
- `backend/src/services/mealPlan.service.ts`

frontend：
- `frontend/src/screens/plan/ShoppingList*.tsx`
- `frontend/src/hooks/useShoppingList*`

miniprogram：
- `miniprogram/pages/plan/plan.*`
- 如有清单页，则对应清单页一起补

---

## 4.6 验收标准
- 可从一周计划生成一张可读可用的清单
- 同名同单位食材可正确合并
- 可按天/按餐回看来源
- 完成做菜后库存正确减少
- 共享场景下不会“库存变了但清单没完成”

---

## 4.7 最容易踩的坑
1. **把不同单位直接相加**
2. **多人共享场景下 user_id/update 条件不一致**
3. **同名但不同来源的 item 丢失来源信息**
4. **库存扣减不按 expiry_date 排序**
5. **meal plan 改了，但 shopping list 不同步**

---

## 5. 功能三：家庭协作能力（P1）

## 5.1 目标
从“单用户工具”升级成“家庭共同使用的家庭餐食系统”。

---

## 5.2 当前状态
### 已有
- meal plan share 基础能力
- shopping list share 基础能力
- 邀请码/成员移除/共享查看已存在部分实现

### 缺口
- 目前共享更像“单功能共享”，不是统一家庭空间
- meal plan share 与 shopping list share 还是分离概念

---

## 5.3 推荐实现方向
### Phase 1：统一家庭身份层
新增家庭实体：
- `families`
- `family_members`

然后把：
- 周计划
- 购物清单
- 库存
- 模板

逐步接到 family 级别。

### Phase 2：把 share 邀请码升级成 family invite
- 一次加入家庭
- 自动拥有计划/清单/库存的协作权限

### Phase 3：协作行为同步
- 谁完成了哪餐
- 谁勾选了哪个采购项
- 谁改了周计划
- 变更日志/简单操作流

---

## 5.4 推荐最小实现切法
### 第一轮只做：
- `family` + `family_members` 表
- owner 创建家庭
- 邀请码加入家庭
- shopping list 与 meal plan 能按 family 共享查看

### 暂时不要做：
- 复杂权限矩阵
- 多角色审批流
- 聊天/评论
- 实时 websocket

---

## 5.5 验收标准
- 可创建家庭
- 可邀请成员加入
- 家庭成员能看统一周计划/清单
- 关键变更不会写到错误的人或错误的 family 下

---

## 5.6 最容易踩的坑
1. **把现有 share 表直接硬改 family 表，导致回归太大**
2. **owner/user/family 三层权限混乱**
3. **库存到底归个人还是归家庭，没先定规则**

> 建议先明确：
> - `meal_plan`: family 共享
> - `shopping_list`: family 共享
> - `inventory`: 第一版先个人，再考虑家庭库存

---

## 6. 功能四：AI / 搜索继续进化（P1）

## 6.1 目标
从“关键词搜索 + 偏好重排”，升级成“带上下文的饮食决策助手”。

---

## 6.2 推荐拆法
### Phase 1：库存驱动搜索
支持：
- “我家里有鸡蛋、西红柿、豆腐，给我出三道”
- 优先匹配库存、缺口少、宝宝可吃

### Phase 2：场景驱动搜索
支持：
- “今天赶时间”
- “宝宝没胃口”
- “最近咳嗽，想清淡点”
- “想吃鱼但别太复杂”

### Phase 3：联网搜索/AI 搜索也偏好化
当前本地 `/recipes` 已偏好化，但联网搜索/AI 搜索结果还没有完整接入同样的重排逻辑。

---

## 6.3 建议实现点
backend：
- 给搜索层统一一个 ranking pipeline
- 本地 recipe / 联网 recipe / AI 结果走同一套 rerank
- 输出统一 explanation 字段

frontend/miniprogram：
- 在 SearchScreen 展示更清楚的“按什么在帮你排”
- 可增加一键筛选 chips：
  - 30 分钟内
  - 宝宝可吃
  - 避开 xx
  - 库存优先

---

## 6.4 最容易踩的坑
1. **AI 搜索单独一套字段，跟本地搜索割裂**
2. **解释文案和排序规则不一致**
3. **只会“说得好听”，但排序真没变**

---

## 7. 功能五：模板与复用（P2）

## 7.1 目标
把“生成过一次的好计划”沉淀成可复用资产。

### 典型模板
- 工作日快手版
- 宝宝辅食版
- 减脂版
- 家庭聚餐版

---

## 7.2 最小实现建议
### 第一轮
- 周计划保存为模板
- 模板可命名 / 加标签
- 模板可再次套用到新的一周

### 第二轮
- 模板可公开/私有
- 家庭共享模板
- 模板统计使用次数

---

## 7.3 最容易踩的坑
1. **把模板做成计划快照，但缺少 recipe/source 兼容策略**
2. **原菜谱下架后模板失效，没有降级方案**

> 建议模板结构里保留：
> - recipe_id
> - recipe_name_snapshot
> - fallback metadata

---

## 8. 功能六：喂养成长视角（P2）

## 8.1 目标
让系统随着宝宝饮食反馈越来越懂这个家庭。

### 要记录的东西
- 吃没吃
- 爱不爱吃
- 有没有过敏/不适
- 接受度（texture / flavor）
- 新食材尝试记录

---

## 8.2 推荐最小实现
### 第一轮
新增一张“用餐反馈”表，记录：
- recipe_id
- baby_age_at_that_time
- accepted_level（喜欢/一般/拒绝）
- allergy_flag
- note

### 第二轮
把这些数据接到：
- 推荐排序
- 周计划生成
- 新食材引入节奏

---

## 8.3 最容易踩的坑
1. **一上来就想做复杂成长曲线**
2. **把主观反馈和真实过敏混成一类字段**
3. **没有时间维度，导致宝宝 8 个月和 18 个月数据混着用**

---

## 9. 给接手模型的执行方式建议（照着做）

## 9.1 一次只做一个主功能
不要同时开做：
- guest merge
- shopping list 闭环
- family system

这些会互相影响数据模型。

### 推荐节奏
1. 先做 backend
2. 再接 React Native
3. 最后接 miniprogram
4. 每一轮都先 build/test 再继续

---

## 9.2 每一轮改动后都执行这些验证
### backend
```bash
cd /root/.openclaw/workspace/OneDish/backend
npm run build
npm test -- --runInBand
```

### frontend
```bash
cd /root/.openclaw/workspace/OneDish/frontend
npm run build
./node_modules/.bin/jest --config jest.config.cjs --runInBand
```

### miniprogram
```bash
cd /root/.openclaw/workspace/OneDish/miniprogram
../frontend/node_modules/.bin/jest --config jest.config.cjs --runInBand
```

---

## 9.3 commit 建议
每个功能建议至少拆成两类 commit：
1. `feat(...)` 业务功能
2. `test(...)` 或 `refactor(...)` 测试/清理

不要把多个大功能糊成一笔提交。

---

## 10. 最推荐先做哪一个
如果只选一个立刻开工：

## ✅ 首选：游客转正式账号 / 微信账号合并
原因：
- 用户价值最高
- 复用现有 auth 和 user_id 数据结构即可落地
- 做完后留存能力和产品完整度会明显提升

## 第二个建议：购物清单闭环
原因：
- 这是 OneDish 从“推荐工具”变成“真正帮家庭做饭”的关键一跃

---

## 11. 接手模型的禁止事项（强提醒）
1. 不要改坏现有 API 响应契约
2. 不要把小程序 tabBar 跳转改回 `navigateTo`
3. 不要把 guest 改回共享账号
4. 不要在 frontend/miniprogram 各自再发明一套偏好规则
5. 不要把 shopping list 的共享权限逻辑继续放任不一致
6. 不要在没跑 build/test 的情况下直接提交

---

## 12. 可以直接继续产出的后续文档（如果有空）
如果后续还要继续细化，建议再拆三份设计文档：
1. `guest-account-merge-design.md`
2. `shopping-list-closed-loop-design.md`
3. `family-collaboration-v1-design.md`

这三份会比当前这份总实施文档更适合逐项实现。

---

## 13. 一句话总结给接手实现者
先做 **guest -> 正式账号数据合并**，用 backend 事务做原子迁移；  
然后做 **购物清单闭环**，优先修掉共享场景下 `markComplete` 的数据一致性坑；  
其余功能按“家庭协作 -> AI 搜索深化 -> 模板 -> 喂养成长”顺序推进。
