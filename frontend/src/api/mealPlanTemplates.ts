// @ts-nocheck
import { apiClient } from './client';

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
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  title: string;
  description?: string;
  planData: Record<string, { breakfast?: string; lunch?: string; dinner?: string }>;
  babyAgeStartMonths?: number;
  babyAgeEndMonths?: number;
  tags?: string[];
  isPublic?: boolean;
}

export interface BrowseTemplatesParams {
  babyAgeMonths?: number;
  tags?: string;
  page?: number;
  pageSize?: number;
}

export interface BrowseTemplatesResponse {
  templates: MealPlanTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CloneTemplateResponse {
  success: boolean;
  message: string;
}

export const mealPlanTemplatesApi = {
  // 浏览公开模板
  browseTemplates: (params?: BrowseTemplatesParams) =>
    apiClient.get<BrowseTemplatesResponse>('/meal-plan-templates', { params }),

  // 获取单个模板详情
  getTemplate: (templateId: string) =>
    apiClient.get<MealPlanTemplate>(`/meal-plan-templates/${templateId}`),

  // 发布模板
  publishTemplate: (data: CreateTemplateInput) =>
    apiClient.post<MealPlanTemplate>('/meal-plan-templates', {
      title: data.title,
      description: data.description,
      planData: data.planData,
      babyAgeStartMonths: data.babyAgeStartMonths,
      babyAgeEndMonths: data.babyAgeEndMonths,
      tags: data.tags,
      isPublic: data.isPublic ?? true,
    }),

  // 克隆模板
  cloneTemplate: (templateId: string) =>
    apiClient.post<CloneTemplateResponse>(`/meal-plan-templates/${templateId}/clone`),

  // 删除模板
  deleteTemplate: (templateId: string) =>
    apiClient.delete(`/meal-plan-templates/${templateId}`),
};
