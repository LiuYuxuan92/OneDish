import { db, generateUUID } from '../config/database';
import { familyService } from './family.service';

export type FeedingAcceptedLevel = 'like' | 'ok' | 'reject';

export interface CreateFeedingFeedbackInput {
  user_id: string;
  recipe_id: string;
  meal_plan_id?: string | null;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag?: boolean;
  note?: string | null;
}

export interface FeedingFeedbackRecord {
  id: string;
  user_id: string;
  actor_user_id?: string | null;    // 记录谁填写了反馈
  family_id?: string | null;         // 关联家庭，用于共享查看
  recipe_id: string;
  meal_plan_id?: string | null;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag: boolean;
  note?: string | null;
  created_at: string;
  updated_at: string;
  recipe_name?: string | null;
  recipe_image_url?: string[] | string | null;
  actor_display_name?: string | null;  // 填写者昵称
  actor_avatar_url?: string | null;     // 填写者头像
}

export interface ListRecentFeedingFeedbacksInput {
  user_id: string;
  limit?: number;
  offset?: number;
  recipe_id?: string;
}

export interface FeedingFeedbackListResult {
  items: FeedingFeedbackRecord[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface FeedingFeedbackRecipeSummary {
  recipe_id: string;
  recipe_name?: string | null;
  recipe_image_url?: string[] | string | null;
  feedback_count: number;
  like_count: number;
  ok_count: number;
  reject_count: number;
  allergy_count: number;
  latest_feedback_at?: string | null;
  latest_accepted_level?: FeedingAcceptedLevel | null;
  average_baby_age_at_feedback?: number | null;
}

export interface ListRecipeFeedbackSummariesInput {
  user_id: string;
  limit?: number;
}

export interface BatchGetRecipeSummariesInput {
  user_id: string;
  recipe_ids: string[];
}

export interface GetSummaryByRecipeIdInput {
  user_id: string;
  recipe_id: string;
}

const ACCEPTED_LEVELS: FeedingAcceptedLevel[] = ['like', 'ok', 'reject'];

export class FeedingFeedbackService {
  async createFeedback(input: CreateFeedingFeedbackInput): Promise<FeedingFeedbackRecord> {
    this.validateInput(input);

    const now = new Date().toISOString();
    // 获取用户所在的家庭ID，用于共享查看
    const familyId = await familyService.getFamilyIdForUser(input.user_id);

    const row = {
      id: generateUUID(),
      user_id: input.user_id,
      actor_user_id: input.user_id,  // 记录填写者
      family_id: familyId,           // 关联家庭
      recipe_id: input.recipe_id,
      meal_plan_id: input.meal_plan_id || null,
      baby_age_at_that_time: Number.isFinite(Number(input.baby_age_at_that_time)) ? Number(input.baby_age_at_that_time) : null,
      accepted_level: input.accepted_level,
      allergy_flag: Boolean(input.allergy_flag),
      note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
      created_at: now,
      updated_at: now,
    };

    await db('feeding_feedbacks').insert(row);
    return this.getFeedbackById(row.id) as Promise<FeedingFeedbackRecord>;
  }

  async listRecentFeedbacks(input: ListRecentFeedingFeedbacksInput): Promise<FeedingFeedbackListResult> {
    const safeLimit = Math.max(1, Math.min(20, Number(input.limit) || 10));
    const safeOffset = Math.max(0, Number(input.offset) || 0);

    // 获取用户的家庭信息，用于返回家庭成员的所有反馈
    const family = await familyService.getFamilyByUserId(input.user_id);
    const ownerId = family?.family?.owner_id || input.user_id;
    const familyId = family?.family?.id || null;

    let query = db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id');

    // 如果用户有家庭，返回家庭所有成员的反馈；否则仅返回个人的
    if (familyId) {
      query = query.where('ff.family_id', familyId);
    } else {
      query = query.where('ff.user_id', ownerId).whereNull('ff.family_id');
    }

    if (input.recipe_id) {
      query = query.andWhere('ff.recipe_id', input.recipe_id);
    }

    const allRows = await query
      .select(
        'ff.id',
        'ff.user_id',
        'ff.actor_user_id',
        'ff.family_id',
        'ff.recipe_id',
        'ff.meal_plan_id',
        'ff.baby_age_at_that_time',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.note',
        'ff.created_at',
        'ff.updated_at',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url'
      )
      .orderBy('ff.created_at', 'desc');

    // 获取所有涉及的 actor user_id 以查询用户信息
    const actorUserIds = [...new Set(allRows.map((row: any) => row.actor_user_id).filter(Boolean))];
    const actorProfiles = await this.resolveActorProfiles(actorUserIds);

    const normalizedRows = allRows.map((row: any) => this.normalizeRow(row, actorProfiles));
    const items = normalizedRows.slice(safeOffset, safeOffset + safeLimit);

    return {
      items,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: normalizedRows.length,
        has_more: safeOffset + items.length < normalizedRows.length,
      },
    };
  }

  /**
   * 解析 actor 用户信息
   */
  private async resolveActorProfiles(userIds: string[]) {
    if (!userIds.length) return new Map();
    const users = await db('users').whereIn('id', userIds).select('id', 'username', 'avatar_url');
    return new Map(users.map((u: any) => [u.id, { display_name: u.username, avatar_url: u.avatar_url }]));
  }

  async listRecipeSummaries(input: ListRecipeFeedbackSummariesInput): Promise<FeedingFeedbackRecipeSummary[]> {
    const safeLimit = Math.max(1, Math.min(20, Number(input.limit) || 10));

    // 获取用户的家庭信息
    const family = await familyService.getFamilyByUserId(input.user_id);
    const ownerId = family?.family?.owner_id || input.user_id;
    const familyId = family?.family?.id || null;

    let query = db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id');

    // 如果用户有家庭，返回家庭所有成员的反馈；否则仅返回个人的
    if (familyId) {
      query = query.where('ff.family_id', familyId);
    } else {
      query = query.where('ff.user_id', ownerId).whereNull('ff.family_id');
    }

    const rows = await query
      .select(
        'ff.id',
        'ff.recipe_id',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.baby_age_at_that_time',
        'ff.created_at',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url'
      )
      .orderBy('ff.created_at', 'desc');

    const summaryMap = new Map<string, FeedingFeedbackRecipeSummary>();

    for (const row of rows) {
      const recipeId = row.recipe_id;
      const existing = summaryMap.get(recipeId);
      const babyAge = row.baby_age_at_that_time == null ? null : Number(row.baby_age_at_that_time);

      if (!existing) {
        summaryMap.set(recipeId, {
          recipe_id: recipeId,
          recipe_name: row.recipe_name || null,
          recipe_image_url: row.recipe_image_url || null,
          feedback_count: 1,
          like_count: row.accepted_level === 'like' ? 1 : 0,
          ok_count: row.accepted_level === 'ok' ? 1 : 0,
          reject_count: row.accepted_level === 'reject' ? 1 : 0,
          allergy_count: row.allergy_flag ? 1 : 0,
          latest_feedback_at: row.created_at || null,
          latest_accepted_level: row.accepted_level || null,
          average_baby_age_at_feedback: babyAge,
        });
        continue;
      }

      existing.feedback_count += 1;
      if (row.accepted_level === 'like') existing.like_count += 1;
      if (row.accepted_level === 'ok') existing.ok_count += 1;
      if (row.accepted_level === 'reject') existing.reject_count += 1;
      if (row.allergy_flag) existing.allergy_count += 1;

      if (babyAge != null) {
        const currentAverage = existing.average_baby_age_at_feedback;
        const countedBefore = existing.feedback_count - 1;
        if (currentAverage == null || countedBefore <= 0) {
          existing.average_baby_age_at_feedback = babyAge;
        } else {
          existing.average_baby_age_at_feedback = Number((((currentAverage * countedBefore) + babyAge) / (countedBefore + 1)).toFixed(1));
        }
      }
    }

    return Array.from(summaryMap.values())
      .sort((a, b) => {
        if (b.feedback_count !== a.feedback_count) {
          return b.feedback_count - a.feedback_count;
        }
        const aTime = a.latest_feedback_at ? new Date(a.latest_feedback_at).getTime() : 0;
        const bTime = b.latest_feedback_at ? new Date(b.latest_feedback_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, safeLimit);
  }

  /**
   * 获取指定菜谱的喂养反馈摘要
   * 用于 recipe detail 页面展示
   */
  async getSummaryByRecipeId(input: GetSummaryByRecipeIdInput): Promise<FeedingFeedbackRecipeSummary | null> {
    if (!input.user_id || !input.recipe_id) {
      return null;
    }

    const rows = await db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.user_id', input.user_id)
      .andWhere('ff.recipe_id', input.recipe_id)
      .select(
        'ff.id',
        'ff.recipe_id',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.baby_age_at_that_time',
        'ff.created_at',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url'
      )
      .orderBy('ff.created_at', 'desc');

    if (rows.length === 0) {
      return null;
    }

    // 聚合计算 summary
    let summary: FeedingFeedbackRecipeSummary = {
      recipe_id: input.recipe_id,
      recipe_name: rows[0].recipe_name || null,
      recipe_image_url: rows[0].recipe_image_url || null,
      feedback_count: 0,
      like_count: 0,
      ok_count: 0,
      reject_count: 0,
      allergy_count: 0,
      latest_feedback_at: null,
      latest_accepted_level: null,
      average_baby_age_at_feedback: null,
    };

    let totalAge = 0;
    let ageCount = 0;

    for (const row of rows) {
      summary.feedback_count += 1;
      if (row.accepted_level === 'like') summary.like_count += 1;
      if (row.accepted_level === 'ok') summary.ok_count += 1;
      if (row.accepted_level === 'reject') summary.reject_count += 1;
      if (row.allergy_flag) summary.allergy_count += 1;

      // 记录最新的反馈时间和接受程度
      if (!summary.latest_feedback_at || new Date(row.created_at) > new Date(summary.latest_feedback_at)) {
        summary.latest_feedback_at = row.created_at;
        summary.latest_accepted_level = row.accepted_level;
      }

      // 计算平均月龄
      if (row.baby_age_at_that_time != null) {
        totalAge += Number(row.baby_age_at_that_time);
        ageCount += 1;
      }
    }

    if (ageCount > 0) {
      summary.average_baby_age_at_feedback = Number((totalAge / ageCount).toFixed(1));
    }

    return summary;
  }

  /**
   * 批量获取多个菜谱的喂养反馈摘要
   * 用于推荐结果中注入 feeding_explanation
   * @param input.user_id 用户ID
   * @param input.recipe_ids 菜谱ID列表（最多50个）
   * @returns Map<recipe_id, FeedingFeedbackRecipeSummary | null> - 缺失数据返回 null
   */
  async batchGetRecipeSummaries(input: BatchGetRecipeSummariesInput): Promise<Map<string, FeedingFeedbackRecipeSummary | null>> {
    if (!input.user_id || !input.recipe_ids || input.recipe_ids.length === 0) {
      return new Map();
    }

    const safeRecipeIds = input.recipe_ids.slice(0, 50);
    const resultMap = new Map<string, FeedingFeedbackRecipeSummary | null>();

    // 初始化所有 recipe_id 为 null
    for (const recipeId of safeRecipeIds) {
      resultMap.set(recipeId, null);
    }

    // 批量查询用户的所有 feeding feedbacks
    const rows = await db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.user_id', input.user_id)
      .whereIn('ff.recipe_id', safeRecipeIds)
      .select(
        'ff.id',
        'ff.recipe_id',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.baby_age_at_that_time',
        'ff.created_at',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url'
      )
      .orderBy('ff.created_at', 'desc');

    // 按 recipe_id 分组聚合
    const summaryMap = new Map<string, FeedingFeedbackRecipeSummary>();

    for (const row of rows) {
      const recipeId = row.recipe_id;
      const babyAge = row.baby_age_at_that_time == null ? null : Number(row.baby_age_at_that_time);

      if (!summaryMap.has(recipeId)) {
        summaryMap.set(recipeId, {
          recipe_id: recipeId,
          recipe_name: row.recipe_name || null,
          recipe_image_url: row.recipe_image_url || null,
          feedback_count: 1,
          like_count: row.accepted_level === 'like' ? 1 : 0,
          ok_count: row.accepted_level === 'ok' ? 1 : 0,
          reject_count: row.accepted_level === 'reject' ? 1 : 0,
          allergy_count: row.allergy_flag ? 1 : 0,
          latest_feedback_at: row.created_at || null,
          latest_accepted_level: row.accepted_level || null,
          average_baby_age_at_feedback: babyAge,
        });
        continue;
      }

      const existing = summaryMap.get(recipeId)!;
      existing.feedback_count += 1;
      if (row.accepted_level === 'like') existing.like_count += 1;
      if (row.accepted_level === 'ok') existing.ok_count += 1;
      if (row.accepted_level === 'reject') existing.reject_count += 1;
      if (row.allergy_flag) existing.allergy_count += 1;

      // 更新最新反馈时间和接受程度
      if (row.created_at && (!existing.latest_feedback_at || new Date(row.created_at) > new Date(existing.latest_feedback_at))) {
        existing.latest_feedback_at = row.created_at;
        existing.latest_accepted_level = row.accepted_level;
      }

      // 更新平均月龄
      if (babyAge != null) {
        const currentAverage = existing.average_baby_age_at_feedback;
        const countedBefore = existing.feedback_count - 1;
        if (currentAverage == null || countedBefore <= 0) {
          existing.average_baby_age_at_feedback = babyAge;
        } else {
          existing.average_baby_age_at_feedback = Number((((currentAverage * countedBefore) + babyAge) / (countedBefore + 1)).toFixed(1));
        }
      }
    }

    // 填充结果 Map
    for (const recipeId of safeRecipeIds) {
      const summary = summaryMap.get(recipeId);
      resultMap.set(recipeId, summary || null);
    }

    return resultMap;
  }

  private async getFeedbackById(id: string): Promise<FeedingFeedbackRecord | null> {
    const row = await db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.id', id)
      .select(
        'ff.id',
        'ff.user_id',
        'ff.actor_user_id',
        'ff.family_id',
        'ff.recipe_id',
        'ff.meal_plan_id',
        'ff.baby_age_at_that_time',
        'ff.accepted_level',
        'ff.allergy_flag',
        'ff.note',
        'ff.created_at',
        'ff.updated_at',
        'r.name as recipe_name',
        'r.image_url as recipe_image_url'
      )
      .first();

    if (!row) return null;

    // 获取 actor 用户信息
    const actorProfiles = await this.resolveActorProfiles([row.actor_user_id].filter(Boolean));
    return this.normalizeRow(row, actorProfiles);
  }

  private normalizeRow(row: any, actorProfiles?: Map<string, { display_name?: string; avatar_url?: string }>): FeedingFeedbackRecord {
    const actorProfile = actorProfiles?.get(row.actor_user_id);
    return {
      ...row,
      actor_user_id: row.actor_user_id || null,
      family_id: row.family_id || null,
      allergy_flag: Boolean(row.allergy_flag),
      baby_age_at_that_time: row.baby_age_at_that_time == null ? null : Number(row.baby_age_at_that_time),
      actor_display_name: actorProfile?.display_name || null,
      actor_avatar_url: actorProfile?.avatar_url || null,
    };
  }

  private validateInput(input: CreateFeedingFeedbackInput) {
    if (!input.user_id) throw new Error('INVALID_USER_ID');
    if (!input.recipe_id) throw new Error('INVALID_RECIPE_ID');
    if (!ACCEPTED_LEVELS.includes(input.accepted_level)) throw new Error('INVALID_ACCEPTED_LEVEL');

    if (input.baby_age_at_that_time != null) {
      const age = Number(input.baby_age_at_that_time);
      if (!Number.isFinite(age) || age < 0 || age > 72) throw new Error('INVALID_BABY_AGE');
    }

    if (input.note != null && typeof input.note !== 'string') {
      throw new Error('INVALID_NOTE');
    }
  }
}

export const feedingFeedbackService = new FeedingFeedbackService();
