import { db } from '../config/database';
import { logger } from '../utils/logger';
import { MealPlanService } from './mealPlan.service';

export interface MealPlanTemplate {
  id: string;
  creator_user_id: string;
  title: string;
  description?: string;
  plan_data: Record<string, { breakfast?: string; lunch?: string; dinner?: string }>;
  baby_age_start_months?: number;
  baby_age_end_months?: number;
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
  planData: Record<string, { breakfast?: string; lunch?: string; dinner?: string }>;
  babyAgeStartMonths?: number;
  babyAgeEndMonths?: number;
  tags?: string[];
  isPublic?: boolean;
}

export interface BrowseTemplatesFilter {
  babyAgeMonths?: number;
  tags?: string[];
  creatorUserId?: string;
  page?: number;
  pageSize?: number;
}

export class MealPlanTemplateService {
  /**
   * 发布周计划为模板
   */
  async publishTemplate(input: CreateTemplateInput): Promise<MealPlanTemplate> {
    const [template] = await db('meal_plan_templates')
      .insert({
        creator_user_id: input.userId,
        title: input.title,
        description: input.description,
        plan_data: JSON.stringify(input.planData),
        baby_age_start_months: input.babyAgeStartMonths,
        baby_age_end_months: input.babyAgeEndMonths,
        tags: JSON.stringify(input.tags || []),
        is_public: input.isPublic ?? true,
      })
      .returning('*');

    return this.formatTemplate(template);
  }

  /**
   * 浏览公开模板
   */
  async browseTemplates(filter: BrowseTemplatesFilter): Promise<{ templates: MealPlanTemplate[]; total: number }> {
    const { babyAgeMonths, tags, creatorUserId, page = 1, pageSize = 20 } = filter;

    let query = db('meal_plan_templates').where('is_public', true);

    // 按宝宝月龄筛选
    if (babyAgeMonths !== undefined) {
      query = query.where('baby_age_start_months', '<=', babyAgeMonths)
        .where('baby_age_end_months', '>=', babyAgeMonths);
    }

    // 按标签筛选
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        query = query.whereRaw("tags::text LIKE ?", [`%"${tag}"%`]);
      });
    }

    // 按创建者筛选
    if (creatorUserId) {
      query = query.where('creator_user_id', creatorUserId);
    }

    // 获取总数
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    // 分页查询
    const templates = await query
      .orderBy('clone_count', 'desc')
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .select('*');

    return {
      templates: templates.map((t) => this.formatTemplate(t)),
      total,
    };
  }

  /**
   * 获取单个模板详情
   */
  async getTemplate(templateId: string): Promise<MealPlanTemplate | null> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    return template ? this.formatTemplate(template) : null;
  }

  /**
   * 克隆模板到用户本周计划
   */
  async cloneTemplate(userId: string, templateId: string): Promise<{ success: boolean; message: string; clonedCount?: number }> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    if (!template) {
      throw new Error('模板不存在');
    }

    if (!template.is_public && template.creator_user_id !== userId) {
      throw new Error('无权访问该模板');
    }

    // 解析模板数据
    const planData = typeof template.plan_data === 'string' 
      ? JSON.parse(template.plan_data) 
      : template.plan_data;

    // 获取本周的起始日期
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 周日
    const startDateStr = startOfWeek.toISOString().split('T')[0];

    // 克隆计划到用户的 meal_plan 表
    let clonedCount = 0;
    const mealPlanService = new MealPlanService();

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPlan = planData[dateStr];

      if (!dayPlan) continue;

      // 早餐
      if (dayPlan.breakfast) {
        await mealPlanService.setMealPlan({
          user_id: userId,
          plan_date: dateStr,
          meal_type: 'breakfast',
          recipe_id: dayPlan.breakfast,
          servings: 1,
        });
        clonedCount++;
      }

      // 午餐
      if (dayPlan.lunch) {
        await mealPlanService.setMealPlan({
          user_id: userId,
          plan_date: dateStr,
          meal_type: 'lunch',
          recipe_id: dayPlan.lunch,
          servings: 1,
        });
        clonedCount++;
      }

      // 晚餐
      if (dayPlan.dinner) {
        await mealPlanService.setMealPlan({
          user_id: userId,
          plan_date: dateStr,
          meal_type: 'dinner',
          recipe_id: dayPlan.dinner,
          servings: 1,
        });
        clonedCount++;
      }
    }

    // 增加克隆计数
    await db('meal_plan_templates')
      .where('id', templateId)
      .increment('clone_count', 1);

    logger.info('Template cloned', { userId, templateId, clonedCount });

    return {
      success: true,
      message: `模板克隆成功，已添加 ${clonedCount} 个餐食到本周计划`,
      clonedCount,
    };
  }

  /**
   * 删除模板（仅创建者可删除）
   */
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

  /**
   * 格式化模板数据
   */
  private formatTemplate(template: any): MealPlanTemplate {
    return {
      ...template,
      plan_data: typeof template.plan_data === 'string' ? JSON.parse(template.plan_data) : template.plan_data,
      tags: typeof template.tags === 'string' ? JSON.parse(template.tags) : template.tags,
    };
  }
}
