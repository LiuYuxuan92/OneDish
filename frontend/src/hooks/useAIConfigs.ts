import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiConfigsApi, AIConfigFormData, AIConfigSafe } from '../api/ai-configs';

// 获取用户 AI 配置列表
export function useAIConfigs() {
  return useQuery({
    queryKey: ['ai-configs'],
    queryFn: () => aiConfigsApi.getConfigs().then(res => res.data),
    staleTime: 30 * 1000, // 30秒
  });
}

// 创建 AI 配置
export function useCreateAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AIConfigFormData) =>
      aiConfigsApi.createConfig(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

// 更新 AI 配置
export function useUpdateAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIConfigFormData> }) =>
      aiConfigsApi.updateConfig(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

// 删除 AI 配置
export function useDeleteAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      aiConfigsApi.deleteConfig(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
  });
}

// 测试 AI 配置
export function useTestAIConfig() {
  return useMutation({
    mutationFn: (id: string) =>
      aiConfigsApi.testConfig(id).then(res => res.data),
  });
}

// 组合 hook - 返回所有需要的方法
export function useAIConfigsWithActions() {
  const { data: configs, isLoading, error, refetch } = useAIConfigs();
  const createMutation = useCreateAIConfig();
  const updateMutation = useUpdateAIConfig();
  const deleteMutation = useDeleteAIConfig();
  const testMutation = useTestAIConfig();

  return {
    // 数据
    configs: configs || [],
    isLoading,
    error,
    
    // 方法
    refetch,
    
    // CRUD
    createConfig: createMutation.mutateAsync,
    updateConfig: (id: string, data: Partial<AIConfigFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteConfig: deleteMutation.mutateAsync,
    testConfig: testMutation.mutateAsync,
    
    // 状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,
    
    // 错误
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    testError: testMutation.error,
  };
}
