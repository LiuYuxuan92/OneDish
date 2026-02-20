/**
 * 简家厨 - 食材库存 Hook
 * 用于管理用户食材库存数据
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientInventoryApi, AddInventoryParams, UpdateInventoryParams, IngredientInventory } from '../api/ingredientInventory';

// 获取食材库存列表
export function useIngredientInventory() {
  return useQuery({
    queryKey: ['ingredientInventory'],
    queryFn: () => ingredientInventoryApi.getInventory().then(res => res.data),
    staleTime: 1 * 60 * 1000, // 1分钟
    cacheTime: 24 * 60 * 60 * 1000, // 24h 离线缓存
  });
}

// 获取即将过期的食材
export function useExpiringItems(days: number = 3) {
  return useQuery({
    queryKey: ['ingredientInventory', 'expiring', days],
    queryFn: () => ingredientInventoryApi.getExpiringItems(days).then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

// 添加食材到库存
export function useAddInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AddInventoryParams) =>
      ingredientInventoryApi.addInventory(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientInventory'] });
    },
  });
}

// 更新食材库存
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: UpdateInventoryParams }) =>
      ingredientInventoryApi.updateInventory(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientInventory'] });
    },
  });
}

// 删除食材库存
export function useDeleteInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      ingredientInventoryApi.deleteInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientInventory'] });
    },
  });
}

// 批量删除食材库存
export function useBatchDeleteInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      ingredientInventoryApi.batchDeleteInventory(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientInventory'] });
    },
  });
}

export default useIngredientInventory;
