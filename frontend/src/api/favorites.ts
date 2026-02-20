import { apiClient } from './client';

// 收藏相关类型定义
export interface FavoriteItem {
  id: string;
  recipe: {
    id: string;
    name: string;
    prep_time: number;
    image_url?: string[];
  };
  created_at: string;
}

export interface FavoritesListResponse {
  total: number;
  page: number;
  limit: number;
  items: FavoriteItem[];
}

export interface CheckFavoriteResponse {
  is_favorited: boolean;
}

// 收藏API
export const favoritesApi = {
  // 获取收藏列表
  getFavorites: (params?: { page?: number; limit?: number }) => {
    return apiClient.get<FavoritesListResponse>('/favorites', { params });
  },

  // 添加收藏
  addFavorite: (recipeId: string) => {
    return apiClient.post<{ id: string; recipe_id: string; created_at: string }>('/favorites', {
      recipe_id: recipeId,
    });
  },

  // 取消收藏
  removeFavorite: (recipeId: string) => {
    return apiClient.delete<null>(`/favorites/${recipeId}`);
  },

  // 检查是否已收藏
  checkFavorite: (recipeId: string) => {
    return apiClient.get<CheckFavoriteResponse>(`/favorites/check/${recipeId}`);
  },
};
