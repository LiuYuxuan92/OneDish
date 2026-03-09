import { Knex } from 'knex';
import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { MealPlanService } from './mealPlan.service';

const ARRAY_PREFERENCE_KEYS = ['prefer_ingredients', 'exclude_ingredients'] as const;
const SCALAR_PREFERENCE_KEYS = ['default_baby_age', 'cooking_time_limit', 'difficulty_preference'] as const;

export type MergeJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'rolled_back';

export interface MergeJob {
  id: string;
  source_guest_id: string;
  target_user_id: string;
  status: MergeJobStatus;
  idempotency_key: string;
  conflict_policy: Record<string, any>;
  started_at: Date | null;
  finished_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  result_summary: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface MergePreviewResult {
  has_mergeable_data: boolean;
  guest_profile: {
    guest_id: string;
    device_id: string;
    created_at: string;
    last_active_at: string;
  };
  mergeable_summary: {
    preferences: { has_data: boolean; fields: string[] };
    favorites: { count: number };
    feeding_feedbacks: { count: number };
    meal_plans: { count: number };
    shopping_lists: { count: number; open_items: number };
    inventory: { count: number };
    templates: { count: number };
    recommendation_feedbacks: { count: number };
  };
  recommended_conflict_policy: Record<string, string>;
}

export const DEFAULT_CONFLICT_POLICY: Record<string, string> = {
  preferences: 'merge_non_null',
  favorites: 'skip_existing',
  meal_plans: 'skip_existing',
  shopping_lists: 'merge_open_items',
  inventory: 'aggregate_quantity',
  feeding_feedbacks: 'skip_existing',
  recommendation_feedbacks: 'skip_existing',
  templates: 'skip_existing',
};

export class AccountMergeService {
  private mealPlanService = new MealPlanService();

  private parsePreferences(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return typeof raw === 'object' ? { ...raw } : {};
  }

  private uniqueStrings(values: unknown): string[] {
    if (Array.isArray(values)) {
      return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
    }
    if (typeof values === 'string') {
      return [...new Set(values.split(/[、,，/\n\r;]/).map((item) => item.trim()).filter(Boolean))];
    }
    return [];
  }

  isGuestUser(user: any): boolean {
    const prefs = this.parsePreferences(user?.preferences);
    return Boolean(prefs.is_guest);
  }

  /**
   * 扫描 guest 待合并数据（Preview 接口）
   */
  async getMergePreview(guestUserId: string): Promise<MergePreviewResult> {
    const guestUser = await db('users').where('id', guestUserId).first();
    if (!guestUser || !this.isGuestUser(guestUser)) {
      throw new Error('MERGE_SOURCE_NOT_GUEST');
    }

    const guestPrefs = this.parsePreferences(guestUser.preferences);

    // 并行查询各类数据
    const [favorites, feedingFeedbacks, mealPlans, shoppingLists, inventory, templates, recommendationFeedbacks] = await Promise.all([
      db('favorites').where('user_id', guestUserId).count('* as count').first(),
      db('feeding_feedbacks').where('user_id', guestUserId).count('* as count').first(),
      db('meal_plans').where('user_id', guestUserId).count('* as count').first(),
      db('shopping_lists').where('user_id', guestUserId).select('*'),
      db('ingredient_inventory').where('user_id', guestUserId).count('* as count').first(),
      db('meal_plan_templates').where('creator_user_id', guestUserId).count('* as count').first(),
      db('recommendation_feedbacks').where('user_id', guestUserId).count('* as count').first(),
    ]);

    const openItemsCount = (shoppingLists as any[]).reduce((sum: number, list: any) => {
      if (!list.is_completed && list.items) {
        try {
          const items = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
          return sum + Object.values(items).flat().filter((item: any) => !item.checked).length;
        } catch {
          return sum;
        }
      }
      return sum;
    }, 0);

    const hasPreferenceData = ARRAY_PREFERENCE_KEYS.some(key => guestPrefs[key]?.length) ||
      SCALAR_PREFERENCE_KEYS.some(key => guestPrefs[key] !== undefined && guestPrefs[key] !== null && guestPrefs[key] !== '');

    const hasMergeableData = 
      Number(favorites?.count || 0) > 0 ||
      Number(feedingFeedbacks?.count || 0) > 0 ||
      Number(mealPlans?.count || 0) > 0 ||
      (shoppingLists?.length || 0) > 0 ||
      Number(inventory?.count || 0) > 0 ||
      Number(templates?.count || 0) > 0 ||
      Number(recommendationFeedbacks?.count || 0) > 0 ||
      hasPreferenceData;

    return {
      has_mergeable_data: hasMergeableData,
      guest_profile: {
        guest_id: guestUser.id,
        device_id: guestPrefs.guest_device_id || '',
        created_at: guestUser.created_at,
        last_active_at: guestUser.updated_at,
      },
      mergeable_summary: {
        preferences: { has_data: hasPreferenceData, fields: [...ARRAY_PREFERENCE_KEYS, ...SCALAR_PREFERENCE_KEYS] },
        favorites: { count: Number(favorites?.count || 0) },
        feeding_feedbacks: { count: Number(feedingFeedbacks?.count || 0) },
        meal_plans: { count: Number(mealPlans?.count || 0) },
        shopping_lists: { count: shoppingLists?.length || 0, open_items: openItemsCount },
        inventory: { count: Number(inventory?.count || 0) },
        templates: { count: Number(templates?.count || 0) },
        recommendation_feedbacks: { count: Number(recommendationFeedbacks?.count || 0) },
      },
      recommended_conflict_policy: { ...DEFAULT_CONFLICT_POLICY },
    };
  }

  /**
   * 创建合并任务
   */
  async createMergeJob(guestUserId: string, targetUserId: string, conflictPolicy?: Record<string, string>): Promise<MergeJob> {
    const idempotencyKey = `merge_${guestUserId}_${targetUserId}_v1`;

    // 检查是否已存在成功的任务
    const existingJob = await db('account_merge_jobs')
      .where('idempotency_key', idempotencyKey)
      .where('status', 'succeeded')
      .first();

    if (existingJob) {
      return existingJob as MergeJob;
    }

    // 检查是否有进行中的任务
    const runningJob = await db('account_merge_jobs')
      .where('idempotency_key', idempotencyKey)
      .whereIn('status', ['pending', 'running'])
      .first();

    if (runningJob) {
      return runningJob as MergeJob;
    }

    const jobId = `amj_${crypto.randomBytes(4).toString('hex')}`;
    const policy = conflictPolicy || DEFAULT_CONFLICT_POLICY;

    const [job] = await db('account_merge_jobs')
      .insert({
        id: jobId,
        source_guest_id: guestUserId,
        target_user_id: targetUserId,
        status: 'pending',
        idempotency_key: idempotencyKey,
        conflict_policy: JSON.stringify(policy),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return job as MergeJob;
  }

  /**
   * 执行合并任务
   */
  async executeMergeJob(jobId: string): Promise<MergeJob> {
    const job = await db('account_merge_jobs').where('id', jobId).first();
    if (!job) {
      throw new Error('MERGE_JOB_NOT_FOUND');
    }

    if (job.status === 'succeeded') {
      return job as MergeJob;
    }

    // 更新状态为 running
    await db('account_merge_jobs')
      .where('id', jobId)
      .update({
        status: 'running',
        started_at: new Date(),
        updated_at: new Date(),
      });

    try {
      const mergeSummary = await this.mergeGuestIntoUser(job.source_guest_id, job.target_user_id);

      // 更新任务状态为 succeeded
      await db('account_merge_jobs')
        .where('id', jobId)
        .update({
          status: 'succeeded',
          finished_at: new Date(),
          result_summary: JSON.stringify(mergeSummary),
          updated_at: new Date(),
        });

      const updatedJob = await db('account_merge_jobs').where('id', jobId).first();
      return updatedJob as MergeJob;
    } catch (error: any) {
      const errorCode = error instanceof Error ? error.message : 'MERGE_FAILED';

      await db('account_merge_jobs')
        .where('id', jobId)
        .update({
          status: 'failed',
          finished_at: new Date(),
          error_code: errorCode,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date(),
        });

      const failedJob = await db('account_merge_jobs').where('id', jobId).first();
      return failedJob as MergeJob;
    }
  }

  /**
   * 查询合并任务
   */
  async getMergeJob(jobId: string): Promise<MergeJob | null> {
    const job = await db('account_merge_jobs').where('id', jobId).first();
    return job as MergeJob | null;
  }

  /**
   * 查询用户的合并任务列表
   */
  async getMergeJobsByUser(userId: string): Promise<MergeJob[]> {
    const jobs = await db('account_merge_jobs')
      .where('target_user_id', userId)
      .orWhere('source_guest_id', userId)
      .orderBy('created_at', 'desc')
      .limit(20);
    return jobs as MergeJob[];
  }

  /**
   * 重试失败的任务
   */
  async retryMergeJob(jobId: string): Promise<MergeJob> {
    const job = await db('account_merge_jobs').where('id', jobId).first();
    if (!job) {
      throw new Error('MERGE_JOB_NOT_FOUND');
    }

    if (job.status !== 'failed' && job.status !== 'pending') {
      throw new Error('MERGE_JOB_CANNOT_RETRY');
    }

    // 重新创建 job（使用相同的 idempotency_key）
    const existingJob = await db('account_merge_jobs')
      .where('idempotency_key', job.idempotency_key)
      .where('status', 'succeeded')
      .first();

    if (existingJob) {
      return existingJob as MergeJob;
    }

    await db('account_merge_jobs')
      .where('id', jobId)
      .update({
        status: 'pending',
        error_code: null,
        error_message: null,
        started_at: null,
        finished_at: null,
        updated_at: new Date(),
      });

    // 自动执行
    return this.executeMergeJob(jobId);
  }

  /**
   * 发起合并（创建并执行 job）
   */
  async startMerge(guestUserId: string, targetUserId: string, conflictPolicy?: Record<string, string>): Promise<MergeJob> {
    const job = await this.createMergeJob(guestUserId, targetUserId, conflictPolicy);
    return this.executeMergeJob(job.id);
  }

  // ============================================================
  // 原有方法（保留向后兼容）
  // ============================================================

  async mergeGuestIntoUser(guestUserId: string, targetUserId: string) {
    if (!guestUserId || !targetUserId) {
      throw new Error('MERGE_USER_REQUIRED');
    }
    if (guestUserId === targetUserId) {
      throw new Error('MERGE_TARGET_SAME_AS_GUEST');
    }

    const mergeSummary = await db.transaction(async (trx) => {
      const guestUser = await trx('users').where('id', guestUserId).first();
      const targetUser = await trx('users').where('id', targetUserId).first();

      if (!guestUser || !targetUser) {
        throw new Error('MERGE_USER_NOT_FOUND');
      }
      if (!this.isGuestUser(guestUser)) {
        throw new Error('MERGE_SOURCE_NOT_GUEST');
      }
      if (this.isGuestUser(targetUser)) {
        throw new Error('MERGE_TARGET_IS_GUEST');
      }

      const favorites = await this.mergeFavorites(trx, guestUserId, targetUserId);
      const mealPlans = await this.mergeMealPlans(trx, guestUserId, targetUserId);
      const shoppingLists = await this.mergeShoppingLists(trx, guestUserId, targetUserId);
      const inventory = await this.mergeInventory(trx, guestUserId, targetUserId);
      const preferences = await this.mergePreferences(trx, guestUser, targetUser);
      const feedbacks = await this.mergeRecommendationFeedbacks(trx, guestUserId, targetUserId);
      await this.resetRecommendationLearningProfiles(trx, guestUserId, targetUserId);
      await this.finalizeGuestUser(trx, guestUser, targetUserId);

      return {
        guest_user_id: guestUserId,
        target_user_id: targetUserId,
        favorites,
        meal_plans: mealPlans,
        shopping_lists: shoppingLists,
        inventory,
        preferences,
        recommendation_feedbacks: feedbacks,
      };
    });

    await this.mealPlanService.recomputeRecommendationLearning({ userIds: [targetUserId] });

    logger.info('Guest account merged into formal account', mergeSummary);
    return mergeSummary;
  }

  private async mergeFavorites(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    const guestFavorites = await trx('favorites').where('user_id', guestUserId).select('*');
    if (!guestFavorites.length) return { moved: 0, skipped: 0 };

    const targetFavoriteRecipeIds = new Set(
      (await trx('favorites').where('user_id', targetUserId).select('recipe_id')).map((row: any) => row.recipe_id)
    );

    let moved = 0;
    let skipped = 0;
    for (const favorite of guestFavorites) {
      if (targetFavoriteRecipeIds.has(favorite.recipe_id)) {
        await trx('favorites').where('id', favorite.id).delete();
        skipped += 1;
        continue;
      }
      await trx('favorites').where('id', favorite.id).update({ user_id: targetUserId });
      targetFavoriteRecipeIds.add(favorite.recipe_id);
      moved += 1;
    }

    return { moved, skipped };
  }

  private async mergeMealPlans(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    const guestPlans = await trx('meal_plans').where('user_id', guestUserId).select('*');
    if (!guestPlans.length) return { moved: 0, skipped: 0 };

    const targetPlanKeys = new Set(
      (await trx('meal_plans').where('user_id', targetUserId).select('plan_date', 'meal_type'))
        .map((row: any) => `${row.plan_date}:${row.meal_type}`)
    );

    let moved = 0;
    let skipped = 0;
    for (const plan of guestPlans) {
      const key = `${plan.plan_date}:${plan.meal_type}`;
      if (targetPlanKeys.has(key)) {
        await trx('meal_plans').where('id', plan.id).delete();
        skipped += 1;
        continue;
      }
      await trx('meal_plans').where('id', plan.id).update({ user_id: targetUserId });
      targetPlanKeys.add(key);
      moved += 1;
    }

    return { moved, skipped };
  }

  private async mergeShoppingLists(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    const updated = await trx('shopping_lists').where('user_id', guestUserId).update({ user_id: targetUserId });
    return { moved: Number(updated || 0) };
  }

  private async mergeInventory(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    const guestRows = await trx('ingredient_inventory').where('user_id', guestUserId).select('*');
    if (!guestRows.length) return { moved: 0, merged: 0 };

    const targetRows = await trx('ingredient_inventory').where('user_id', targetUserId).select('*');
    const targetKeyMap = new Map<string, any>();
    for (const row of targetRows) {
      const key = `${row.ingredient_name}::${row.unit || ''}::${row.expiry_date || ''}`;
      if (!targetKeyMap.has(key)) targetKeyMap.set(key, row);
    }

    let moved = 0;
    let merged = 0;
    for (const row of guestRows) {
      const key = `${row.ingredient_name}::${row.unit || ''}::${row.expiry_date || ''}`;
      const matched = targetKeyMap.get(key);
      if (matched) {
        const nextQuantity = Number(matched.quantity || 0) + Number(row.quantity || 0);
        await trx('ingredient_inventory').where('id', matched.id).update({
          quantity: nextQuantity,
          updated_at: new Date(),
        });
        await trx('ingredient_inventory').where('id', row.id).delete();
        merged += 1;
        continue;
      }

      await trx('ingredient_inventory').where('id', row.id).update({ user_id: targetUserId });
      moved += 1;
    }

    return { moved, merged };
  }

  private async mergePreferences(trx: Knex.Transaction, guestUser: any, targetUser: any) {
    const guestPrefs = this.parsePreferences(guestUser.preferences);
    const targetPrefs = this.parsePreferences(targetUser.preferences);
    const merged = { ...targetPrefs } as Record<string, any>;

    for (const key of ARRAY_PREFERENCE_KEYS) {
      merged[key] = [...new Set([...this.uniqueStrings(targetPrefs[key]), ...this.uniqueStrings(guestPrefs[key])])];
    }

    for (const key of SCALAR_PREFERENCE_KEYS) {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        const guestValue = guestPrefs[key];
        if (guestValue !== undefined && guestValue !== null && guestValue !== '') {
          merged[key] = guestValue;
        }
      }
    }

    merged.merged_guest_sources = [
      ...new Set([
        ...this.uniqueStrings(targetPrefs.merged_guest_sources),
        guestUser.id,
      ]),
    ];

    const [updatedUser] = await trx('users')
      .where('id', targetUser.id)
      .update({
        preferences: JSON.stringify(merged),
        updated_at: new Date(),
      })
      .returning(['id', 'preferences']);

    return {
      updated: true,
      preferences: this.parsePreferences(updatedUser?.preferences || merged),
    };
  }

  private async mergeRecommendationFeedbacks(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    const updated = await trx('recommendation_feedbacks').where('user_id', guestUserId).update({ user_id: targetUserId });
    return { moved: Number(updated || 0) };
  }

  private async resetRecommendationLearningProfiles(trx: Knex.Transaction, guestUserId: string, targetUserId: string) {
    await trx('recommendation_learning_profiles').where('user_id', guestUserId).delete();
    await trx('recommendation_learning_profiles').where('user_id', targetUserId).delete();
  }

  private async finalizeGuestUser(trx: Knex.Transaction, guestUser: any, targetUserId: string) {
    const guestPrefs = this.parsePreferences(guestUser.preferences);
    const archivedPrefs = {
      ...guestPrefs,
      is_guest: false,
      merged_into_user_id: targetUserId,
      merged_at: new Date().toISOString(),
      merged_from_guest_user_id: guestUser.id,
      guest_device_id: guestPrefs.guest_device_id || null,
      guest_archived: true,
    };

    await trx('users')
      .where('id', guestUser.id)
      .update({
        preferences: JSON.stringify(archivedPrefs),
        updated_at: new Date(),
        email: guestUser.email ? `merged_${guestUser.id}_${guestUser.email}` : guestUser.email,
        username: guestUser.username ? `merged_${guestUser.id}` : guestUser.username,
      });
  }
}
