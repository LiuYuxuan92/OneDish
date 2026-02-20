# Phase 1 实施记录

> 日期: 2026-02-20
> 范围: 基础修复 — 认证流程、数据引用、宝宝版数据源统一、日志清理

---

## 改动文件清单

### Task 1: 修复认证流程

| 文件 | 改动说明 |
|------|----------|
| `frontend/src/App.tsx` | `MainNavigator` → `RootNavigator`，恢复认证守卫 |
| `frontend/src/navigation/RootNavigator.tsx` | 加载中显示 loading 界面（替代 `return null`） |
| `frontend/src/hooks/useAuth.ts` | Web 平台无 token 时自动游客登录；`login()` 同时保存 refreshToken 到移动端 |
| `frontend/src/screens/auth/LoginScreen.tsx` | 登录成功后调用 `useAuth().login()`，不再手动 AsyncStorage + `navigation.replace` |
| `frontend/src/screens/auth/RegisterScreen.tsx` | 实现真实注册（调用 `authApi.register`），注册成功后自动登录或提示登录 |

**关键逻辑:**
- Web 平台（开发测试）: `useAuth.checkAuth()` 发现无 token → 自动调用 `/auth/guest` → 设置 `isAuthenticated=true` → 直接进入主页
- 移动端: 无 token → `isAuthenticated=false` → RootNavigator 显示 AuthNavigator → 登录/注册 → 成功调 `login()` → RootNavigator 自动切换到 MainNavigator

### Task 2: 修复 HomeScreen 数据引用错误

| 文件 | 改动说明 |
|------|----------|
| `frontend/src/screens/home/HomeScreen.tsx` | `recipe.adult_version?.name` → `recipe.name`；`recipe.baby_version?.name` → `'宝宝版'`；`recipe.sync_cooking?.time_saving` → 固定文案 |

### Task 3: 统一宝宝版数据源

| 文件 | 改动说明 |
|------|----------|
| `frontend/src/hooks/useRecipeTransform.ts` | 新增 `useBabyVersion(recipeId, babyAgeMonths)` hook，使用 React Query 缓存，统一静态/动态数据源 |
| `frontend/src/screens/recipe/RecipeDetailScreen.tsx` | 删除手动 `useRecipeTransform` + `useEffect` + `transformResult` + `effectiveBaby` + `parseJSON` 散落逻辑，替换为 `useBabyVersion` hook |

**数据优先级:**
1. 静态 `baby_version` + 默认月龄(12) → 直接返回静态版
2. 其他情况 → 调用 transform API → 返回动态转换版
3. React Query 自动缓存 5 分钟

### Task 4: 清理 console.log

| 文件 | 移除数量 |
|------|----------|
| `frontend/src/hooks/useRecipes.ts` | 6 处 |
| `frontend/src/hooks/useSearch.ts` | 6 处 |
| `frontend/src/hooks/useShoppingLists.ts` | 5 处 |
| `frontend/src/screens/recipe/RecipeDetailScreen.tsx` | 2 处 |
| `frontend/src/screens/recipe/SearchScreen.tsx` | 1 处 |
| `frontend/src/screens/profile/FavoritesScreen.tsx` | 1 处 |

**保留:** 所有 `console.error`（合理的错误日志）、`utils/share.tsx` 的微信配置日志

---

## 验证方式

1. `npm run dev` 启动后端
2. `npx expo start --web` 启动前端
3. 验证项:
   - Web 平台自动游客登录，直接进入主页（无登录页闪烁）
   - HomeScreen 今日推荐卡片文案正确显示（不出现 undefined）
   - 菜谱详情页切换宝宝版 Tab，转换正常工作
   - 浏览器控制台无多余 console.log 输出
