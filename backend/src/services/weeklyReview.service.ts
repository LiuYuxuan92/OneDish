import { db, generateUUID } from '../config/database';
import { familyService } from './family.service';
import { redisService } from './redis.service';
import { cosService } from './cos.service';
import type { 
  WeeklyReview, 
  WeeklyFeedingReviewRecord, 
  RecipeMeta, 
  Suggestion,
  AcceptedLevel,
  TrendSignal,
  SuggestionType
} from '../types';

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface FeedingFeedbackForWeek {
  recipe_id: string;
  recipe_name?: string | null;
  recipe_image_url?: string | null;
  accepted_level: AcceptedLevel;
  allergy_flag: boolean;
  created_at: string;
}

export class WeeklyReviewService {
  private normalizeRecipeImageUrl(value: unknown): string | null {
    const items = Array.isArray(value)
      ? value
      : (() => {
          if (typeof value !== 'string') return [];
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
          } catch {
            return value.trim() ? [value.trim()] : [];
          }
        })();

    const first = items.find((item) => typeof item === 'string' && item.trim());
    return cosService.resolveStoredUrl(typeof first === 'string' ? first.trim() : null);
  }

  private normalizeReviewJson(review: WeeklyReview | null): WeeklyReview | null {
    if (!review) return review;

    const normalizeRecipes = (items?: RecipeMeta[]) =>
      Array.isArray(items)
        ? items.map((item) => ({
            ...item,
            image_url: this.normalizeRecipeImageUrl(item?.image_url),
          }))
        : [];

    return {
      ...review,
      top_accepted_recipes: normalizeRecipes(review.top_accepted_recipes),
      cautious_recipes: normalizeRecipes(review.cautious_recipes),
    };
  }

  /**
   * 获取本周回顾（带缓存）
   */
  async getWeeklyReview(userId: string, weekStart?: string, childId?: string): Promise<{
    week_start: string;
    week_end: string;
    child_id: string | null;
    review: WeeklyReview | null;
    generated_at: string | null;
  }> {
    const normalizedWeekStart = weekStart || this.getCurrentWeekStart();
    const normalizedWeekEnd = this.getWeekEnd(normalizedWeekStart);
    const normalizedChildId = childId || null;

    // 获取用户 scope 信息
    const scope = await this.resolveScope(userId);
    if (!scope) {
      return {
        week_start: normalizedWeekStart,
        week_end: normalizedWeekEnd,
        child_id: normalizedChildId,
        review: null,
        generated_at: null,
      };
    }

    // 尝试从缓存获取
    const cacheKey = `weekly_review:${scope.scope_type}:${scope.scope_id}:${normalizedChildId || 'none'}:${normalizedWeekStart}`;
    const cached = await redisService.getJson<WeeklyReview>(cacheKey);
    if (cached) {
      return {
        week_start: normalizedWeekStart,
        week_end: normalizedWeekEnd,
        child_id: normalizedChildId,
        review: cached,
        generated_at: new Date().toISOString(),
      };
    }

    // 从数据库获取
    const record = await this.getReviewFromDb(scope.scope_type, scope.scope_id, normalizedChildId, normalizedWeekStart);
    if (!record) {
      return {
        week_start: normalizedWeekStart,
        week_end: normalizedWeekEnd,
        child_id: normalizedChildId,
        review: null,
        generated_at: null,
      };
    }

    // 缓存结果
    await redisService.setJson(cacheKey, record.review_json, CACHE_TTL_SECONDS);

    return {
      week_start: record.week_start,
      week_end: record.week_end,
      child_id: record.child_id,
      review: record.review_json,
      generated_at: record.generated_at,
    };
  }

  /**
   * 重新生成本周回顾
   */
  async regenerateWeeklyReview(userId: string, weekStart: string, childId?: string): Promise<{
    week_start: string;
    week_end: string;
    child_id: string | null;
    review: WeeklyReview;
    generated_at: string;
  }> {
    const normalizedWeekStart = weekStart;
    const normalizedWeekEnd = this.getWeekEnd(normalizedWeekStart);
    const normalizedChildId = childId || null;

    // 获取用户 scope 信息
    const scope = await this.resolveScope(userId);
    if (!scope) {
      throw new Error('INVALID_SCOPE');
    }

    // 获取该周的 feeding feedback 数据
    const feedbacks = await this.getFeedbacksForWeek(scope.scope_type, scope.scope_id, normalizedWeekStart, normalizedWeekEnd);

    // 生成 review
    const review = await this.generateReview(feedbacks, scope.scope_type, scope.scope_id, normalizedWeekStart);

    // 写入数据库
    const now = new Date().toISOString();
    await db('weekly_feeding_reviews')
      .insert({
        id: generateUUID(),
        scope_type: scope.scope_type,
        scope_id: scope.scope_id,
        child_id: normalizedChildId,
        week_start: normalizedWeekStart,
        week_end: normalizedWeekEnd,
        review_json: review,
        generated_at: now,
        created_at: now,
        updated_at: now,
      })
      .onConflict(['scope_type', 'scope_id', 'child_id', 'week_start'])
      .merge(['review_json', 'generated_at', 'updated_at']);

    // 清除缓存
    const cacheKey = `weekly_review:${scope.scope_type}:${scope.scope_id}:${normalizedChildId || 'none'}:${normalizedWeekStart}`;
    await redisService.deleteRaw(cacheKey);

    return {
      week_start: normalizedWeekStart,
      week_end: normalizedWeekEnd,
      child_id: normalizedChildId,
      review,
      generated_at: now,
    };
  }

  /**
   * 从数据库获取已生成的 review
   */
  private async getReviewFromDb(
    scopeType: string,
    scopeId: string,
    childId: string | null,
    weekStart: string
  ): Promise<WeeklyFeedingReviewRecord | null> {
    const record = await db('weekly_feeding_reviews')
      .where('scope_type', scopeType)
      .where('scope_id', scopeId)
      .where('week_start', weekStart)
      .andWhere((builder) => {
        builder.whereNull('child_id');
        if (childId) {
          builder.orWhere('child_id', childId);
        }
      })
      .first();

    if (!record) return null;

    return {
      ...record,
      review_json: this.normalizeReviewJson(typeof record.review_json === 'string'
        ? JSON.parse(record.review_json)
        : record.review_json),
    };
  }

  /**
   * 解析用户 scope (user 或 family)
   */
  private async resolveScope(userId: string): Promise<{ scope_type: 'user' | 'family'; scope_id: string } | null> {
    const family = await familyService.getFamilyByUserId(userId);
    if (family?.family) {
      return {
        scope_type: 'family',
        scope_id: family.family.id,
      };
    }
    return {
      scope_type: 'user',
      scope_id: userId,
    };
  }

  /**
   * 获取指定周的 feeding feedback 数据
   */
  private async getFeedbacksForWeek(
    scopeType: 'user' | 'family',
    scopeId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<FeedingFeedbackForWeek[]> {
    let query = db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .whereBetween('ff.created_at', [`${weekStart}T00:00:00Z`, `${weekEnd}T23:59:59Z`]);

    if (scopeType === 'family') {
      query = query.where('ff.family_id', scopeId);
    } else {
      query = query.where('ff.user_id', scopeId).whereNull('ff.family_id');
    }

    const rows = await query
      .select(
        'ff.recipe_id',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.created_at'
      )
      .orderBy('ff.created_at', 'asc');

    return rows.map((row: any) => ({
      recipe_id: row.recipe_id,
      recipe_name: row.recipe_name || null,
      recipe_image_url: this.normalizeRecipeImageUrl(row.recipe_image_url),
      accepted_level: row.accepted_level,
      allergy_flag: Boolean(row.allergy_flag),
      created_at: row.created_at,
    }));
  }

  /**
   * 获取历史周的 feedback（用于趋势计算）
   */
  private async getFeedbacksForPreviousWeek(
    scopeType: 'user' | 'family',
    scopeId: string,
    weekStart: string
  ): Promise<FeedingFeedbackForWeek[]> {
    const prevWeekStart = this.getPreviousWeekStart(weekStart);
    const prevWeekEnd = this.getWeekEnd(prevWeekStart);
    return this.getFeedbacksForWeek(scopeType, scopeId, prevWeekStart, prevWeekEnd);
  }

  /**
   * 获取所有历史 recipe_id 集合（用于判断新食谱）
   */
  private async getAllRecipeIdsBeforeWeek(
    scopeType: 'user' | 'family',
    scopeId: string,
    weekStart: string
  ): Promise<Set<string>> {
    let query = db('feeding_feedbacks')
      .where('created_at', '<', `${weekStart}T00:00:00Z`);

    if (scopeType === 'family') {
      query = query.where('family_id', scopeId);
    } else {
      query = query.where('user_id', scopeId).whereNull('family_id');
    }

    const rows = await query.select('recipe_id');
    return new Set(rows.map((row: any) => row.recipe_id));
  }

  /**
   * 生成 WeeklyReview 的核心规则引擎
   */
  private async generateReview(
    feedbacks: FeedingFeedbackForWeek[],
    scopeType: 'user' | 'family',
    scopeId: string,
    weekStart: string
  ): Promise<WeeklyReview> {
    // 数据不足降级处理
    if (feedbacks.length < 3) {
      const feedingDays = new Set(feedbacks.map(f => f.created_at.split('T')[0])).size;
      return {
        total_feedback_count: feedbacks.length,
        feeding_days_count: feedingDays,
        unique_recipes_count: 0,
        new_recipe_count: 0,
        like_count: 0,
        ok_count: 0,
        reject_count: 0,
        allergy_flag_count: 0,
        top_accepted_recipes: [],
        cautious_recipes: [],
        trend_signal: null,
        next_week_suggestions: [
          { type: 'explore', reason: '记录太少，开始记录宝宝的饮食习惯吧！' }
        ],
      };
    }

    // 1. 基础统计
    const feedingDays = new Set(feedbacks.map(f => f.created_at.split('T')[0])).size;
    const uniqueRecipes = new Set(feedbacks.map(f => f.recipe_id)).size;

    // 2. 接受度分布
    let likeCount = 0, okCount = 0, rejectCount = 0, allergyFlagCount = 0;
    const recipeFeedbacks = new Map<string, { level: AcceptedLevel; count: number; allergy: boolean }>();

    for (const fb of feedbacks) {
      if (fb.accepted_level === 'like') likeCount++;
      else if (fb.accepted_level === 'ok') okCount++;
      else if (fb.accepted_level === 'reject') rejectCount++;
      if (fb.allergy_flag) allergyFlagCount++;

      const existing = recipeFeedbacks.get(fb.recipe_id);
      if (!existing) {
        recipeFeedbacks.set(fb.recipe_id, {
          level: fb.accepted_level,
          count: 1,
          allergy: fb.allergy_flag,
        });
      } else {
        existing.count++;
        // 如果有任何 reject 或 allergy，则标记
        if (fb.accepted_level === 'reject') existing.level = 'reject';
        if (fb.allergy_flag) existing.allergy = true;
      }
    }

    // 3. 新食谱统计
    const allPreviousRecipes = await this.getAllRecipeIdsBeforeWeek(scopeType, scopeId, weekStart);
    let newRecipeCount = 0;
    const currentWeekRecipes = new Set<string>();

    for (const fb of feedbacks) {
      if (!allPreviousRecipes.has(fb.recipe_id) && !currentWeekRecipes.has(fb.recipe_id)) {
        newRecipeCount++;
        currentWeekRecipes.add(fb.recipe_id);
      }
    }

    // 4. Top accepted recipes (按 like*2 + ok 排序)
    const recipeMetas: RecipeMeta[] = [];
    const recipeNames = new Map<string, { name: string | null; image_url: string | null }>();

    for (const fb of feedbacks) {
      if (!recipeNames.has(fb.recipe_id)) {
        recipeNames.set(fb.recipe_id, { 
          name: fb.recipe_name, 
          image_url: fb.recipe_image_url 
        });
      }
    }

    for (const [recipeId, data] of recipeFeedbacks) {
      const nameInfo = recipeNames.get(recipeId) || { name: null, image_url: null };
      const score = (data.level === 'like' ? 2 : data.level === 'ok' ? 1 : 0) * data.count;
      recipeMetas.push({
        recipe_id: recipeId,
        recipe_name: nameInfo.name || recipeId,
        image_url: nameInfo.image_url,
        feedback_count: data.count,
        accepted_level: data.level,
      });
    }

    recipeMetas.sort((a, b) => {
      const scoreA = (a.accepted_level === 'like' ? 2 : a.accepted_level === 'ok' ? 1 : 0) * a.feedback_count;
      const scoreB = (b.accepted_level === 'like' ? 2 : b.accepted_level === 'ok' ? 1 : 0) * b.feedback_count;
      return scoreB - scoreA;
    });

    const topAcceptedRecipes = recipeMetas.slice(0, 3);

    // 5. Cautious recipes (有 reject 或 allergy 的)
    const cautiousRecipes = recipeMetas
      .filter(r => r.accepted_level === 'reject' || recipeFeedbacks.get(r.recipe_id)?.allergy)
      .slice(0, 5);

    // 6. 趋势信号计算
    let trendSignal: TrendSignal = null;
    const prevWeekFeedbacks = await this.getFeedbacksForPreviousWeek(scopeType, scopeId, weekStart);
    if (prevWeekFeedbacks.length > 0) {
      const currentLikeRate = likeCount / feedbacks.length;
      const prevLikeCount = prevWeekFeedbacks.filter(f => f.accepted_level === 'like').length;
      const prevLikeRate = prevLikeCount / prevWeekFeedbacks.length;
      const diff = (currentLikeRate - prevLikeRate) * 100;

      if (diff > 5) trendSignal = 'improving';
      else if (diff < -5) trendSignal = 'declining';
      else trendSignal = 'stable';
    }

    // 7. 建议生成
    const suggestions = this.generateSuggestions({
      newRecipeCount,
      cautiousRecipes,
      topAcceptedRecipes,
      allergyFlagCount,
      prevWeekFeedbacks: prevWeekFeedbacks.length,
    });

    return {
      total_feedback_count: feedbacks.length,
      feeding_days_count: feedingDays,
      unique_recipes_count: uniqueRecipes,
      new_recipe_count: newRecipeCount,
      like_count: likeCount,
      ok_count: okCount,
      reject_count: rejectCount,
      allergy_flag_count: allergyFlagCount,
      top_accepted_recipes: topAcceptedRecipes,
      cautious_recipes: cautiousRecipes,
      trend_signal: trendSignal,
      next_week_suggestions: suggestions,
    };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(params: {
    newRecipeCount: number;
    cautiousRecipes: RecipeMeta[];
    topAcceptedRecipes: RecipeMeta[];
    allergyFlagCount: number;
    prevWeekFeedbacks: number;
  }): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // cautious 存在但仅 1 次 reject → retry
    for (const recipe of params.cautiousRecipes) {
      if (recipe.accepted_level === 'reject') {
        suggestions.push({
          type: 'retry',
          recipe_id: recipe.recipe_id,
          recipe_name: recipe.recipe_name,
          reason: `${recipe.recipe_name}有过1次拒绝，可以再尝试一次观察`,
        });
        break; // 只加一条
      }
    }

    // top_accepted 中某食谱 feedback_count >= 2 → continue
    for (const recipe of params.topAcceptedRecipes) {
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

    // allergy_flag_count > 0 → cautious
    if (params.allergyFlagCount > 0) {
      suggestions.push({
        type: 'cautious',
        reason: '本周有过敏标记，建议暂时回避相关食材',
      });
    }

    // new_recipe_count >= 3 → explore
    if (params.newRecipeCount >= 3) {
      suggestions.push({
        type: 'explore',
        reason: `本周尝试了${params.newRecipeCount}个新食材，可以继续拓展口味`,
      });
    }

    // 兜底建议
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'continue',
        reason: '本周表现稳定，继续保持良好的喂养习惯',
      });
    }

    return suggestions;
  }

  /**
   * 获取当前周的起始日期（周一）
   */
  private getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // 调整到周一
    const monday = new Date(now.setUTCDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * 获取周的结束日期
   */
  private getWeekEnd(weekStart: string): string {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + 6);
    return start.toISOString().split('T')[0];
  }

  /**
   * 获取上一周的开始日期
   */
  private getPreviousWeekStart(weekStart: string): string {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - 7);
    return start.toISOString().split('T')[0];
  }
}

export const weeklyReviewService = new WeeklyReviewService();
