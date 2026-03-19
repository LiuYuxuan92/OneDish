# Miniprogram P2 Parallel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Implement the next P2 miniprogram improvements by parallelizing the two low-risk UI flows (favorites quick actions and profile family entry) while separately researching the higher-uncertainty external recipe save capability.

**Architecture:** Reuse the already-approved miniprogram execution-state and shopping-list flows instead of creating new scheduling/storage paths. Treat favorites quick actions and profile family entry as page-level extensions with minimal shared-state impact, while handling “save external recipe as my recipe” as a research-first task because current miniprogram code does not show an obvious existing API or import path for promoting external recipes into local assets.

**Tech Stack:** WeChat Mini Program (Page/WXML/WXSS), existing `miniprogram/utils/api.js`, execution-state flow on `pages/plan`, recipe-detail navigation helpers, local storage fallbacks, Vant Weapp, Jest-based miniprogram regression tests.

---

### Task 1: Favorites page quick actions

**Files:**
- Modify: `miniprogram/pages/favorites/favorites.js:21-113`
- Modify: `miniprogram/pages/favorites/favorites.wxml:26-53`
- Modify: `miniprogram/pages/favorites/favorites.wxss`
- Modify: `miniprogram/pages/plan/plan.js` only if a tiny existing pending execution consumer needs reuse rather than duplication
- Test: `miniprogram/tests/favorites-quick-actions.test.js`

**Step 1: Write the failing test**

Create focused tests that prove favorites entries can trigger quick actions without requiring the detail page.

```js
describe('favorites quick actions', () => {
  it('builds a pending execution payload for a favorite recipe', () => {
    const recipe = { id: 'recipe-1', title: '番茄鸡蛋面', ingredients: ['番茄', '鸡蛋'] };
    const payload = buildFavoritePlanPayload(recipe);

    expect(payload.slot.mealType).toBe('dinner');
    expect(payload.recipe.id).toBe('recipe-1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/favorites-quick-actions.test.js`
Expected: FAIL because favorites quick-action helpers/handlers do not exist yet.

**Step 3: Write minimal implementation**

Implement two direct actions on each favorites card:
- `加入清单`
- `加入计划`

Recommended behavior:
- `加入清单` reuses the existing shopping-list path already used by home/recipe/search.
- `加入计划` writes into the same approved execution-state handoff path used by home scheduling (today dinner by default), then navigates to `/pages/plan/plan`.
- Keep `继续做` and `取消收藏` intact.

Example payload shape to reuse:

```js
const payload = {
  source: 'favorites',
  slot: { date: formatDateKey(), mealType: 'dinner', mealLabel: '晚餐', label: '今天晚餐' },
  recipe: { id: item.id, title: item.title || item.name, ingredients: item.ingredients || [] },
  createdAt: new Date().toISOString(),
};
wx.setStorageSync('pending_plan_execution', payload);
```

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/favorites-quick-actions.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/favorites/favorites.js miniprogram/pages/favorites/favorites.wxml miniprogram/pages/favorites/favorites.wxss miniprogram/tests/favorites-quick-actions.test.js
git commit -m "feat: add quick actions to favorites"
```

### Task 2: Profile family entry surface

**Files:**
- Modify: `miniprogram/pages/profile/profile.js:1-221`
- Modify: `miniprogram/pages/profile/profile.wxml:36-141`
- Modify: `miniprogram/pages/profile/profile.wxss`
- Optionally create: `miniprogram/pages/family/family.json`
- Optionally create: `miniprogram/pages/family/family.js`
- Optionally create: `miniprogram/pages/family/family.wxml`
- Optionally create: `miniprogram/pages/family/family.wxss`
- Modify: `miniprogram/app.json` if a new non-tab page is introduced
- Test: `miniprogram/tests/profile-family-entry.test.js`

**Step 1: Write the failing test**

Create a focused test proving the profile page now exposes a family entry/navigation path.

```js
describe('profile family entry', () => {
  it('provides a family hub action', () => {
    const config = loadProfilePage();
    expect(typeof config.goToFamily).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/profile-family-entry.test.js`
Expected: FAIL because no family entry currently exists.

**Step 3: Write minimal implementation**

Implement the smallest useful P2 family entry:
- Add a `我的家庭` entry in profile hub and/or settings list.
- Route it to a lightweight family page/placeholder surface with:
  - 我的家庭
  - 创建家庭
  - 加入家庭
  - 查看邀请码/成员

Important constraints:
- Do not invent full backend family management if there is no existing API.
- This task is about filling the missing入口 and structured placeholder/next-step surface.
- Use honest copy if actions are pending backend support.

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/profile-family-entry.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/profile/profile.js miniprogram/pages/profile/profile.wxml miniprogram/pages/profile/profile.wxss miniprogram/pages/family miniprogram/app.json miniprogram/tests/profile-family-entry.test.js
git commit -m "feat: add family entry to profile"
```

### Task 3: Research external recipe “save as my recipe” capability

**Files:**
- Review: `miniprogram/pages/search/search.js`
- Review: `miniprogram/pages/recipe/recipe.js`
- Review: `miniprogram/utils/api.js:190-299`
- Review: relevant backend API/docs if available in repo
- Create: `docs/plans/2026-03-19-external-recipe-save-research.md`
- Test: none required unless a clear helper is extracted during research

**Step 1: Write the failing test / research question**

Document the uncertainty up front:
- Current miniprogram code exposes external recipe detail and add-to-shopping-list flows.
- There is no obvious miniprogram-side save/import endpoint for turning an external recipe into a local recipe asset.
- Before implementation, we need to know whether backend support already exists.

**Step 2: Run repository search to verify the gap**

Run targeted searches such as:
- `Grep: save.*recipe`
- `Grep: external.*recipe`
- `Grep: /recipes`
- `Grep: import.*recipe`

Expected: likely no obvious save/import path in current miniprogram code.

**Step 3: Write minimal research output**

Produce a short research note that answers:
- Is there already a backend/API path for “save external recipe as my recipe”?
- If yes, what request/response shape should miniprogram use?
- If no, what is the minimal API and page behavior needed for implementation?
- Which existing capabilities become available after save (favorite, feedback, baby-version, add-to-plan)?

**Step 4: Verify research completeness**

Run: manual review of the research note against the roadmap requirement.
Expected: the note gives a concrete go/no-go answer for implementation.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-19-external-recipe-save-research.md
git commit -m "docs: map external recipe save capability"
```

### Task 4: Cross-task verification and integration check

**Files:**
- Modify: `miniprogram/tests/favorites-quick-actions.test.js`
- Modify: `miniprogram/tests/profile-family-entry.test.js`
- Modify: existing regression tests only if needed
- Test: `miniprogram/tests/*` and `miniprogram/__tests__/*`

**Step 1: Write the failing integration checks**

Add/extend tests only where logic was actually touched. Focus on verifying:
- favorites quick actions reuse the approved pending execution path
- profile family entry navigates correctly
- no regression in existing home/search/recipe/plan quick actions and execution-state logic

**Step 2: Run test suite to verify current failures**

Run: `cd miniprogram && npx jest --runInBand tests/favorites-quick-actions.test.js tests/profile-family-entry.test.js tests/search-quick-actions.test.js tests/recipe-favorites.test.js __tests__/plan-execution-state.test.js tests/plan-shopping-sync.test.js tests/home-plan-schedule.test.js`
Expected: FAIL until all touched behaviors are implemented.

**Step 3: Write minimal verification fixes**

Fix only the failing integration edges discovered while completing Tasks 1-3. Do not broaden scope beyond P2.

**Step 4: Run full verification**

Run: `cd miniprogram && npx jest --runInBand tests/favorites-quick-actions.test.js tests/profile-family-entry.test.js tests/search-quick-actions.test.js tests/recipe-favorites.test.js __tests__/plan-execution-state.test.js tests/plan-shopping-sync.test.js tests/home-plan-schedule.test.js`
Expected: PASS with 0 failing suites.

**Step 5: Commit**

```bash
git add miniprogram/tests miniprogram/__tests__ miniprogram/pages/favorites miniprogram/pages/profile miniprogram/pages/family docs/plans/2026-03-19-external-recipe-save-research.md
git commit -m "test: verify miniprogram p2 entry flows"
```
