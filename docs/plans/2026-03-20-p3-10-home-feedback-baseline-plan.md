# P3-10 Home Feedback Baseline Convergence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** 把首页反馈回流展示收敛成一个小而清晰、可评审的实现闭环，让 P3-10 Task 2 可以在不重做首页的前提下继续推进。

**Architecture:** 保留当前首页主体结构，不重写首页，只把 `recommendationFeedbackSummary`、recent feedback 拉取、`summarizeFeedbackState` 映射和 reason card 附近的小 recap block 压缩成一个最小闭环。测试只聚焦反馈摘要这条链路，不再承担整页行为验证，避免把 swap/undo、会员、shortcut 等不相关噪音继续卷入 P3-10 评审面。

**Tech Stack:** WeChat Mini Program（Page/WXML/WXSS）、现有 `miniprogram/utils/api.js`、`miniprogram/utils/feedbackSummary.js`、Jest 小程序页面测试。

---

### Task 1: Tighten home feedback summary page-state contract

**Files:**
- Modify: `miniprogram/tests/home-feedback-summary.test.js`
- Modify: `miniprogram/pages/home/home.js`

**Step 1: Write the failing test**

把 `home-feedback-summary.test.js` 收敛成只验证 P3-10 Task 2 所需的页面状态契约。至少包含：

```js
test('loadTodayRecommendation stores accepted feedback summary on current recommendation', async () => {
  api.getTodayRecommendation.mockResolvedValue({
    recipe: { id: 'recipe-liked', title: '番茄牛肉' },
  });
  api.getRecentFeedingFeedback.mockResolvedValue({
    items: [{ accepted_level: 'like' }],
  });
  api.checkFavorite.mockResolvedValue({ is_favorited: false });

  await page.loadTodayRecommendation();

  expect(api.getRecentFeedingFeedback).toHaveBeenCalledWith({ recipe_id: 'recipe-liked', limit: 3 });
  expect(page.data.recommendationFeedbackSummary).toEqual({
    state: 'accepted',
    label: '宝宝接受过',
  });
});
```

同一个测试文件再补两类断言：
- `applyRecommendation()` 对 recent `reject` 写入 `{ state: 'rejected', label: '之前拒绝过' }`
- 无反馈时 `recommendationFeedbackSummary` 保持 `null`

不要在这份测试里继续覆盖 swap/undo、会员、收藏、购物清单等首页其它行为。

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/home-feedback-summary.test.js`
Expected: FAIL，因为当前首页实现或测试仍混有不必要噪音，且页面状态契约还未被收敛成这条最小链路。

**Step 3: Write minimal implementation**

在 `miniprogram/pages/home/home.js` 中只保留/补齐 feedback summary 必要链路：

```js
const { summarizeFeedbackState } = require('../../utils/feedbackSummary');

async function loadRecommendationFeedbackSummary(recipeId) {
  if (!recipeId) return null;

  try {
    const result = await api.getRecentFeedingFeedback({ recipe_id: recipeId, limit: 3 });
    return summarizeFeedbackState(result?.items || []);
  } catch (_err) {
    return null;
  }
}
```

并确保：

```js
data: {
  recommendationFeedbackSummary: null,
}
```

在 `applyRecommendation(recipe, options = {})` 里挂接：

```js
const recommendationFeedbackSummary = await loadRecommendationFeedbackSummary(adaptedRecipe.id);

this.setData({
  recommendation: {
    ...adaptedRecipe,
    is_favorited: isFavorited,
  },
  recommendationFeedbackSummary,
});
```

同时在“无推荐”分支中清空：

```js
this.setData({
  recommendation: null,
  recommendationFeedbackSummary: null,
});
```

只做这条反馈摘要闭环，不顺手扩展首页其它状态。

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/home-feedback-summary.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/home/home.js miniprogram/tests/home-feedback-summary.test.js
git commit -m "test: tighten home feedback summary state contract"
```

### Task 2: Keep recap block minimal and reason-card-adjacent

**Files:**
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/home/home.wxss`
- Modify: `miniprogram/tests/home-feedback-summary.test.js`

**Step 1: Write the failing test**

在同一个测试文件里补一条轻量 UI 契约测试，锁定 recap block 的数据门控，不扩大成整页 UI 测试：

```js
test('home feedback recap remains hidden when recommendationFeedbackSummary is null', () => {
  page.setData({ recommendationFeedbackSummary: null });

  expect(page.data.recommendationFeedbackSummary).toBeNull();
});
```

再补一条正向契约：

```js
test('home feedback recap uses summary state and label for rendering contract', () => {
  page.setData({
    recommendationFeedbackSummary: {
      state: 'accepted',
      label: '宝宝接受过',
    },
  });

  expect(page.data.recommendationFeedbackSummary).toEqual({
    state: 'accepted',
    label: '宝宝接受过',
  });
});
```

重点是：recap 只依赖 `recommendationFeedbackSummary`，不再围绕首页其它状态扩张。

**Step 2: Run test to verify it fails**

Run: `cd miniprogram && npx jest --runInBand tests/home-feedback-summary.test.js`
Expected: FAIL，直到首页展示层真正收敛到只依赖 feedback summary 这条数据契约。

**Step 3: Write minimal implementation**

在 `miniprogram/pages/home/home.wxml` 的 reason card 附近保留一个轻量 recap block：

```xml
<view class="feedback-recap feedback-recap-{{recommendationFeedbackSummary.state}}" wx:if="{{recommendationFeedbackSummary}}">
  <text class="feedback-recap-label">{{recommendationFeedbackSummary.label}}</text>
</view>
```

如果当前实现已经有 hint 字段，也只在确实存在时展示，不额外引入更复杂展示：

```xml
<text class="feedback-recap-hint" wx:if="{{recommendationFeedbackSummary.hint}}">
  {{recommendationFeedbackSummary.hint}}
</text>
```

在 `miniprogram/pages/home/home.wxss` 中保留最小样式：

```css
.feedback-recap {
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #f6f7f3;
}

.feedback-recap-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #2f5d46;
}

.feedback-recap-accepted {
  background: #eef8f1;
}

.feedback-recap-rejected {
  background: #fff1ee;
}

.feedback-recap-retry {
  background: #f7f5ef;
}
```

不要借这一步去调整 hero、shortcut、会员或 swap/undo UI。

**Step 4: Run test to verify it passes**

Run: `cd miniprogram && npx jest --runInBand tests/home-feedback-summary.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add miniprogram/pages/home/home.wxml miniprogram/pages/home/home.wxss miniprogram/tests/home-feedback-summary.test.js
git commit -m "feat: keep home feedback recap minimal"
```

### Task 3: Verify the converged Task 2 path stays focused

**Files:**
- Modify: `miniprogram/tests/home-feedback-summary.test.js`
- Test: `miniprogram/tests/feedback-summary.test.js`
- Test: `miniprogram/tests/home-feedback-summary.test.js`

**Step 1: Write the failing verification assertions**

给 `home-feedback-summary.test.js` 增加最后一批聚焦断言，确保这次收敛真的把 Task 2 变成独立小闭环：

```js
test('home feedback summary test does not depend on swap or undo state', async () => {
  api.getTodayRecommendation.mockResolvedValue({
    recipe: { id: 'recipe-1', title: '番茄牛肉' },
  });
  api.getRecentFeedingFeedback.mockResolvedValue({ items: [] });
  api.checkFavorite.mockResolvedValue({ is_favorited: false });

  await page.loadTodayRecommendation();

  expect(page.data.recommendationFeedbackSummary).toBeNull();
  expect(page.data.recommendation).toEqual(expect.objectContaining({ id: 'recipe-1' }));
});
```

目标不是证明首页全部行为，而是证明这份测试现在只围绕 feedback summary 本身。

**Step 2: Run tests to verify current failures**

Run: `cd miniprogram && npx jest --runInBand tests/feedback-summary.test.js tests/home-feedback-summary.test.js`
Expected: FAIL，直到 feedback helper + home summary 展示链路都足够聚焦。

**Step 3: Write minimal verification fixes**

只修复验证暴露出来的必要问题，例如：
- `home-feedback-summary.test.js` 仍依赖其它首页状态
- `home.js` 在 recommendation 为空时没有清空 summary
- recap block 的门控条件不够纯粹

不要在这一步再次扩大首页改动面。

**Step 4: Run full verification**

Run: `cd miniprogram && npx jest --runInBand tests/feedback-summary.test.js tests/home-feedback-summary.test.js`
Expected: PASS with 0 failing suites.

**Step 5: Commit**

```bash
git add miniprogram/tests/feedback-summary.test.js miniprogram/tests/home-feedback-summary.test.js miniprogram/pages/home/home.js miniprogram/pages/home/home.wxml miniprogram/pages/home/home.wxss
git commit -m "test: verify converged home feedback summary path"
```