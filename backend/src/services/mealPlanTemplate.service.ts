import { db } from '../config/database';
import { logger } from '../utils/logger';
import { MealPlanService } from './mealPlan.service';
import { familyService } from './family.service';

export interface MealTemplateEntry {
  source_date: string;
  day_offset: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | string;
  recipe_id: string;
  recipe_name_snapshot?: string;
  servings?: number;
  status?: 'active' | 'missing_recipe';
}

export interface MealPlanTemplate {
  id: string;
  creator_user_id: string;
  family_id?: string | null;
  title: string;
  description?: string;
  plan_data: MealTemplateEntry[];
  tags: string[];
  clone_count: number;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateInput {
  userId: string;
  title: string;
  description?: string;
  planData?: MealTemplateEntry[];
  tags?: string[];
  isPublic?: boolean;
  sourceStartDate?: string;
  sourceEndDate?: string;
}

export interface BrowseTemplatesFilter {
  creatorUserId?: string;
  page?: number;
  pageSize?: number;
  includePublic?: boolean;
}

export interface ApplyTemplateInput {
  targetStartDate: string;
}

export interface ApplyTemplateResult {
  success: boolean;
  message: string;
  appliedCount: number;
  skippedMissingRecipeCount: number;
  skippedEntries: Array<{
    meal_type: string;
    target_date: string;
    recipe_id: string;
    recipe_name_snapshot?: string;
    reason: 'missing_recipe';
  }>;
}

export class MealPlanTemplateService {
  async createTemplate(input: CreateTemplateInput): Promise<MealPlanTemplate> {
    const planData = input.planData && input.planData.length > 0
      ? input.planData
      : await this.buildPlanDataFromWeeklyPlan(input.userId, input.sourceStartDate, input.sourceEndDate);

    if (!planData.length) {
      throw new Error('当前周计划为空，无法保存为模板');
    }

    const familyId = await familyService.getFamilyIdForUser(input.userId);

    const [template] = await db('meal_plan_templates')
      .insert({
        creator_user_id: input.userId,
        family_id: familyId || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        plan_data: JSON.stringify(planData),
        tags: JSON.stringify(this.normalizeTags(input.tags || [])),
        is_public: input.isPublic ?? false,
      })
      .returning('*');

    return this.formatTemplate(template);
  }

  async browseTemplates(filter: BrowseTemplatesFilter): Promise<{ templates: MealPlanTemplate[]; total: number }> {
    const { creatorUserId, page = 1, pageSize = 20, includePublic = false } = filter;

    let query = db('meal_plan_templates');

    if (creatorUserId && includePublic) {
      query = query.where((builder) => {
        builder.where('creator_user_id', creatorUserId).orWhere('is_public', true);
      });
    } else if (creatorUserId) {
      query = query.where('creator_user_id', creatorUserId);
    } else {
      query = query.where('is_public', true);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    const templates = await query
      .orderBy('updated_at', 'desc')
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .select('*');

    return {
      templates: templates.map((t) => this.formatTemplate(t)),
      total,
    };
  }

  async getTemplate(templateId: string, userId?: string): Promise<MealPlanTemplate | null> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    if (!template) return null;
    if (!template.is_public && template.creator_user_id !== userId) return null;
    return this.formatTemplate(template);
  }

  async applyTemplate(userId: string, templateId: string, input: ApplyTemplateInput): Promise<ApplyTemplateResult> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    if (!template) {
      throw new Error('模板不存在');
    }

    if (!template.is_public && template.creator_user_id !== userId) {
      throw new Error('无权访问该模板');
    }

    const entries = this.normalizeEntries(typeof template.plan_data === 'string' ? JSON.parse(template.plan_data) : template.plan_data);
    if (!entries.length) {
      throw new Error('模板内容为空，无法套用');
    }

    const targetStartDate = this.normalizeDate(input.targetStartDate);
    const recipeIds = [...new Set(entries.map((entry) => entry.recipe_id).filter(Boolean))];
    const recipeRows = recipeIds.length
      ? await db('recipes').whereIn('id', recipeIds).select('id', 'name')
      : [];
    const availableRecipeIds = new Set(recipeRows.map((recipe: any) => recipe.id));

    const mealPlanService = new MealPlanService();
    let appliedCount = 0;
    const skippedEntries: ApplyTemplateResult['skippedEntries'] = [];

    const sortedEntries = [...entries].sort((a, b) => {
      if (a.day_offset !== b.day_offset) return a.day_offset - b.day_offset;
      return String(a.meal_type).localeCompare(String(b.meal_type));
    });

    for (const entry of sortedEntries) {
      const targetDate = this.addDays(targetStartDate, entry.day_offset);
      if (!availableRecipeIds.has(entry.recipe_id)) {
        skippedEntries.push({
          meal_type: entry.meal_type,
          target_date: targetDate,
          recipe_id: entry.recipe_id,
          recipe_name_snapshot: entry.recipe_name_snapshot,
          reason: 'missing_recipe',
        });
        continue;
      }

      await mealPlanService.setMealPlan({
        user_id: userId,
        plan_date: targetDate,
        meal_type: entry.meal_type,
        recipe_id: entry.recipe_id,
        servings: entry.servings || 1,
      });
      appliedCount += 1;
    }

    await db('meal_plan_templates')
      .where('id', templateId)
      .increment('clone_count', 1)
      .update({ updated_at: db.fn.now() });

    logger.info('Template applied', { userId, templateId, appliedCount, skippedMissingRecipeCount: skippedEntries.length, targetStartDate });

    const messageParts = [`模板已套用到从 ${targetStartDate} 开始的一周`, `成功写入 ${appliedCount} 餐`];
    if (skippedEntries.length) {
      messageParts.push(`跳过 ${skippedEntries.length} 个失效菜谱`);
    }

    return {
      success: true,
      message: messageParts.join('，'),
      appliedCount,
      skippedMissingRecipeCount: skippedEntries.length,
      skippedEntries,
    };
  }

  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    if (!template) {
      throw new Error('模板不存在');
    }
    if (template.creator_user_id !== userId) {
      throw new Error('仅创建者可删除模板');
    }

    await db('meal_plan_templates').where('id', templateId).del();
  }

  private async buildPlanDataFromWeeklyPlan(userId: string, sourceStartDate?: string, sourceEndDate?: string): Promise<MealTemplateEntry[]> {
    const startDate = this.normalizeDate(sourceStartDate || this.getMonday(new Date()));
    const endDate = this.normalizeDate(sourceEndDate || this.addDays(startDate, 6));
    const familyId = await familyService.getFamilyIdForUser(userId);
    const ownerId = await familyService.getOwnerIdForUser(userId);

    let query = db('meal_plans as mp')
      .leftJoin('recipes as r', 'mp.recipe_id', 'r.id')
      .whereBetween('mp.plan_date', [startDate, endDate]);

    query = familyId ? query.where('mp.family_id', familyId) : query.where('mp.user_id', ownerId);

    const plans = await query
      .select(
        'mp.plan_date',
        'mp.meal_type',
        'mp.recipe_id',
        'mp.servings',
        'r.name as recipe_name'
      )
      .orderBy('mp.plan_date', 'asc')
      .orderBy('mp.meal_type', 'asc');

    return plans.map((plan: any) => ({
      source_date: this.normalizeDate(plan.plan_date),
      day_offset: this.diffDays(startDate, this.normalizeDate(plan.plan_date)),
      meal_type: plan.meal_type,
      recipe_id: plan.recipe_id,
      recipe_name_snapshot: plan.recipe_name || undefined,
      servings: Number(plan.servings || 1),
      status: plan.recipe_name ? 'active' : 'missing_recipe',
    }));
  }

  private normalizeEntries(raw: any): MealTemplateEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((entry) => entry && entry.recipe_id && entry.meal_type)
      .map((entry) => ({
        source_date: this.normalizeDate(entry.source_date || this.addDays(this.getMonday(new Date()), Number(entry.day_offset || 0))),
        day_offset: Number(entry.day_offset || 0),
        meal_type: entry.meal_type,
        recipe_id: entry.recipe_id,
        recipe_name_snapshot: entry.recipe_name_snapshot,
        servings: Number(entry.servings || 1),
        status: entry.status === 'missing_recipe' ? 'missing_recipe' : 'active',
      }));
  }

  private normalizeTags(tags: string[]): string[] {
    return tags
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 10);
  }

  private formatTemplate(template: any): MealPlanTemplate {
    return {
      ...template,
      plan_data: this.normalizeEntries(typeof template.plan_data === 'string' ? JSON.parse(template.plan_data) : template.plan_data),
      tags: typeof template.tags === 'string' ? JSON.parse(template.tags) : (template.tags || []),
    };
  }

  private getMonday(date: Date): string {
    const value = new Date(date);
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    value.setDate(value.getDate() + diff);
    return value.toISOString().split('T')[0];
  }

  private normalizeDate(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value).split('T')[0];
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
  }

  private diffDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / (24 * 60 * 60 * 1000));
  }
}
