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
  recipe_id?: string;
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

  async listRecentFeedbacks(input: ListRecentFeedingFeedbacksInput): Promise<FeedingFeedbackRecord[]> {
    const safeLimit = Math.max(1, Math.min(20, Number(input.limit) || 10));

    let query = db('feeding_feedbacks as ff')
      .leftJoin('recipes as r', 'ff.recipe_id', 'r.id')
      .where('ff.user_id', input.user_id);

    if (input.recipe_id) {
      query = query.andWhere('ff.recipe_id', input.recipe_id);
    }

    const rows = await query
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
      .orderBy('ff.created_at', 'desc')
      .limit(safeLimit);

    return rows.map((row: any) => this.normalizeRow(row));
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
