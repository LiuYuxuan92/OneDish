# Bug 修复与 UI/UX 打磨实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 6 个 P0 Bug、8 个 P1 体验缺陷、2 个 P2 样式统一问题，全面提升应用质量。

**Architecture:** 按屏幕/组件分批修复，每批独立可测试。无新增后端接口，所有改动均在前端。样式统一使用已有的 `frontend/src/styles/theme.ts` 中的 Colors/Typography/Spacing/BorderRadius/Shadows Token。

**Tech Stack:** React Native + TypeScript + React Query + theme.ts 设计系统

---

## Task 1: ShoppingListScreen — 修复添加物品弹框 + 删除按钮

**Files:**
- Modify: `frontend/src/screens/plan/ShoppingListScreen.tsx`

**Step 1: 修复添加物品弹框输入框无法聚焦**

在弹框 `modalContent` View（~行688）上添加事件拦截，阻止触摸冒泡到外层遮罩：

```typescript
// 行687 modalOverlay 下的 modalContent View 修改为：
<View
  style={styles.modalContent}
  onStartShouldSetResponder={() => true}
>
```

原理：外层 `modalOverlay` 是一个 `TouchableOpacity`（或带 `onPress` 的 View），点击时关闭弹框。`onStartShouldSetResponder={() => true}` 让内部容器拦截触摸事件，防止冒泡到遮罩层。

**Step 2: 验证删除按钮**

检查 ~行280 的删除按钮。审查发现已有 `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`（行284），触摸区域已扩大。问题可能与外层 `pointerEvents` 有关。

检查父容器是否有 `pointerEvents="box-none"` 属性。如果有，改为删除该属性或改为 `pointerEvents="auto"`。

**Step 3: Commit**

```bash
git add frontend/src/screens/plan/ShoppingListScreen.tsx
git commit -m "fix: shopping list add-item modal input focus and delete button tap"
```

---

## Task 2: RecipeDetailScreen — 修复变量声明顺序

**Files:**
- Modify: `frontend/src/screens/recipe/RecipeDetailScreen.tsx`

**Step 1: 将 handleShare 和 timerSteps 移到正确位置**

当前代码顺序：
- 行123: `handleShare`（引用 `effectiveBaby`, `recipe`）
- 行133: `timerSteps`（引用 `parsedCurrent`）
- 行141-164: 早期返回（loading/error）
- 行171: `parseJSON` 定义
- 行183: `parsedAdult` 定义
- 行187: `effectiveBaby` 定义
- 行188: `parsedCurrent` 定义

问题：`const` 有 TDZ（暂时性死区），`timerSteps` 在 `parsedCurrent` 声明前就使用了它，会得到 `undefined`。

修复：将 `handleShare`（行123-130）和 `timerSteps`（行132-139）这两个声明**剪切**，移到 `parsedCurrent`（行188）之后、`return` 语句之前。

修复后的顺序应为：
```
行141-164: 早期返回（loading/error）
行171: parseJSON
行183: parsedAdult
行187: effectiveBaby
行188: parsedCurrent
[新位置] handleShare（现在 effectiveBaby 和 recipe 已有值）
[新位置] timerSteps（现在 parsedCurrent 已有值）
行196+: return (...)
```

**Step 2: Commit**

```bash
git add frontend/src/screens/recipe/RecipeDetailScreen.tsx
git commit -m "fix: move handleShare and timerSteps after variable declarations"
```

---

## Task 3: FavoritesScreen — 修复跨栈导航 + 删除失败提示

**Files:**
- Modify: `frontend/src/screens/profile/FavoritesScreen.tsx`

**Step 1: 修复 "去逛逛菜谱" 导航**

行109 当前代码：
```typescript
onPress={() => navigation.navigate('RecipeList' as never)}
```

修改为（与 HomeScreen 一致的跨 Tab 导航模式）：
```typescript
onPress={() => {
  const parentNav = navigation.getParent() as any;
  parentNav?.navigate('Recipes', { screen: 'RecipeList' });
}}
```

**Step 2: 添加删除收藏失败用户提示**

行41-46 当前代码：
```typescript
const handleRemoveFavorite = async (recipeId: string, recipeName: string) => {
  try {
    await removeFavoriteMutation.mutateAsync(recipeId);
  } catch (error) {
    console.error('取消收藏失败:', error);
  }
};
```

修改为：
```typescript
const handleRemoveFavorite = async (recipeId: string, recipeName: string) => {
  try {
    await removeFavoriteMutation.mutateAsync(recipeId);
  } catch (error) {
    console.error('取消收藏失败:', error);
    Alert.alert('操作失败', '取消收藏失败，请稍后重试');
  }
};
```

需要在文件顶部添加 `Alert` 导入（如果没有）：
```typescript
import { ..., Alert } from 'react-native';
```

**Step 3: Commit**

```bash
git add frontend/src/screens/profile/FavoritesScreen.tsx
git commit -m "fix: favorites cross-tab navigation and remove failure alert"
```

---

## Task 4: WeeklyPlanScreen — 空餐位添加 + 429 提示 + 周切换

**Files:**
- Modify: `frontend/src/screens/plan/WeeklyPlanScreen.tsx`

**Step 1: 空餐位"添加"按钮添加 onPress**

行152-157 当前代码：
```typescript
<TouchableOpacity style={styles.mealEmpty}>
  <Text style={styles.mealEmptyIcon}>➕</Text>
  <Text style={styles.mealEmptyText}>添加</Text>
</TouchableOpacity>
```

修改为（导航到菜谱列表选择）：
```typescript
<TouchableOpacity
  style={styles.mealEmpty}
  onPress={() => {
    const parentNav = navigation.getParent() as any;
    parentNav?.navigate('Recipes', { screen: 'RecipeList' });
  }}
>
  <Text style={styles.mealEmptyIcon}>➕</Text>
  <Text style={styles.mealEmptyText}>添加</Text>
</TouchableOpacity>
```

**Step 2: 429 限流错误添加用户提示**

行111-118 当前代码：
```typescript
} catch (error: any) {
  if (error?.response?.status === 429 || error?.statusCode === 429) {
    console.warn('请求过于频繁，请稍后再试');
  } else {
    console.error('生成计划失败:', error);
  }
```

修改为：
```typescript
} catch (error: any) {
  if (error?.response?.status === 429 || error?.statusCode === 429) {
    Alert.alert('操作频繁', '请稍后再试，每分钟最多操作1次');
  } else {
    Alert.alert('生成失败', '生成计划失败，请检查网络后重试');
    console.error('生成计划失败:', error);
  }
```

确保文件顶部有 `import { ..., Alert } from 'react-native'`。

**Step 3: 添加周切换导航按钮**

在周标题区域（找到显示日期范围 "MM/DD - MM/DD" 的位置）左右添加切换箭头。

找到标题区域的 View，修改为：
```typescript
<View style={styles.weekNavigation}>
  <TouchableOpacity
    onPress={() => {
      const prev = new Date(selectedWeek);
      prev.setDate(prev.getDate() - 7);
      setSelectedWeek(prev);
    }}
    style={styles.weekNavButton}
  >
    <ChevronLeftIcon size={20} color={Colors.text.secondary} />
  </TouchableOpacity>
  <Text style={styles.weekRangeText}>
    {/* 原有的日期范围文本 */}
  </Text>
  <TouchableOpacity
    onPress={() => {
      const next = new Date(selectedWeek);
      next.setDate(next.getDate() + 7);
      setSelectedWeek(next);
    }}
    style={styles.weekNavButton}
  >
    <ChevronRightIcon size={20} color={Colors.text.secondary} />
  </TouchableOpacity>
</View>
```

添加样式：
```typescript
weekNavigation: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
},
weekNavButton: {
  padding: 8,
},
```

注意：`ChevronLeftIcon` 和 `ChevronRightIcon` 已经在文件顶部导入但未使用。确认导入存在即可。

**Step 4: Commit**

```bash
git add frontend/src/screens/plan/WeeklyPlanScreen.tsx
git commit -m "fix: add meal slot navigation, 429 alert, and week switching"
```

---

## Task 5: BabyStageScreen + StageDetailScreen — 补齐错误/空状态

**Files:**
- Modify: `frontend/src/screens/recipe/BabyStageScreen.tsx`
- Modify: `frontend/src/screens/recipe/StageDetailScreen.tsx`

**Step 1: BabyStageScreen 添加 error + empty 状态**

修改 hook 调用，解构 `error` 和 `refetch`：
```typescript
const { data: stages, isLoading, error, refetch } = useAllBabyStages();
```

在 `isLoading` 判断之后、`return` 之前添加：
```typescript
if (error) {
  return (
    <SafeAreaView style={styles.centered}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: 4 }}>加载失败</Text>
      <Text style={{ fontSize: 13, color: Colors.text.tertiary, marginBottom: 16 }}>请检查网络后重试</Text>
      <TouchableOpacity
        onPress={() => refetch()}
        style={{ backgroundColor: Colors.primary.main, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
      >
        <Text style={{ color: '#FFF', fontWeight: '600' }}>重试</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

在 `stages` 为空时添加空状态提示（在 `ScrollView` 内 map 之前）：
```typescript
{(!stages || stages.length === 0) && !isLoading && (
  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
    <Text style={{ fontSize: 40, marginBottom: 12 }}>🍼</Text>
    <Text style={{ fontSize: 16, color: Colors.text.secondary }}>暂无阶段数据</Text>
  </View>
)}
```

需要添加 `Colors` 导入：
```typescript
import { Colors } from '../../styles/theme';
```

**Step 2: StageDetailScreen 添加 error 状态**

修改 stageData 查询，添加 error 处理。在现有的 `stageLoading ? ... : stageData ? ... : null` 三目表达式中添加 error 分支，或在 ScrollView 内容顶部添加：

```typescript
// 在 useQuery 返回中解构 error
const { data: stageData, isLoading: stageLoading, error: stageError } = useQuery({...});
```

在指南卡区域添加 error 判断：
```typescript
{stageLoading ? (
  <ActivityIndicator style={{ margin: 20 }} color="#FF7043" />
) : stageError ? (
  <View style={{ alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 14, color: Colors.functional.error }}>指南加载失败，请下拉刷新</Text>
  </View>
) : stageData ? (
  <StageGuideCard stage={stageData} defaultExpanded={false} />
) : null}
```

需要添加 `Colors` 导入。

**Step 3: Commit**

```bash
git add frontend/src/screens/recipe/BabyStageScreen.tsx frontend/src/screens/recipe/StageDetailScreen.tsx
git commit -m "fix: add error and empty states to BabyStage and StageDetail screens"
```

---

## Task 6: ProfileScreen — 错误状态 + 动态收藏数 + 菜单项

**Files:**
- Modify: `frontend/src/screens/profile/ProfileScreen.tsx`

**Step 1: 添加错误状态**

在现有的 `if (isLoading && !user)` 之后添加：
```typescript
if (error && !user) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.centerContent}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={styles.loadingText}>加载失败</Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.primary.main, fontSize: 16, fontWeight: '600' }}>重试</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

确保从 hook 中解构了 `error` 和 `refetch`。

**Step 2: 动态收藏数量**

添加 favorites hook 导入：
```typescript
import { useFavorites } from '../../hooks/useFavorites';
```

在组件内添加：
```typescript
const { data: favData } = useFavorites({ limit: 1 }); // 只取总数
```

将行176的硬编码 `15` 替换为：
```typescript
<Text style={styles.statValue}>{favData?.data?.total ?? 0}</Text>
```

注意：检查 `useFavorites` 返回的数据结构。`favoritesApi.getFavorites` 返回的响应中，收藏总数可能在 `data.total` 或 `data.data.total` 中。读取 `useFavorites` 的返回值确认路径。

**Step 3: 帮助与反馈 / 关于我们添加 Alert**

行86的空函数修改为：
```typescript
onPress: () => Alert.alert(
  '帮助与反馈',
  '如有问题或建议，请联系我们：\n\n邮箱：support@jianjiachu.com\nGitHub: github.com/LiuYuxuan92/OneDish',
),
```

行92的空函数修改为：
```typescript
onPress: () => Alert.alert(
  '关于简家厨',
  '简家厨 v1.0.0\n\n让每一餐都充满爱\n\n一菜两吃 · 大人宝宝都满足',
),
```

确保导入了 `Alert`。

**Step 4: Commit**

```bash
git add frontend/src/screens/profile/ProfileScreen.tsx
git commit -m "fix: profile error state, dynamic favorites count, and menu actions"
```

---

## Task 7: HomeScreen — 宝宝月龄从用户档案读取

**Files:**
- Modify: `frontend/src/screens/home/HomeScreen.tsx`

**Step 1: 从用户档案获取宝宝月龄**

添加导入：
```typescript
import { useUserInfo } from '../../hooks/useUsers';
```

在组件内添加（在现有 hooks 附近）：
```typescript
const { data: userInfo } = useUserInfo();
const babyAge = userInfo?.data?.baby_age;
```

注意：`useUserInfo` 返回 `res.data`（即 `{ code, message, data: UserInfo }`），所以实际的用户对象在 `userInfo?.data`。但需要读取现有调用模式确认。

修改行26：
```typescript
// 旧: const { data: currentStage } = useBabyStageByAge(9);
const { data: currentStage } = useBabyStageByAge(babyAge);
```

这样当 `babyAge` 为 `undefined`（未设置宝宝月龄）时，`useBabyStageByAge` 的 `enabled: !!months` 会禁止查询，辅食建议卡片不会显示。

**Step 2: Commit**

```bash
git add frontend/src/screens/home/HomeScreen.tsx
git commit -m "fix: read baby age from user profile instead of hardcoded value"
```

---

## Task 8: RecipeCard — 显示菜谱图片

**Files:**
- Modify: `frontend/src/components/recipe/RecipeCard.tsx`

**Step 1: 添加图片显示**

在文件顶部添加 `Image` 导入：
```typescript
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
```

解析 `image_url`（可能是 JSON 字符串数组）：
```typescript
// 在 RecipeCard 组件内，prepTime 之后
const imageUrl = (() => {
  if (!recipe.image_url) return null;
  try {
    const urls = typeof recipe.image_url === 'string' ? JSON.parse(recipe.image_url) : recipe.image_url;
    return Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
  } catch {
    return typeof recipe.image_url === 'string' ? recipe.image_url : null;
  }
})();
```

替换行28-30的占位符区域：
```typescript
<View style={styles.imagePlaceholder}>
  {imageUrl ? (
    <Image source={{ uri: imageUrl }} style={styles.recipeImage} resizeMode="cover" />
  ) : (
    <Text style={styles.emoji}>🍽️</Text>
  )}
</View>
```

添加样式：
```typescript
recipeImage: {
  width: '100%',
  height: '100%',
  borderTopLeftRadius: BorderRadius.lg,
  borderTopRightRadius: BorderRadius.lg,
},
```

**Step 2: Commit**

```bash
git add frontend/src/components/recipe/RecipeCard.tsx
git commit -m "feat: display recipe images in RecipeCard with emoji fallback"
```

---

## Task 9: 样式 Token 统一

**Files:**
- Modify: `frontend/src/screens/recipe/BabyStageScreen.tsx`
- Modify: `frontend/src/screens/recipe/StageDetailScreen.tsx`
- Modify: `frontend/src/components/recipe/StageGuideCard.tsx`
- Modify: `frontend/src/screens/home/HomeScreen.tsx`（babySection 样式）
- Modify: `frontend/src/screens/recipe/RecipeListScreen.tsx`（babyBanner 样式）

**Step 1: 建立颜色映射表**

以下硬编码颜色应替换为 Token：

| 硬编码 | 替换为 | 含义 |
|--------|--------|------|
| `'#F8F9FA'` | `Colors.neutral.gray100` (#F7F5F2) | 页面背景 |
| `'#FFF'` / `'#FFFFFF'` | `Colors.neutral.white` | 卡片背景 |
| `'#1A1A1A'` | `Colors.text.primary` (#1F1D1B) | 主文字 |
| `'#888'` | `Colors.text.tertiary` (#9A9184) | 辅助文字 |
| `'#555'` | `Colors.text.secondary` (#5C564F) | 次要文字 |
| `'#999'` | `Colors.text.tertiary` | 弱文字 |
| `'#CCC'` | `Colors.border.default` (#D9D4CC) | 边框/箭头 |
| `'#DDD'` | `Colors.border.light` (#EDE9E4) | 浅边框 |
| `'#444'` | `Colors.text.secondary` | 标签文字 |
| `'#FF7043'` | `Colors.primary.main` (#FF8C42) | 主色强调 |
| `'#FF9800'` | `Colors.functional.warning` (#FF9800) | 营养/提示 |
| `'#4CAF50'` | `Colors.secondary.main` / `Colors.functional.success` | 绿色 |
| `'#F44336'` | `Colors.functional.error` (#F44336) | 红色/不能吃 |
| `'#2196F3'` | `Colors.functional.info` (#2196F3) | 蓝色 |
| `'#9C27B0'` | 保留（紫色，Theme 无对应） | 紫色阶段色 |
| `'#FFF8E1'` | `Colors.functional.warningLight` (#FFF3E0) | 辅食卡片背景 |
| `'#F8F9FA'`(tips) | `Colors.neutral.gray100` | Tips 区背景 |
| `borderRadius: 14` | `BorderRadius.xl` (16) | 卡片圆角 |
| `borderRadius: 12` | `BorderRadius.lg` (12) | 中圆角 |
| `borderRadius: 20` | `BorderRadius['2xl']` (20) | 药丸形 |
| `borderRadius: 8` | `BorderRadius.md` (8) | 小圆角 |
| `elevation: 1/2` | `...Shadows.xs` / `...Shadows.sm` | 阴影 |
| `padding: 16` | `Spacing.md` (16) | 标准间距 |
| `padding: 12` | `Spacing[3]` (12) | 小间距 |
| `marginBottom: 12` | `Spacing[3]` (12) | 小下边距 |
| `marginHorizontal: 16` | `Spacing.md` (16) | 标准水平边距 |
| `gap: 8` | `Spacing.sm` (8) | 小间隙 |
| `fontSize: 22` | `Typography.heading.h2.fontSize` (24) 或自定义 | 标题 |
| `fontSize: 16` | `Typography.fontSize.base` (16) | 正文 |
| `fontSize: 15` | `Typography.fontSize.base` (16) | 近似 |
| `fontSize: 14` | `Typography.fontSize.sm` (14) | 小字 |
| `fontSize: 13` | `Typography.fontSize.xs` (12) 或 `sm` (14) | 注释 |
| `fontSize: 12` | `Typography.fontSize.xs` (12) | 小注 |
| `fontSize: 11` | `Typography.fontSize['2xs']` (10) 或 `xs` | 极小 |
| `fontWeight: '700'` | `Typography.fontWeight.bold` | 粗体 |
| `fontWeight: '600'` | `Typography.fontWeight.semibold` | 半粗 |

**Step 2: 逐文件替换**

在每个文件中：
1. 添加 theme 导入：`import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';`
2. 用 Find & Replace 替换所有硬编码值（参照上表）
3. 对于 `styles.StyleSheet.create()` 中的对象属性，使用 spread 语法替换阴影：`...Shadows.xs` 代替手写 shadowColor/shadowOffset 等

**Step 3: Commit**

```bash
git add frontend/src/screens/recipe/BabyStageScreen.tsx \
       frontend/src/screens/recipe/StageDetailScreen.tsx \
       frontend/src/components/recipe/StageGuideCard.tsx \
       frontend/src/screens/home/HomeScreen.tsx \
       frontend/src/screens/recipe/RecipeListScreen.tsx
git commit -m "refactor: replace hardcoded colors with design system tokens"
```

---

## Task 10: 更新文档 + Push

**Step 1: 更新设计文档状态**

修改 `docs/plans/2026-02-21-polish-bugfix-design.md`，将状态改为 `已完成`。

**Step 2: 更新开发进度**

在 `docs/05-开发进度.md` 顶部添加本次修复记录。

**Step 3: Commit & Push**

```bash
git add docs/
git commit -m "docs: update polish and bugfix implementation status"
git push origin master
```

---

## 验证检查清单

完成所有 Task 后验证：

```
P0 Bug:
□ 购物清单 → 点击"添加物品" → 弹框内输入框可正常聚焦输入
□ 购物清单 → 删除按钮可正常点击删除
□ 菜谱详情 → 切换到大人/宝宝版 → 计时器步骤列表有数据
□ 收藏列表为空时 → 点击"去逛逛菜谱" → 正确导航到菜谱列表
□ 周计划 → 快速多次点击"生成" → 看到"操作频繁"提示
□ 周计划 → 空餐位"添加"按钮 → 可点击导航

P1 体验:
□ 辅食体系页面 → 断网后访问 → 显示错误和重试按钮
□ 阶段详情页 → 接口报错 → 显示错误提示
□ 个人页 → 接口报错 → 显示错误和重试
□ 个人页 → 收藏数量 → 显示实际数量（非写死15）
□ 个人页 → 点击"帮助与反馈" → 弹出联系信息
□ 个人页 → 点击"关于我们" → 弹出版本信息
□ 首页 → 有宝宝月龄的账号 → 显示正确阶段的辅食建议
□ 首页 → 无宝宝月龄 → 不显示辅食建议卡片
□ 菜谱卡片 → 有图片的菜谱 → 显示图片
□ 菜谱卡片 → 无图片的菜谱 → 显示🍽️占位
□ 周计划 → 左右箭头切换上/下周

P2 样式:
□ 辅食相关页面 → 背景色与其他页面一致（温暖米白色调）
□ 文字颜色 → 与全局风格统一
```
