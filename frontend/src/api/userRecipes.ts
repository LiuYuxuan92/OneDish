import { apiClient } from './client';
import { PaginationResult } from '../types';

export interface UserRecipe {
  id: string;
  user_id: string;
  source: string;
  name: string;
  type?: string;
  prep_time?: number;
  difficulty?: string;
  servings?: string;
  adult_version?: any;
  baby_version?: any;
  cooking_tips?: string[];
  image_url?: string[];
  tags?: string[];
  category?: string[];
  status: 'draft' | 'pending' | 'published' | 'rejected';
  reject_reason?: string;
  baby_age_range?: string;
  allergens?: string[];
  is_one_pot?: boolean;
  step_branches?: any[];
  is_favorited?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const userRecipesApi = {
  createDraft: (data: any) => apiClient.post<UserRecipe>('/user-recipes', data),
  updateDraft: (id: string, data: any) => apiClient.put<UserRecipe>(`/user-recipes/${id}`, data),
  submit: (id: string) => apiClient.post<UserRecipe>(`/user-recipes/${id}/submit`),
  review: (id: string, action: 'published' | 'rejected', reason?: string) =>
    apiClient.post<UserRecipe>(`/user-recipes/${id}/review`, { action, reason }),
  getList: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginationResult<UserRecipe>>('/user-recipes', { params }),
  getPublished: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginationResult<UserRecipe>>('/user-recipes/published', { params }),
  getDetail: (id: string) => apiClient.get<UserRecipe>(`/user-recipes/${id}`),
  getPublishedDetail: (id: string) => apiClient.get<UserRecipe>(`/user-recipes/published/${id}`),
  toggleFavorite: (id: string) => apiClient.post<{ favorited: boolean }>(`/user-recipes/${id}/favorite`),
  delete: (id: string) => apiClient.delete(`/user-recipes/${id}`),

  // 兼容旧调用
  save: (data: any) => apiClient.post<UserRecipe>('/user-recipes', data),
};
