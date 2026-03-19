# External Recipe Save-To-Local Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Let users save an external recipe from the miniprogram recipe detail page directly as a local recipe asset, then immediately unlock local-only actions like favorite, feedback, baby-version generation, and add-to-plan on the same detail view.

**Architecture:** Reuse the existing `POST /user-recipes` backend draft-creation capability instead of inventing a new import pipeline in the first version. Implement the entry in the miniprogram recipe detail page for external recipes only, map the external recipe payload into the minimal user-recipe schema accepted by the backend, and replace the current external detail state with the saved local recipe state after success so the page upgrades in-place from “external recipe” to “local recipe”.

**Tech Stack:** WeChat Mini Program (Page/WXML/WXSS), existing `miniprogram/pages/recipe/recipe.js`, `miniprogram/utils/api.js`, existing backend user recipe routes/services (`POST /api/v1/user-recipes`), local recipe detail capability flow, Jest-based miniprogram tests.

---

### Task 1: Add miniprogram API wrapper for saving external recipes

**Files:**
- Modify: `miniprogram/utils/api.js:203-390`
- Test: `miniprogram/tests/external-recipe-save-api.test.js`

**Step 1: Write the failing test**

Create a focused API test that proves the new wrapper posts to the existing user recipe endpoint with auth.

```js
jest.mock('../utils/request', () => jest.fn((options) => Promise.resolve(options)));
const request = require('../utils/request');
const api = require('../utils/api');

test('saveExternalRecipe posts to /user-recipes with auth', async () => {
  await api.saveExternalRecipe({ name: '番茄牛肉' });

  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    url: '/user-recipes',
    method: 'POST',
    withAuth: true,
    data: { name: '番茄牛肉' },
  }));
});
```

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-api.test.js`
Expected: FAIL because `saveExternalRecipe` does not exist yet.

**Step 3: Write minimal implementation**

Add a wrapper in `miniprogram/utils/api.js`:

```js
function saveExternalRecipe(payload) {
  return request({
    url: '/user-recipes',
    method: 'POST',
    data: payload,
    withAuth: true,
  });
}
```

Export it in `module.exports`.

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-api.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/utils/api.js miniprogram/tests/external-recipe-save-api.test.js
git commit -m "feat: add external recipe save api wrapper"
```

### Task 2: Map external recipe detail into user-recipe payload

**Files:**
- Modify: `miniprogram/pages/recipe/recipe.js:1-220`
- Test: `miniprogram/tests/external-recipe-save-mapping.test.js`

**Step 1: Write the failing test**

Add a pure helper test for the payload mapping so the external-to-local conversion is explicit and stable.

```js
const { buildUserRecipePayloadFromExternalDetail } = require('../pages/recipe/recipe');

test('maps external detail into minimal user recipe payload', () => {
  const payload = buildUserRecipePayloadFromExternalDetail({
    id: 'ext-1',
    title: '番茄牛肉',
    description: '酸甜开胃',
    source: 'external',
    cover_url: 'https://img.example.com/a.jpg',
    cook_time: 25,
    difficulty: '简单',
    ingredients: [{ name: '番茄' }, { name: '牛肉' }],
    adult_version: {
      steps: [{ step: 1, action: '切番茄' }, { step: 2, action: '炖牛肉' }],
    },
  });

  expect(payload).toMatchObject({
    name: '番茄牛肉',
    source: 'external',
    prep_time: 25,
    difficulty: '简单',
    adult_version: expect.objectContaining({
      ingredients: [{ name: '番茄' }, { name: '牛肉' }],
      steps: [{ step: 1, action: '切番茄' }, { step: 2, action: '炖牛肉' }],
    }),
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-mapping.test.js`
Expected: FAIL because the mapping helper does not exist yet.

**Step 3: Write minimal implementation**

Add a helper in `recipe.js` that converts an external detail object into the minimal payload accepted by `POST /user-recipes`.

Recommended mapping:

```js
function buildUserRecipePayloadFromExternalDetail(detail) {
  const ingredients = Array.isArray(detail.ingredients) ? detail.ingredients : [];
  const adultSteps = Array.isArray(detail?.adult_version?.steps)
    ? detail.adult_version.steps
    : Array.isArray(detail.steps)
      ? detail.steps
      : [];

  return {
    name: detail.title || detail.name || '',
    source: detail.source || 'external',
    prep_time: detail.cook_time || detail.total_time || detail.prep_time || 0,
    difficulty: detail.difficulty || 'medium',
    image_url: detail.cover_url ? [detail.cover_url] : [],
    adult_version: {
      description: detail.description || '',
      ingredients,
      steps: adultSteps,
    },
    original_data: detail,
  };
}
```

Keep it minimal. Do not attempt full schema perfection in v1.

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-mapping.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/recipe/recipe.js miniprogram/tests/external-recipe-save-mapping.test.js
git commit -m "feat: map external recipe detail to user recipe payload"
```

### Task 3: Add “保存为本地菜谱” action to external recipe detail

**Files:**
- Modify: `miniprogram/pages/recipe/recipe.js:445-802`
- Modify: `miniprogram/pages/recipe/recipe.wxml:156-366`
- Modify: `miniprogram/pages/recipe/recipe.wxss`
- Test: `miniprogram/tests/external-recipe-save-detail.test.js`

**Step 1: Write the failing test**

Add a page-level test that proves external recipe detail can save and then switch into local recipe capability state.

```js
test('saving external detail upgrades the page into local recipe state', async () => {
  api.saveExternalRecipe.mockResolvedValue({
    id: 'local-1',
    name: '番茄牛肉',
    source: 'ugc',
    adult_version: { ingredients: [{ name: '番茄' }], steps: [{ step: 1, action: '炒' }] },
  });

  page.data.detail = {
    id: 'ext-1',
    title: '番茄牛肉',
    is_external_result: true,
    ingredients: [{ name: '番茄' }],
    adult_version: { steps: [{ step: 1, action: '炒' }] },
  };

  await page.saveExternalRecipeToLocal();

  expect(page.data.detail.is_external_result).toBe(false);
  expect(page.data.detail.id).toBe('local-1');
});
```

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-detail.test.js`
Expected: FAIL because no save action exists yet.

**Step 3: Write minimal implementation**

Implement in `recipe.js`:
- `isSavingExternalRecipe` page state
- `saveExternalRecipeToLocal()` handler
- call `buildUserRecipePayloadFromExternalDetail(detail)`
- call `api.saveExternalRecipe(payload)`
- on success, adapt returned recipe into the local detail shape and replace the current `detail`
- set `is_external_result = false`
- show success feedback and toast
- keep the user on the current detail view

Example success path:

```js
async saveExternalRecipeToLocal() {
  const { detail, isSavingExternalRecipe } = this.data;
  if (!detail?.is_external_result || isSavingExternalRecipe) return;

  this.setData({ isSavingExternalRecipe: true });

  try {
    const payload = buildUserRecipePayloadFromExternalDetail(detail);
    const saved = await api.saveExternalRecipe(payload);
    const nextDetail = adaptRecipeData(saved && saved.recipe ? saved.recipe : saved);
    await this.applyDetailState({ ...nextDetail, is_external_result: false });
    this.setActionFeedback('已保存为本地菜谱，下面可以继续收藏、反馈或生成宝宝版。', 'success');
    wx.showToast({ title: '已保存为本地菜谱', icon: 'success' });
  } catch (err) {
    wx.showToast({ title: err.message || '保存失败，请稍后重试', icon: 'none' });
  } finally {
    this.setData({ isSavingExternalRecipe: false });
  }
}
```

In `recipe.wxml`, for external recipes add a quick action:

```xml
<view wx:if="{{detail.is_external_result}}" class="detail-quick-card save" bindtap="saveExternalRecipeToLocal">
  <text class="detail-quick-title">保存为本地菜谱</text>
  <text class="detail-quick-desc">保存后可继续收藏、反馈、生成宝宝版和加入计划。</text>
</view>
```

Hide it once the detail has become local.

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/external-recipe-save-detail.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/recipe/recipe.js miniprogram/pages/recipe/recipe.wxml miniprogram/pages/recipe/recipe.wxss miniprogram/tests/external-recipe-save-detail.test.js
git commit -m "feat: save external recipe to local detail flow"
```

### Task 4: Verify post-save local capability upgrade

**Files:**
- Modify: `miniprogram/tests/external-recipe-save-detail.test.js`
- Modify: existing tests only if required
- Test: `miniprogram/tests/external-recipe-save-api.test.js`
- Test: `miniprogram/tests/external-recipe-save-mapping.test.js`
- Test: `miniprogram/tests/external-recipe-save-detail.test.js`
- Test: `miniprogram/tests/recipe-favorites.test.js`
- Test: existing execution/shopping tests if touched

**Step 1: Write the failing integration assertions**

Add assertions that prove save success actually unlocks local-only capabilities on the current page state.

```js
test('saved external recipe can proceed through local-only actions', async () => {
  await page.saveExternalRecipeToLocal();

  expect(page.data.detail.is_external_result).toBe(false);
  expect(page.data.detail.id).toBe('local-1');
  expect(page.data.detail.is_favorited).toBe(false);
});
```

Also add a failure-path check:

```js
test('save failure keeps external state unchanged', async () => {
  api.saveExternalRecipe.mockRejectedValue(new Error('保存失败'));
  const original = { ...page.data.detail };

  await page.saveExternalRecipeToLocal();

  expect(page.data.detail.is_external_result).toBe(true);
  expect(page.data.detail.id).toBe(original.id);
});
```

**Step 2: Run tests to verify current failures**

Run:
- `cd miniprogram && npx jest --runInBand tests/external-recipe-save-api.test.js tests/external-recipe-save-mapping.test.js tests/external-recipe-save-detail.test.js`
Expected: FAIL until all logic is correctly wired.

**Step 3: Write minimal verification fixes**

Fix only the edges required to make the save flow stable:
- returned payload shape handling (`saved.recipe` vs direct object)
- preserving current detail scroll state if needed
- ensuring external-only CTAs disappear after save and local-only behavior gates become available

**Step 4: Run full verification**

Run:
- `cd miniprogram && npx jest --runInBand tests/external-recipe-save-api.test.js tests/external-recipe-save-mapping.test.js tests/external-recipe-save-detail.test.js tests/recipe-favorites.test.js tests/search-quick-actions.test.js __tests__/plan-execution-state.test.js tests/plan-shopping-sync.test.js tests/home-plan-schedule.test.js`
Expected: PASS with 0 failing suites.

**Step 5: Commit**

```bash
git add miniprogram/tests miniprogram/pages/recipe miniprogram/utils/api.js
git commit -m "test: verify external recipe save to local flow"
```
