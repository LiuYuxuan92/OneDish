// @ts-nocheck
import { apiClient } from './client';

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
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  title: string;
  description?: string;
  planData?: MealTemplateEntry[];
  tags?: string[];
  isPublic?: boolean;
  sourceStartDate?: string;
  sourceEndDate?: string;
}

export interface BrowseTemplatesParams {
  page?: number;
  pageSize?: number;
  mine?: boolean;
  includePublic?: boolean;
}

export interface BrowseTemplatesResponse {
  templates: MealPlanTemplate[];
  total: number;
}

export interface ApplyTemplateInput {
  targetStartDate: string;
}

export interface ApplyTemplateResponse {
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

export const mealPlanTemplatesApi = {
  listTemplates: (params?: BrowseTemplatesParams) =>
    apiClient.get<BrowseTemplatesResponse>('/meal-plan-templates', { params }),

  getTemplate: (templateId: string) =>
    apiClient.get<MealPlanTemplate>(`/meal-plan-templates/${templateId}`),

  createTemplate: (data: CreateTemplateInput) =>
    apiClient.post<MealPlanTemplate>('/meal-plan-templates', {
      title: data.title,
      description: data.description,
      planData: data.planData,
      tags: data.tags,
      isPublic: data.isPublic ?? false,
      sourceStartDate: data.sourceStartDate,
      sourceEndDate: data.sourceEndDate,
    }),

  applyTemplate: (templateId: string, data: ApplyTemplateInput) =>
    apiClient.post<ApplyTemplateResponse>(`/meal-plan-templates/${templateId}/apply`, data),

  deleteTemplate: (templateId: string) =>
    apiClient.delete(`/meal-plan-templates/${templateId}`),
};
