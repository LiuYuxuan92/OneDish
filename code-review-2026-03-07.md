# OneDish 代码评审报告

> **评审时间**: 2026-03-07  
> **评审范围**: backend + frontend + miniprogram  
> **代码规模**: 340 TypeScript 文件

---

## 📊 整体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | ✅ 良好 | 无 SQL 注入，密码 bcrypt 处理，JWT 正常 |
| 错误处理 | ✅ 良好 | 170+ try-catch，使用 logger |
| 代码质量 | ⚠️ 一般 | 大量 @ts-nocheck，技术债务 |
| 性能 | ✅ 良好 | 索引完整，Redis 缓存 |
| 可维护性 | ⚠️ 一般 | 大文件需拆分 |

---

## 🔴 高优先级问题

### 1. [高] 前端 TypeScript 类型检查大面积禁用

**现状**: 10+ 文件使用 `@ts-nocheck`

```
frontend/src/api/client.ts:1:// @ts-nocheck
frontend/src/hooks/useRecipes.ts:1:// @ts-nocheck
frontend/src/hooks/useMealPlans.ts:1:// @ts-nocheck
```

**影响**: 类型错误无法被静态检查，线上隐患

**建议**: 
- 优先修复 `useRecipes.ts`, `useMealPlans.ts`（高频使用）
- 逐步迁移到严格类型

---

### 2. [中] console.log 残留在生产代码

**现状**: 25 处 console.log/console.error

```
backend/src/services/recipe.service.ts:173:    console.log('[searchRecipes] params:', params);
backend/src/services/shoppingList.controller.ts:207:  console.log('[Backend] addRecipeToShoppingList called:');
```

**影响**: 生产环境日志污染

**建议**: 统一使用项目 logger

---

### 3. [中] TODO 未完成

```typescript
// backend/src/controllers/auth.controller.ts:250
// TODO: 生产环境需要用微信服务器验证 code 换取 openid

// backend/src/services/mealPlanTemplate.service.ts:124
// TODO: 将模板数据复制到用户的 meal_plan 表（当前周）
```

**影响**: 功能不完整

---

## 🟡 中优先级问题

### 4. [中] 大文件技术债务

| 文件 | 行数 | 建议 |
|------|------|------|
| `mealPlan.service.ts` | 1065 | 拆分服务 |
| `shoppingList.service.ts` | 692 | 已有拆分计划 |
| `ai-transform.service.ts` | 518 | 可拆分 |

---

### 5. [低] 缺少关键测试覆盖

- ❌ 无登录流程集成测试
- ❌ 无支付/会员流程测试
- ✅ auth/mealPlan/quota 有基础测试

---

## ✅ 做得好的地方

1. **安全**: 
   - 密码 bcrypt 加密
   - JWT token 黑名单
   - 微信登录 pending 但代码结构正确

2. **数据库**:
   - 索引完整
   - migration 规范

3. **错误处理**:
   - 统一使用 logger
   - 异步路由正确使用 `next(error)`

4. **之前的问题已修复**:
   - SQL 注入 ✅
   - JWT 漏洞 ✅
   - 异步错误处理 ✅

---

## 📋 建议行动项

| 优先级 | 项目 | 预计工作量 |
|--------|------|----------|
| P1 | 移除高频 hook 的 @ts-nocheck | 1-2h |
| P2 | 统一使用 logger 替换 console | 2h |
| P3 | 完成 2 个 TODO | 2h |
| P3 | 补充登录流程测试 | 4h |

---

## 🎯 总结

OneDish 项目整体质量**良好**，之前的评审问题已全部修复。当前主要技术债务在前端类型检查和大文件拆分，建议逐步迭代优化。

**结论**: 🟢 可接受，建议逐步解决技术债务
