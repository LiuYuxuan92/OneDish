import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListsApi, ShoppingList, GenerateShoppingListParams } from '../api/shoppingLists';

// 获取所有购物清单
export function useShoppingLists(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['shoppingLists', params],
    queryFn: () => shoppingListsApi.getAll(params).then(res => res.data),
    staleTime: 2 * 60 * 1000, // 2分钟
  });
}

// 获取最新购物清单（今日，排除已完成的）
export function useLatestShoppingList() {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['shoppingLists', 'latest', today],
    queryFn: async () => {
      const res = await shoppingListsApi.getAll({
        start_date: today,
        end_date: today,
      });
      // 找到第一个未完成的清单
      const unfinishedList = res.data.items?.find((item: any) => !item.is_completed);
      return unfinishedList || null;
    },
    staleTime: 0, // 关闭缓存，确保数据实时性
  });
}

// 生成购物清单
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateShoppingListParams) =>
      shoppingListsApi.generate(data).then(res => res.data),
    onSuccess: async () => {
      // 失效所有 shoppingLists 相关查询
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 将单个菜谱加入购物清单
export function useAddRecipeToShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      recipe_id: string;
      list_date?: string;
      servings?: number;
    }) => {
      const response = await shoppingListsApi.addRecipe(data);
      // 后端返回格式: { code, message, data }
      if (response.code !== 200) {
        throw new Error(response.message || '添加失败');
      }
      return response.data;
    },
    onSuccess: async (data) => {
      const today = new Date().toISOString().split('T')[0];
      // 立即更新缓存
      queryClient.setQueryData(['shoppingLists', 'latest', today], data);
      // 然后失效所有相关查询
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
    onError: (error: any) => {
      console.error('[Frontend Hook] 添加失败:', error);
    },
  });
}

// 更新购物清单项状态
export function useUpdateShoppingListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { area: string; ingredient_id: string; checked: boolean }) =>
      shoppingListsApi.updateItem(listId, data).then(res => res.data),
    onSuccess: (data) => {
      const today = new Date().toISOString().split('T')[0];

      // 首先直接设置今日清单的缓存
      queryClient.setQueryData(['shoppingLists', 'latest', today], data);

      // 同时设置详情缓存
      queryClient.setQueryData(['shoppingLists', 'detail', listId], data);

      // 然后失效所有相关查询，触发重新获取以确保一致性
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 删除购物清单项
export function useRemoveShoppingListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { area: string; item_name: string }) =>
      shoppingListsApi.removeItem(listId, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 手动添加购物清单项
export function useAddShoppingListItem(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { item_name: string; amount: string; area?: string }) =>
      shoppingListsApi.addItem(listId, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 全选/取消全选
export function useToggleAllShoppingListItems(listId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checked: boolean) =>
      shoppingListsApi.toggleAll(listId, { checked }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 标记清单为完成
export function useMarkShoppingListComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) =>
      shoppingListsApi.markComplete(listId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

// 获取指定购物清单详情
export function useShoppingListDetail(listId: string) {
  return useQuery({
    queryKey: ['shoppingLists', 'detail', listId],
    queryFn: () => shoppingListsApi.getById(listId).then(res => res.data),
    enabled: !!listId,
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useCreateShoppingListShare(listId: string) {
  return useMutation({
    mutationFn: () => shoppingListsApi.createShare(listId).then(res => res.data),
  });
}

export function useJoinShoppingListShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => shoppingListsApi.joinShare(inviteCode).then(res => res.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });
}

export function useRegenerateShoppingListShareInvite(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => shoppingListsApi.regenerateShareInvite(listId).then(res => res.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists', 'detail', listId] });
    },
  });
}

export function useRemoveShoppingListShareMember(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => shoppingListsApi.removeShareMember(listId, memberId).then(res => res.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shoppingLists', 'detail', listId] });
    },
  });
}
