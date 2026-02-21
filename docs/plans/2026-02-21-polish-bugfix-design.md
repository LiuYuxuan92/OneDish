# Bug 修复与 UI/UX 打磨方案

> 状态: 待实施
> 日期: 2026-02-21
> 目标: 修复所有已知 Bug、补齐缺失的 UI 状态、统一样式 Token 使用

---

## 一、P0 — 必修 Bug（6 项）

### 1. 购物清单"添加物品"弹框输入框无法聚焦

**文件:** `frontend/src/screens/plan/ShoppingListScreen.tsx`
**问题:** 弹框外层 `TouchableOpacity`（用于点击遮罩关闭弹框）拦截了内部 TextInput 的触摸事件，导致点击输入框时弹框直接关闭。
**修复:** 在 `modalContent` 容器上添加 `onStartShouldSetResponder={() => true}`，阻止事件冒泡到外层遮罩。

### 2. 购物清单删除按钮可能无法点击

**文件:** `frontend/src/screens/plan/ShoppingListScreen.tsx`
**问题:** 删除按钮触摸区域太小（32x32），加上父容器 `pointerEvents="box-none"` 可能影响事件传递。
**修复:** 增大 TouchableOpacity 的 `hitSlop` 为 `{top: 10, bottom: 10, left: 10, right: 10}`，并验证 `pointerEvents` 不影响点击。

### 3. RecipeDetailScreen timerSteps 变量顺序错误

**文件:** `frontend/src/screens/recipe/RecipeDetailScreen.tsx`
**问题:** `timerSteps`（~行133）在 `parsedCurrent`（~行188）之前声明，由于 `const` 的 TDZ 规则，`parsedCurrent` 在 `timerSteps` 计算时为 `undefined`，导致计时器步骤始终为空数组。`handleShare` 也有类似引用顺序问题。
**修复:** 将 `handleShare` 和 `timerSteps` 的定义移到 `parsedCurrent` / `effectiveBaby` 声明之后。

### 4. FavoritesScreen 跨栈导航使用 `as never`

**文件:** `frontend/src/screens/profile/FavoritesScreen.tsx`
**问题:** `navigation.navigate('RecipeList' as never)` — Profile 栈没有 RecipeList 路由，类型被强制绕过，导航可能静默失败。
**修复:** 改用 `navigation.getParent()?.navigate('Recipes', { screen: 'RecipeList' })` 跨 Tab 导航（与 HomeScreen 模式一致）。

### 5. WeeklyPlanScreen 空餐位"添加"按钮无响应

**文件:** `frontend/src/screens/plan/WeeklyPlanScreen.tsx`
**问题:** 空餐位 "+" 按钮的 `TouchableOpacity` 没有 `onPress` 处理器。
**修复:** 添加 `onPress` 导航到菜谱选择页面（navigate to RecipeList），或弹出一个简易选择 Modal。

### 6. WeeklyPlanScreen 429 限流错误无用户提示

**文件:** `frontend/src/screens/plan/WeeklyPlanScreen.tsx`
**问题:** 429 错误仅 `console.warn`，用户完全不知道操作失败。
**修复:** 在 catch 块中添加 `Alert.alert('操作频繁', '请稍后再试')` 或类似提示。

---

## 二、P1 — 体验缺陷（8 项）

### 7. BabyStageScreen 缺少错误/空状态

**文件:** `frontend/src/screens/recipe/BabyStageScreen.tsx`
**问题:** 仅解构 `isLoading`，无 `error` 处理。API 失败时显示空白。
**修复:** 解构 `error`，添加错误重试 UI 和空状态提示。

### 8. StageDetailScreen 缺少错误状态

**文件:** `frontend/src/screens/recipe/StageDetailScreen.tsx`
**问题:** stageData 查询失败时无任何提示。
**修复:** 添加错误 UI，显示"加载失败，点击重试"。

### 9. ProfileScreen 缺少错误状态 + 收藏数写死

**文件:** `frontend/src/screens/profile/ProfileScreen.tsx`
**问题:**
- 用户数据加载失败时仅显示默认值，无错误提示
- "收藏菜谱"数量硬编码为 15
**修复:**
- 添加 error 状态 UI
- 从 favorites API 获取实际收藏数量

### 10. HomeScreen 宝宝月龄硬编码为 9

**文件:** `frontend/src/screens/home/HomeScreen.tsx`
**问题:** `useBabyStageByAge(9)` — 月龄写死为 9 个月。
**修复:** 从 `useUserInfo()` 获取 `user.baby_age`，如无则不显示辅食建议卡片。

### 11. FavoritesScreen 删除收藏失败无用户提示

**文件:** `frontend/src/screens/profile/FavoritesScreen.tsx`
**问题:** 删除失败只有 `console.error`。
**修复:** 添加 `Alert.alert('取消收藏失败', '请稍后重试')`。

### 12. RecipeCard 不显示菜谱图片

**文件:** `frontend/src/components/recipe/RecipeCard.tsx`
**问题:** 始终显示占位符 emoji，未使用 `recipe.image_url`。
**修复:** 当 `image_url` 存在且非空时渲染 `Image` 组件，否则保留 emoji 占位。

### 13. WeeklyPlanScreen 无法切换上/下周

**文件:** `frontend/src/screens/plan/WeeklyPlanScreen.tsx`
**问题:** `ChevronLeftIcon`/`ChevronRightIcon` 已导入但未使用。`selectedWeek` 状态永远不更新。
**修复:** 在周标题区域添加左右箭头按钮，点击时更新 `selectedWeek`。

### 14. ProfileScreen "帮助与反馈"/"关于我们"无响应

**文件:** `frontend/src/screens/profile/ProfileScreen.tsx`
**问题:** `onPress: () => {}` — 空函数。
**修复:** 显示 `Alert.alert` 弹出简易信息（版本号/联系方式），或跳转到 GitHub issues 页面。

---

## 三、P2 — 样式 Token 统一（2 项）

### 15. 新增页面/组件硬编码颜色替换

涉及文件:
- `frontend/src/screens/recipe/BabyStageScreen.tsx`
- `frontend/src/screens/recipe/StageDetailScreen.tsx`
- `frontend/src/components/recipe/StageGuideCard.tsx`
- `frontend/src/screens/home/HomeScreen.tsx`（babySection 样式）
- `frontend/src/screens/recipe/RecipeListScreen.tsx`（babyBanner 样式）

**修复:** 将所有硬编码颜色（`#F8F9FA`、`#888`、`#1A1A1A`、`#FF7043` 等）替换为对应的 theme token（`Colors.neutral.gray100`、`Colors.text.secondary`、`Colors.text.primary`、`Colors.functional.warning` 等）。

### 16. 背景色与设计规范对齐

**问题:** 新页面使用 `#F8F9FA` 但设计规范定义 `neutral.gray100 = #F7F5F2`。
**修复:** 统一使用 `Colors.neutral.gray100` 或 `Colors.neutral.gray50` 作为背景色。

---

## 实施策略

按模块分批修复，每批独立可测试：

1. **Batch 1 — ShoppingListScreen** (P0-1, P0-2)
2. **Batch 2 — RecipeDetailScreen** (P0-3)
3. **Batch 3 — FavoritesScreen** (P0-4, P1-11)
4. **Batch 4 — WeeklyPlanScreen** (P0-5, P0-6, P1-13)
5. **Batch 5 — BabyStageScreen + StageDetailScreen** (P1-7, P1-8)
6. **Batch 6 — ProfileScreen** (P1-9, P1-14)
7. **Batch 7 — HomeScreen** (P1-10)
8. **Batch 8 — RecipeCard** (P1-12)
9. **Batch 9 — 样式 Token 统一** (P2-15, P2-16)
