# OneDish (简家厨) Development Roadmap

> This document is designed for AI-assisted development. Each task includes precise file paths, current implementation context, and acceptance criteria. Feed this to your AI coding assistant to execute.

## Project Context

OneDish is a family cooking app with a unique "one dish, two versions" concept — generating paired adult + baby recipes from the same ingredients. The stack is:

- **Backend**: Node.js + TypeScript + Express + Knex + SQLite(dev)/PostgreSQL(prod) + Redis
- **Frontend**: React Native + Expo + TypeScript + TanStack Query + styled-components
- **Mini Program**: WeChat native (MVP scaffold, minimal functionality)
- **Key services**: AI recipe search (MiniMax/OpenAI), recommendation engine with feedback learning, UGC with quality scoring, family sharing (shopping lists + meal plans)

### Current Architecture Summary

```
backend/src/
  controllers/    # Express route handlers (auth, recipe, mealPlan, shoppingList, etc.)
  services/       # Business logic (mealPlan.service.ts is the recommendation engine)
  adapters/       # External API integrations (ai.adapter.ts, tianxing.adapter.ts)
  middleware/     # auth, rateLimiter, errorHandler, metrics, responseNormalizer
  routes/         # Express Router definitions
  database/       # Knex migrations and seeds

frontend/src/
  screens/home/   # HomeScreen (1108 lines), swapStrategy, swapWeightsConfig, recommendationInsights
  screens/plan/   # WeeklyPlanScreen (1412 lines), ShoppingList screens
  screens/recipe/ # RecipeDetail, CookingMode, Search, BabyStage
  screens/profile/# User profile, favorites, inventory, settings
  hooks/          # React Query hooks (useRecipes, useMealPlans, useShoppingLists)
  analytics/      # Event tracking (mainFlow.ts, sdk.ts)

miniprogram/      # WeChat mini program MVP (home, recipe, plan pages)
```

---

## Phase 1: Code Quality & Refactoring (Priority: HIGH)

These tasks reduce technical debt and make all subsequent features easier to implement.

### Task 1.1: Decompose HomeScreen.tsx

**Current state**: `frontend/src/screens/home/HomeScreen.tsx` is 1108 lines with `// @ts-nocheck` at line 1. It handles UI rendering, swap logic, debug panel, analytics tracking, remote config, and A/B experiment state all in one component.

**Goal**: Split into focused modules while preserving all existing behavior.

**Implementation plan**:

1. Extract `useHomeRecommendation` custom hook to `frontend/src/screens/home/useHomeRecommendation.ts`:
   - Move all state: `currentRecipe`, `swapping`, `preferredCategories`, `localPreferredCategories`, `swapScoringWeights`, `swapExperimentBucket`, `swapConfigSource`
   - Move swap logic: debounce handling (`lastSwapAtRef`, `SWAP_DEBOUNCE_MS`), `handleSwap` function, `pendingSwapSuccessRef`
   - Move effects: swap weights config loading, preferred categories computation
   - Expose: `{ currentRecipe, swapping, handleSwap, swapExperimentBucket, swapConfigSource }`

2. Extract `useHomeAnalytics` custom hook to `frontend/src/screens/home/useHomeAnalytics.ts`:
   - Move: `hasTrackedHomeViewRef`, `lastRecommendationSourceRef`, `lastQualityTrackedRecipeIdRef`
   - Move: all `trackMainFlowEvent` calls and quality scoring side effects
   - Expose: `{ trackSwap, trackView }`

3. Extract `HomeDebugPanel` component to `frontend/src/screens/home/HomeDebugPanel.tsx`:
   - Move: `showDebugPanel`, `remoteEnabledDraft`, `remoteUrlDraft` state
   - Move: the debug panel JSX block and its related handlers
   - Props: `{ visible, swapExperimentBucket, swapConfigSource, swapScoringWeights }`

4. Extract `RecipeCard` component to `frontend/src/screens/home/RecipeCard.tsx`:
   - Move: the main recipe display card JSX
   - Props: `{ recipe, currentStage, preferredCategories, onPress, onSwap }`

5. Remove `// @ts-nocheck` from HomeScreen.tsx and fix type errors (replace `any` with proper types).

**Acceptance criteria**:
- HomeScreen.tsx is under 200 lines
- All existing functionality works identically
- No `// @ts-nocheck` remains
- `npm run type-check` passes in frontend/

### Task 1.2: Decompose WeeklyPlanScreen.tsx

**Current state**: `frontend/src/screens/plan/WeeklyPlanScreen.tsx` is 1412 lines with `// @ts-nocheck` at line 1. Contains week navigation, meal plan grid, smart recommendation modal, sharing modal, feedback submission — all in one file.

**Goal**: Same decomposition approach as HomeScreen.

**Implementation plan**:

1. `useWeeklyPlanState.ts` — week navigation state, date calculations, tab state
2. `WeekDayCard.tsx` — single day's 3-meal card (breakfast/lunch/dinner)
3. `SmartRecommendationModal.tsx` — the AI recommendation panel with A/B pick and feedback
4. `WeeklyShareModal.tsx` — invite code generation, join, member management
5. `GenerateOptionsModal.tsx` — baby age, exclude ingredients, generation preferences
6. Remove `// @ts-nocheck` and fix types.

**Acceptance criteria**: Same as Task 1.1 but for WeeklyPlanScreen.

### Task 1.3: Decompose ShoppingListService

**Current state**: `backend/src/services/shoppingList.service.ts` is 1231 lines. Handles CRUD, sharing, invite codes, member management, item checking, and list generation — all in one class.

**Goal**: Split into focused services.

**Implementation plan**:

1. `ShoppingListShareService` — extract all sharing logic: `createShare`, `joinShare`, `regenerateInvite`, `removeMember`, `getShareContext`, invite code management
2. `ShoppingListGenerationService` — extract list generation from recipes/meal plans
3. Keep `ShoppingListService` for core CRUD (create, get, update items, check/uncheck)
4. Wire new services into `shoppingList.controller.ts`

**Acceptance criteria**:
- Each service file < 300 lines
- All existing API endpoints return identical responses
- `npm run verify` passes in backend/

### Task 1.4: Add Integration Tests for Critical Paths

**Current state**: Backend has 1 test file (`sharing-permissions.test.ts`), frontend has 3 test files (swap strategy tests). No tests for auth flow, quota, or recommendation engine.

**Goal**: Add tests for the highest-risk code paths.

**Implementation plan** (use `jest` + `ts-jest`, already configured in `backend/jest.config.cjs`):

1. `backend/src/services/__tests__/auth.test.ts`:
   - Test token generation produces valid JWT with `user_id` field
   - Test token blacklisting: blacklisted token returns `isBlacklisted = true`
   - Test refresh token rotation: old token is blacklisted after refresh

2. `backend/src/services/__tests__/mealPlan.test.ts`:
   - Test `generateWeeklyPlan` produces 7 days x 3 meals
   - Test baby age filtering excludes unsuitable recipes
   - Test `getSmartRecommendations` returns A/B picks
   - Test feedback submission updates learning profile

3. `backend/src/services/__tests__/quota.test.ts`:
   - Test quota consumption with in-memory fallback (when Redis unavailable)
   - Test per-user vs global quota limits

4. `frontend/src/screens/home/__tests__/homeRecommendation.test.ts` (after Task 1.1):
   - Test swap debounce prevents rapid-fire swaps
   - Test preferred categories built from favorites

**Acceptance criteria**:
- `npm run test` passes in both backend/ and frontend/
- Coverage for auth, recommendation, and quota paths

---

## Phase 2: Feature Enhancements (Priority: MEDIUM)

### Task 2.1: Ingredient Inventory Expiry Notifications

**Current state**: `backend/src/database/migrations/20250119000007_create_ingredient_inventory_table.ts` creates an inventory table with `expiry_date` column. `backend/src/routes/ingredientInventory.routes.ts` has basic CRUD. No notification system exists.

**Goal**: Alert users when ingredients are about to expire, and suggest recipes that use those ingredients.

**Backend implementation**:

1. Add endpoint `GET /api/v1/ingredient-inventory/expiring?days=3` in `backend/src/routes/ingredientInventory.routes.ts`:
   - Query: `SELECT * FROM ingredient_inventory WHERE user_id = ? AND expiry_date <= DATE('now', '+? days') AND quantity > 0 ORDER BY expiry_date ASC`
   - Return: `{ items: [...], suggested_recipes: [...] }`
   - For `suggested_recipes`: query `recipes` table where `adult_version` JSON contains any of the expiring ingredient names (use LIKE matching)

2. Add to `MealPlanService.getSmartRecommendations()` in `backend/src/services/mealPlan.service.ts`:
   - Add an `expiring_boost` weight dimension (env: `REC_RANK_V2_WEIGHT_EXPIRING`, default 0.15)
   - In `buildCandidateMetaV2`, check if recipe ingredients overlap with user's expiring items (next 3 days)
   - Boost score for recipes that consume expiring ingredients

**Frontend implementation**:

3. Add `useExpiringIngredients` hook in `frontend/src/hooks/useIngredientInventory.ts`
4. Show a warning banner on HomeScreen when expiring items exist: "你有 3 种食材即将过期，查看推荐菜谱"
5. Add expiry indicator (red/yellow dot) on InventoryScreen item cards

**Acceptance criteria**:
- Expiring items API returns correct results
- Recommendation engine prioritizes expiring-ingredient recipes
- Frontend shows expiry warnings

### Task 2.2: Smart Recipe Swap API for Mini Program

**Current state**: `miniprogram/README.md` line 54-58 notes that the mini program uses a naive random swap because no dedicated backend endpoint exists. The React Native frontend has a sophisticated client-side swap strategy (`swapStrategy.ts`) but it's not reusable server-side.

**Goal**: Create a server-side swap endpoint so both mini program and future clients get smart swaps.

**Implementation**:

1. Create `backend/src/services/swap.service.ts`:
   - Port the scoring logic from `frontend/src/screens/home/swapStrategy.ts` (lines 112-195 `getSwapCandidate` function)
   - Accept: `{ current_recipe_id, user_id?, baby_age_months?, preferred_categories? }`
   - Return: `{ recipe: {...}, score, reasons: [...] }`
   - Use server-side data: user favorites (from `favorites` table), recipe pool (from `recipes` table)

2. Create route `POST /api/v1/recipes/swap` in `backend/src/routes/recipe.routes.ts`:
   - Optional auth (use `optionalAuth` middleware)
   - If authenticated, auto-fetch preferred categories from user's favorites
   - If anonymous, accept `preferred_categories` in body

3. Update `miniprogram/pages/home/home.js`:
   - Replace the naive random swap (lines 35-55) with a call to `POST /api/v1/recipes/swap`
   - Fallback to current behavior if API fails

**Acceptance criteria**:
- `POST /api/v1/recipes/swap` returns a scored candidate
- Mini program uses the new endpoint
- React Native frontend can optionally use it too (but doesn't have to)

### Task 2.3: Cooking Mode Enhancements

**Current state**: `frontend/src/screens/recipe/CookingModeScreen.tsx` exists with basic step-by-step cooking UI and timers. No voice guidance, no sync-cooking timeline visualization.

**Goal**: Add sync-cooking timeline view that shows adult and baby cooking steps in parallel.

**Implementation**:

1. Create `frontend/src/screens/recipe/SyncCookingTimeline.tsx`:
   - Visual component showing two parallel tracks (adult + baby) on a vertical timeline
   - Shared steps highlighted in a merged lane
   - Each step shows: action text, duration badge, timer button
   - Data source: `recipe.sync_cooking` field (already stored as JSON in DB, see `backend/src/types/index.ts` lines 233-238 `SyncCookingInfo`)

2. The backend already generates sync cooking data via `RecipePairingEngine.generateSyncCookingTips()` in `backend/src/utils/recipe-pairing-engine.ts` and the `/api/v1/pairing/generate` endpoint. The `SyncTimeline` type is defined at `backend/src/types/index.ts` lines 289-309.

3. Add a "sync cooking" tab/toggle to CookingModeScreen that switches between single-step view and timeline view.

4. Use `expo-haptics` (already installed) for step completion feedback.

**Acceptance criteria**:
- Timeline renders adult + baby tracks with shared steps
- Timer per step works
- Haptic feedback on step completion

### Task 2.4: Shopping List Smart Merge

**Current state**: `backend/src/services/shoppingList.service.ts` generates shopping lists from meal plan recipes. Items are categorized into `produce`, `protein`, `staple`, `seasoning`, `snack_dairy`, `household`, `other`. No deduplication or quantity merging across recipes.

**Goal**: When generating a weekly shopping list, merge identical ingredients across recipes and sum quantities.

**Implementation**:

1. In the shopping list generation logic, after collecting all ingredients from the week's recipes:
   - Normalize ingredient names (trim, lowercase for matching)
   - Group by normalized name
   - Sum quantities (parse numeric amounts like "200g" + "300g" = "500g")
   - Keep track of which recipes each ingredient came from (for the `recipes` field in `ShoppingListItem`)

2. Add a "merge" option to the generate endpoint: `POST /api/v1/shopping-lists/generate?merge=true`

3. Frontend: Show recipe source tags on merged items (e.g. "鸡蛋 x6 — 来自: 番茄炒蛋、蛋炒饭")

**Acceptance criteria**:
- Same ingredient from multiple recipes appears once with summed quantity
- Recipe sources tracked per merged item

---

## Phase 3: Growth & Engagement (Priority: MEDIUM-LOW)

### Task 3.1: Meal Plan Template Sharing (Social)

**Current state**: Users can share a specific week's meal plan with one family member via invite code (see `MealPlanService.createWeeklyShare` at `backend/src/services/mealPlan.service.ts` line 778). This is 1-to-1 sharing only.

**Goal**: Allow users to publish a week plan as a reusable "template" that other users can browse and clone.

**Implementation**:

1. New migration: `create_meal_plan_templates` table
   ```
   id, creator_user_id, title, description,
   plan_data (JSON: { monday: { breakfast: recipe_id, ... }, ... }),
   baby_age_range, tags, clone_count, is_public,
   created_at, updated_at
   ```

2. New service: `backend/src/services/mealPlanTemplate.service.ts`
   - `publishTemplate(userId, weekData, meta)` — save current week plan as template
   - `browseTemplates(filters)` — list public templates, filterable by baby age, tags
   - `cloneTemplate(userId, templateId)` — copy template into user's meal plan for current week

3. New routes: `backend/src/routes/mealPlanTemplate.routes.ts`
   - `POST /api/v1/meal-plan-templates` (requires auth)
   - `GET /api/v1/meal-plan-templates` (public browse)
   - `POST /api/v1/meal-plan-templates/:id/clone` (requires auth)

4. Frontend: Add "share as template" button on WeeklyPlanScreen, and a "browse templates" discovery screen.

**Acceptance criteria**:
- Users can publish and browse meal plan templates
- Cloning a template populates the user's weekly plan
- Templates are filterable by baby age range

### Task 3.2: Recipe Difficulty Auto-Calibration

**Current state**: Recipe difficulty is a static string field (`'简单' | '中等' | '困难'`) set at creation time. Users' actual cooking completion data exists in `meal_plans.is_completed`.

**Goal**: Use completion rate data to refine difficulty labels — if 95% of users complete a "困难" recipe, it may actually be "中等".

**Implementation**:

1. Add scheduled job in backend (similar to `MealPlanService.startRecommendationLearningScheduler`):
   - For each recipe with >10 completions in meal_plans, calculate completion rate
   - If completion_rate > 0.9 and difficulty = '困难', suggest downgrade
   - If completion_rate < 0.5 and difficulty = '简单', suggest upgrade
   - Store calibrated difficulty in a new column `calibrated_difficulty`

2. Use `calibrated_difficulty` (when available) in recommendation scoring and display.

**Acceptance criteria**:
- Calibration job runs on schedule
- API returns `calibrated_difficulty` alongside original `difficulty`

### Task 3.3: WeChat Mini Program Feature Parity

**Current state**: Mini program (`miniprogram/`) is an MVP scaffold with basic pages (home, recipe list, plan). Missing features compared to React Native app: authentication, swap strategy, weekly plan generation, shopping list sharing, cooking mode.

**Goal**: Bring mini program to feature parity for core flows.

**Priority order for mini program**:
1. User authentication (WeChat login → backend JWT)
2. Smart swap using Task 2.2's server-side API
3. Weekly plan generation + display
4. Shopping list with check/uncheck sync
5. Family sharing via WeChat share card

**Implementation notes**:
- All business logic should live in the backend — mini program only calls APIs
- Use `wx.login()` for WeChat auth, add a `/api/v1/auth/wechat` endpoint in backend
- Use `wx.showShareMenu()` for native sharing

**Acceptance criteria**:
- Core user journey works in mini program: login → see recommendation → swap → generate plan → view shopping list

---

## Phase 4: AI Integration Deepening (Priority: LOW — do after Phase 1-2)

### Task 4.1: AI-Powered Baby Version Generation

**Current state**: `backend/src/services/recipe-transform.service.ts` transforms adult recipes to baby versions using rule-based logic (ingredient substitution tables, age-based texture mapping). `backend/src/adapters/ai.adapter.ts` connects to MiniMax/OpenAI for recipe search.

**Goal**: Offer an AI-enhanced baby version generation that provides more nuanced adaptations than rule-based logic.

**Implementation**:

1. Add method `generateBabyVersionWithAI(adultRecipe, babyAgeMonths)` to a new `backend/src/services/ai-transform.service.ts`:
   - Prompt the AI with: adult recipe details, baby age, dietary restrictions
   - Ask for: ingredient substitutions, texture modifications, portion adjustments, allergy warnings
   - Validate AI output through `UgcRiskService.evaluate()` (already exists at `backend/src/services/ugc-risk.service.ts`)
   - Cache results in `transform_cache` table (already exists)

2. Add `?ai=true` query parameter to `POST /api/v1/pairing/generate`:
   - Default: existing rule-based engine
   - With `ai=true`: use AI generation with rule-based fallback
   - Track AI cost via `metricsService.inc('onedish_ai_cost_usd_total', ...)`

3. Rate limit AI generation per user (use existing quota system in `backend/src/services/quota.service.ts`)

**Acceptance criteria**:
- AI-generated baby versions pass UGC risk validation
- Fallback to rule-based on AI failure
- Cost tracked in metrics

### Task 4.2: Natural Language Meal Planning

**Current state**: `MealPlanService.generateWeeklyPlan()` uses rule-based selection (prep time filter, baby suitability scoring, nutrition balance tracking). Users set preferences via structured form fields.

**Goal**: Allow users to describe preferences in natural language: "这周多做鱼类，宝宝最近不爱吃胡萝卜" and generate a plan accordingly.

**Implementation**:

1. Add `POST /api/v1/meal-plans/generate-from-prompt`:
   - Accept: `{ prompt: string, baby_age_months?: number }`
   - Use AI to extract structured constraints from prompt:
     ```json
     { "prefer_ingredients": ["鱼"], "exclude_ingredients": ["胡萝卜"], "mood": "light" }
     ```
   - Pass extracted constraints to existing `generateWeeklyPlan()` as preferences
   - Return same format as existing generate endpoint

2. Frontend: Add a text input option on the plan generation modal (alongside the existing structured form)

**Acceptance criteria**:
- Natural language input produces valid meal plans
- Extracted constraints are visible to user for confirmation before generating

---

## Implementation Priority Summary

| Phase | Task | Effort | Impact | Priority |
|-------|------|--------|--------|----------|
| 1.1 | Decompose HomeScreen | Medium | High (maintainability) | P0 |
| 1.2 | Decompose WeeklyPlanScreen | Medium | High (maintainability) | P0 |
| 1.3 | Decompose ShoppingListService | Small | Medium | P0 |
| 1.4 | Add integration tests | Medium | High (reliability) | P0 |
| 2.1 | Expiry notifications | Small | Medium (engagement) | P1 |
| 2.2 | Server-side swap API | Small | Medium (mini program) | P1 |
| 2.3 | Sync cooking timeline | Medium | High (core feature) | P1 |
| 2.4 | Shopping list merge | Small | Medium (UX) | P1 |
| 3.1 | Plan template sharing | Medium | Medium (growth) | P2 |
| 3.2 | Difficulty calibration | Small | Low | P2 |
| 3.3 | Mini program parity | Large | High (reach) | P2 |
| 4.1 | AI baby version | Medium | Medium | P3 |
| 4.2 | NL meal planning | Medium | Medium | P3 |

---

## Conventions for AI Developers

When implementing any task above, follow these project conventions:

1. **Backend patterns**:
   - Services are classes instantiated in controllers: `new SomeService()`
   - Use `db('table_name')` from `../config/database` for all queries (Knex)
   - All responses follow `{ code: number, message: string, data: T }` format
   - Errors use `createError(message, statusCode, errorCode?)` from `../middleware/errorHandler`
   - Auth middleware: `authenticate` (required) or `optionalAuth` (optional) from `../middleware/auth`
   - JWT payload contains `{ user_id, username, role }` — always access as `req.user?.user_id`
   - Logger: `import { logger } from '../utils/logger'`

2. **Frontend patterns**:
   - API calls go through hooks in `frontend/src/hooks/` using TanStack Query
   - API client functions go in `frontend/src/api/`
   - Styles use theme constants from `frontend/src/styles/theme.ts`: `Colors`, `Typography`, `Spacing`, `BorderRadius`, `Shadows`
   - Navigation types defined in `frontend/src/types.ts`
   - Analytics: use `trackMainFlowEvent()` from `frontend/src/analytics/mainFlow.ts` for main flow events
   - Use `trackEvent()` from `frontend/src/analytics/sdk.ts` for general events

3. **Database migrations**:
   - File naming: `YYYYMMDDHHMMSS_description.ts` in `backend/src/database/migrations/`
   - Use `knex.schema.createTable` / `knex.schema.alterTable`
   - Always include `created_at` and `updated_at` columns

4. **Testing**:
   - Backend: Jest + ts-jest, config in `backend/jest.config.cjs`
   - Frontend: Jest, test files in `__tests__/` directories
   - Run: `npm run verify` (lint + test + build) in both directories

5. **Git commits**: Follow conventional commits format: `feat(scope):`, `fix(scope):`, `docs:`, `refactor:`
