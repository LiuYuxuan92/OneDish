import { Knex } from 'knex';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { MealPlanService } from './mealPlan.service';

const ARRAY_PREFERENCE_KEYS = ['prefer_ingredients', 'exclude_ingredients'] as const;
const SCALAR_PREFERENCE_KEYS = ['default_baby_age', 'cooking_time_limit', 'difficulty_preference'] as const;

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
