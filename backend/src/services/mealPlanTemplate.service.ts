import { db } from '../config/database';

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
  async cloneTemplate(userId: string, templateId: string): Promise<{ success: boolean; message: string }> {
    const template = await db('meal_plan_templates').where('id', templateId).first();
    if (!template) {
      throw new Error('模板不存在');
    }

    if (!template.is_public && template.creator_user_id !== userId) {
      throw new Error('无权访问该模板');
    }

    // TODO: 将模板数据复制到用户的 meal_plan 表（当前周）
    // 这里需要结合 MealPlanService 来实现具体的克隆逻辑
    // 暂时先增加 clone_count

    await db('meal_plan_templates')
      .where('id', templateId)
      .increment('clone_count', 1);

    // 返回模板数据，由调用方决定如何处理
    return {
      success: true,
      message: '模板克隆成功',
      // 这里可以返回 plan_data 供前端使用
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
