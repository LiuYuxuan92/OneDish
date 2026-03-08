import { db, generateUUID } from '../config/database';

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

const ACCEPTED_LEVELS: FeedingAcceptedLevel[] = ['like', 'ok', 'reject'];

export class FeedingFeedbackService {
  async createFeedback(input: CreateFeedingFeedbackInput): Promise<FeedingFeedbackRecord> {
    this.validateInput(input);

    const now = new Date().toISOString();
    const row = {
      id: generateUUID(),
      user_id: input.user_id,
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

    let query = db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.user_id', input.user_id);

    if (input.recipe_id) {
      query = query.andWhere('ff.recipe_id', input.recipe_id);
    }

    const allRows = await query
      .select(
        'ff.id',
        'ff.user_id',
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

    const normalizedRows = allRows.map((row: any) => this.normalizeRow(row));
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

  async listRecipeSummaries(input: ListRecipeFeedbackSummariesInput): Promise<FeedingFeedbackRecipeSummary[]> {
    const safeLimit = Math.max(1, Math.min(20, Number(input.limit) || 10));

    const rows = await db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.user_id', input.user_id)
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

  private async getFeedbackById(id: string): Promise<FeedingFeedbackRecord | null> {
    const row = await db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.id', id)
      .select(
        'ff.id',
        'ff.user_id',
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

    return row ? this.normalizeRow(row) : null;
  }

  private normalizeRow(row: any): FeedingFeedbackRecord {
    return {
      ...row,
      allergy_flag: Boolean(row.allergy_flag),
      baby_age_at_that_time: row.baby_age_at_that_time == null ? null : Number(row.baby_age_at_that_time),
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
