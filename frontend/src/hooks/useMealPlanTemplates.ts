// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  mealPlanTemplatesApi, 
  BrowseTemplatesParams, 
  CreateTemplateInput,
  MealPlanTemplate 
} from '../api/mealPlanTemplates';

/**
 * 浏览公开模板列表
 */
export function useBrowseTemplates(params?: BrowseTemplatesParams) {
  return useQuery({
    queryKey: ['mealPlanTemplates', 'browse', params],
    queryFn: () => mealPlanTemplatesApi.browseTemplates(params).then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 获取单个模板详情
 */
export function useTemplateDetail(templateId: string) {
  return useQuery({
    queryKey: ['mealPlanTemplates', templateId],
    queryFn: () => mealPlanTemplatesApi.getTemplate(templateId).then(res => res.data),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 发布周计划为模板
 */
export function usePublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateInput) => 
      mealPlanTemplatesApi.publishTemplate(data).then(res => res.data),
    onSuccess: () => {
      // 使缓存失效，刷新列表
      queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
    },
  });
}

/**
 * 克隆模板到用户本周计划
 */
export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => 
      mealPlanTemplatesApi.cloneTemplate(templateId).then(res => res.data),
    onSuccess: () => {
      // 克隆成功后刷新周计划
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
  });
}

/**
 * 删除模板
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => 
      mealPlanTemplatesApi.deleteTemplate(templateId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
    },
  });
}
