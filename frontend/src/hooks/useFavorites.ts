import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../api/favorites';

// 获取收藏列表
export function useFavorites(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['favorites', params],
    queryFn: () => favoritesApi.getFavorites(params).then(res => res.data),
    staleTime: 2 * 60 * 1000, // 2分钟
  });
}

// 添加收藏
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) =>
      favoritesApi.addFavorite(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

// 取消收藏
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) =>
      favoritesApi.removeFavorite(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

// 检查是否已收藏
export function useCheckFavorite(recipeId: string) {
  return useQuery({
    queryKey: ['favorites', 'check', recipeId],
    queryFn: () => favoritesApi.checkFavorite(recipeId).then(res => res.data),
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}
