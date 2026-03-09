import { db } from '../config/database';
import { familyService } from './family.service';

export interface ShoppingFeedbackEvent {
  id?: string;
  user_id: string;
  family_id?: string | null;
  list_id: string;
  item_id: string;
  event_type: 'purchase' | 'out_of_stock' | 'substitute' | 'skip' | 'reopen';
  ingredient_key: string;
  substitute_key?: string;
  substitute_name?: string;
  reason?: string;
  actor_user_id: string;
  source_meal_plan_id?: string;
  source_recipe_ids?: string[];
  created_at?: string;
}

export class ShoppingFeedbackService {
  /**
   * 记录购物反馈事件
   */
  async recordFeedbackEvent(event: Omit<ShoppingFeedbackEvent, 'id' | 'created_at'>): Promise<ShoppingFeedbackEvent> {
    // 获取 family_id
    let familyId = event.family_id;
    if (!familyId) {
      familyId = await familyService.getFamilyIdForUser(event.user_id);
    }

    const [created] = await db('shopping_feedback_events')
      .insert({
        ...event,
        family_id: familyId,
      })
      .returning('*');

    return created;
  }

  /**
   * 批量记录反馈事件
   */
  async batchRecordFeedbackEvents(events: Omit<ShoppingFeedbackEvent, 'id' | 'created_at'>[]): Promise<number> {
    if (events.length === 0) return 0;

    // 批量获取 family_id
    const userIds = [...new Set(events.map(e => e.user_id))];
    const familyIdMap: Record<string, string | null> = {};
    
    for (const userId of userIds) {
      familyIdMap[userId] = await familyService.getFamilyIdForUser(userId);
    }

    const records = events.map(event => ({
      ...event,
      family_id: event.family_id || familyIdMap[event.user_id] || null,
    }));

    const result = await db('shopping_feedback_events')
      .insert(records)
      .onConflict('id')
      .ignore();

    return result.length;
  }

  /**
   * 查询用户的购物反馈事件
   */
  async getFeedbackEvents(params: {
    userId: string;
    ingredientKey?: string;
    eventType?: 'out_of_stock' | 'substitute' | 'skip' | 'purchase' | 'reopen';
    since?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ events: ShoppingFeedbackEvent[]; nextCursor?: string; hasMore: boolean }> {
    const { userId, ingredientKey, eventType, since, limit = 50, cursor } = params;
    
    const familyId = await familyService.getFamilyIdForUser(userId);
    
    let query = db('shopping_feedback_events')
      .where(function() {
        this.where('user_id', userId);
        if (familyId) {
          this.orWhere('family_id', familyId);
        }
      });

    if (ingredientKey) {
      query = query.where('ingredient_key', ingredientKey);
    }

    if (eventType) {
      query = query.where('event_type', eventType);
    }

    if (since) {
      query = query.where('created_at', '>=', since);
    }

    if (cursor) {
      query = query.where('created_at', '<', cursor);
    }

    const events = await query
      .orderBy('created_at', 'desc')
      .limit(limit + 1);

    let nextCursor: string | undefined;
    let hasMore = false;

    if (events.length > limit) {
      events.pop();
      hasMore = true;
      nextCursor = events[events.length - 1]?.created_at;
    }

    return { events, nextCursor, hasMore };
  }

  /**
   * 获取用户的替代映射
   */
  async getSubstitutionMapping(userId: string, days: number = 30): Promise<Map<string, { key: string; name: string }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const events = await db('shopping_feedback_events')
      .where('user_id', userId)
      .where('event_type', 'substitute')
      .where('created_at', '>=', since)
      .select('ingredient_key', 'substitute_key', 'substitute_name');

    const mapping = new Map<string, { key: string; name: string }>();
    for (const e of events) {
      mapping.set(e.ingredient_key, {
        key: e.substitute_key,
        name: e.substitute_name,
      });
    }

    return mapping;
  }
}

export const shoppingFeedbackService = new ShoppingFeedbackService();
