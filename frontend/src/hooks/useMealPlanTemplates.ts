// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mealPlanTemplatesApi,
  BrowseTemplatesParams,
  CreateTemplateInput,
  ApplyTemplateInput,
} from '../api/mealPlanTemplates';

export function useMealPlanTemplates(params?: BrowseTemplatesParams) {
  return useQuery({
    queryKey: ['mealPlanTemplates', params],
    queryFn: () => mealPlanTemplatesApi.listTemplates(params).then(res => res?.data || res),
    staleTime: 60 * 1000,
  });
}

export function useTemplateDetail(templateId: string) {
  return useQuery({
    queryKey: ['mealPlanTemplates', 'detail', templateId],
    queryFn: () => mealPlanTemplatesApi.getTemplate(templateId).then(res => res?.data || res),
    enabled: !!templateId,
    staleTime: 60 * 1000,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateInput) => mealPlanTemplatesApi.createTemplate(data).then(res => res?.data || res),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, input }: { templateId: string; input: ApplyTemplateInput }) =>
      mealPlanTemplatesApi.applyTemplate(templateId, input).then(res => res?.data || res),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => mealPlanTemplatesApi.deleteTemplate(templateId).then(res => res?.data || res),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlanTemplates'] });
    },
  });
}
