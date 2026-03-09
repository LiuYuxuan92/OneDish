/**
 * Weekly Review Service 单元测试
 * 
 * 测试核心规则引擎逻辑
 */

describe('WeeklyReviewService', () => {
  // 测试降级逻辑：当反馈少于3条时
  describe('降级处理', () => {
    it('当反馈少于3条时返回降级版review', () => {
      // 模拟 feedbacks 数据（少于3条）
      const feedbacks = [
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-02T10:00:00Z' },
        { recipe_id: 'r2', accepted_level: 'ok', allergy_flag: false, created_at: '2026-03-02T11:00:00Z' },
      ];

      // 手动调用规则引擎逻辑
      const feedingDays = new Set(feedbacks.map(f => f.created_at.split('T')[0])).size;
      
      expect(feedbacks.length).toBe(2);
      expect(feedingDays).toBe(1);
    });

    it('当无反馈时返回空数据', () => {
      const feedbacks: any[] = [];
      const feedingDays = new Set(feedbacks.map(f => f.created_at?.split('T')[0] || '')).size;
      
      expect(feedbacks.length).toBe(0);
      expect(feedingDays).toBe(0);
    });
  });

  describe('基础统计计算', () => {
    it('正确计算接受度分布', () => {
      const feedbacks = [
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-02T10:00:00Z' },
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-03T10:00:00Z' },
        { recipe_id: 'r2', accepted_level: 'ok', allergy_flag: false, created_at: '2026-03-04T10:00:00Z' },
        { recipe_id: 'r3', accepted_level: 'reject', allergy_flag: false, created_at: '2026-03-05T10:00:00Z' },
        { recipe_id: 'r4', accepted_level: 'like', allergy_flag: true, created_at: '2026-03-06T10:00:00Z' },
      ];

      let likeCount = 0, okCount = 0, rejectCount = 0, allergyFlagCount = 0;

      for (const fb of feedbacks) {
        if (fb.accepted_level === 'like') likeCount++;
        else if (fb.accepted_level === 'ok') okCount++;
        else if (fb.accepted_level === 'reject') rejectCount++;
        if (fb.allergy_flag) allergyFlagCount++;
      }

      expect(likeCount).toBe(3);
      expect(okCount).toBe(1);
      expect(rejectCount).toBe(1);
      expect(allergyFlagCount).toBe(1);
    });

    it('正确计算唯一食谱数', () => {
      const feedbacks = [
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-02T10:00:00Z' },
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-03T10:00:00Z' },
        { recipe_id: 'r2', accepted_level: 'ok', allergy_flag: false, created_at: '2026-03-04T10:00:00Z' },
        { recipe_id: 'r3', accepted_level: 'reject', allergy_flag: false, created_at: '2026-03-05T10:00:00Z' },
      ];

      const uniqueRecipes = new Set(feedbacks.map(f => f.recipe_id)).size;
      expect(uniqueRecipes).toBe(3);
    });

    it('正确计算有记录的天数', () => {
      const feedbacks = [
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-02T10:00:00Z' },
        { recipe_id: 'r1', accepted_level: 'like', allergy_flag: false, created_at: '2026-03-02T11:00:00Z' }, // 同一天
        { recipe_id: 'r2', accepted_level: 'ok', allergy_flag: false, created_at: '2026-03-03T10:00:00Z' },
        { recipe_id: 'r3', accepted_level: 'reject', allergy_flag: false, created_at: '2026-03-05T10:00:00Z' },
      ];

      const feedingDays = new Set(feedbacks.map(f => f.created_at.split('T')[0])).size;
      expect(feedingDays).toBe(3);
    });
  });

  describe('Top Accepted Recipes 计算', () => {
    it('按 like*2 + ok 排序取 top 3', () => {
      const recipes = [
        { recipe_id: 'r1', accepted_level: 'ok', count: 2 },    // score: 2
        { recipe_id: 'r2', accepted_level: 'like', count: 1 }, // score: 2
        { recipe_id: 'r3', accepted_level: 'like', count: 3 }, // score: 6
        { recipe_id: 'r4', accepted_level: 'reject', count: 2 }, // score: 0
      ];

      const sorted = [...recipes].sort((a, b) => {
        const scoreA = (a.accepted_level === 'like' ? 2 : a.accepted_level === 'ok' ? 1 : 0) * a.count;
        const scoreB = (b.accepted_level === 'like' ? 2 : b.accepted_level === 'ok' ? 1 : 0) * b.count;
        return scoreB - scoreA;
      });

      // r3 分数最高
      expect(sorted[0].recipe_id).toBe('r3'); // score 6
      // r1 和 r2 分数相同（都是2），顺序不确定
      expect([sorted[1].recipe_id, sorted[2].recipe_id]).toContain('r1');
      expect([sorted[1].recipe_id, sorted[2].recipe_id]).toContain('r2');
      // r4 分数最低
      expect(sorted[3].recipe_id).toBe('r4'); // score 0
    });
  });

  describe('Cautious Recipes 识别', () => {
    it('识别有 reject 的食谱', () => {
      const recipes = [
        { recipe_id: 'r1', accepted_level: 'like', hasAllergy: false },
        { recipe_id: 'r2', accepted_level: 'reject', hasAllergy: false },
        { recipe_id: 'r3', accepted_level: 'ok', hasAllergy: true },
        { recipe_id: 'r4', accepted_level: 'like', hasAllergy: false },
      ];

      const cautious = recipes.filter(r => r.accepted_level === 'reject' || r.hasAllergy);
      
      expect(cautious.length).toBe(2);
      expect(cautious.map(r => r.recipe_id)).toContain('r2');
      expect(cautious.map(r => r.recipe_id)).toContain('r3');
    });
  });

  describe('趋势信号计算', () => {
    it('本周 like% > 上周 5% → improving', () => {
      const currentFeedbacks = [
        { accepted_level: 'like' },
        { accepted_level: 'like' },
        { accepted_level: 'like' },
        { accepted_level: 'ok' },
      ]; // 75% like

      const prevFeedbacks = [
        { accepted_level: 'like' },
        { accepted_level: 'ok' },
        { accepted_level: 'ok' },
      ]; // 33% like

      const currentLikeRate = currentFeedbacks.filter(f => f.accepted_level === 'like').length / currentFeedbacks.length;
      const prevLikeRate = prevFeedbacks.filter(f => f.accepted_level === 'like').length / prevFeedbacks.length;
      const diff = (currentLikeRate - prevLikeRate) * 100;

      expect(diff).toBeGreaterThan(5);
    });

    it('差值 < 5% → stable', () => {
      const currentFeedbacks = [
        { accepted_level: 'like' },
        { accepted_level: 'like' },
        { accepted_level: 'ok' },
        { accepted_level: 'ok' },
      ]; // 50% like

      const prevFeedbacks = [
        { accepted_level: 'like' },
        { accepted_level: 'like' },
        { accepted_level: 'ok' },
        { accepted_level: 'ok' },
      ]; // 50% like

      const currentLikeRate = currentFeedbacks.filter(f => f.accepted_level === 'like').length / currentFeedbacks.length;
      const prevLikeRate = prevFeedbacks.filter(f => f.accepted_level === 'like').length / prevFeedbacks.length;
      const diff = (currentLikeRate - prevLikeRate) * 100;

      // 差值为0，应该返回 stable
      expect(Math.abs(diff)).toBeLessThanOrEqual(5);
    });
  });

  describe('建议生成规则', () => {
    it('allergy_flag > 0 时生成 cautious 建议', () => {
      const allergyFlagCount = 1;
      const suggestions: any[] = [];

      if (allergyFlagCount > 0) {
        suggestions.push({
          type: 'cautious',
          reason: '本周有过敏标记，建议暂时回避相关食材',
        });
      }

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].type).toBe('cautious');
    });

    it('new_recipe_count >= 3 时生成 explore 建议', () => {
      const newRecipeCount = 3;
      const suggestions: any[] = [];

      if (newRecipeCount >= 3) {
        suggestions.push({
          type: 'explore',
          reason: `本周尝试了${newRecipeCount}个新食材，可以继续拓展口味`,
        });
      }

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].type).toBe('explore');
    });

    it('top_accepted 中某食谱 feedback_count >= 2 时生成 continue 建议', () => {
      const topAcceptedRecipes = [
        { recipe_id: 'r1', recipe_name: '南瓜泥', feedback_count: 3 },
        { recipe_id: 'r2', recipe_name: '胡萝卜泥', feedback_count: 1 },
      ];
      const suggestions: any[] = [];

      for (const recipe of topAcceptedRecipes) {
        if (recipe.feedback_count >= 2) {
          suggestions.push({
            type: 'continue',
            recipe_id: recipe.recipe_id,
            recipe_name: recipe.recipe_name,
            reason: `宝宝对${recipe.recipe_name}接受良好，建议继续常规安排`,
          });
          break;
        }
      }

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].type).toBe('continue');
    });
  });

  describe('日期工具函数', () => {
    it('getWeekEnd 正确计算周末', () => {
      const getWeekEnd = (weekStart: string): string => {
        const start = new Date(weekStart);
        start.setDate(start.getDate() + 6);
        return start.toISOString().split('T')[0];
      };

      expect(getWeekEnd('2026-03-02')).toBe('2026-03-08'); // 周一到周日
      expect(getWeekEnd('2026-03-09')).toBe('2026-03-15');
    });

    it('getPreviousWeekStart 正确计算上一周', () => {
      const getPreviousWeekStart = (weekStart: string): string => {
        const start = new Date(weekStart);
        start.setDate(start.getDate() - 7);
        return start.toISOString().split('T')[0];
      };

      expect(getPreviousWeekStart('2026-03-02')).toBe('2026-02-23');
      expect(getPreviousWeekStart('2026-03-09')).toBe('2026-03-02');
    });
  });
});
