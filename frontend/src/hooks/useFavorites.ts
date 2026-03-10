import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { favoritesApi, type FavoritesListResponse } from '../api/favorites';
import { shouldUseWebMockFallback } from '../mock/webFallback';

const buildEmptyFavorites = (params?: { page?: number; limit?: number }): FavoritesListResponse => ({
  total: 0,
  page: params?.page ?? 1,
  limit: params?.limit ?? 20,
  items: [],
});

// 获取收藏列表
export function useFavorites(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['favorites', params],
    queryFn: async () => {
      try {
        const res = await favoritesApi.getFavorites(params);
        return res.data ?? res ?? buildEmptyFavorites(params);
      } catch (error) {
        if (Platform.OS === 'web' && shouldUseWebMockFallback(error)) {
          return buildEmptyFavorites(params);
        }
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2分钟
    retry: Platform.OS === 'web' ? 0 : 1,
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
