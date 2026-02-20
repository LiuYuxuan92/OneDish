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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const userRecipesApi = {
  save: (data: any) =>
    apiClient.post<UserRecipe>('/user-recipes', data),

  getList: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginationResult<UserRecipe>>('/user-recipes', { params }),

  getDetail: (id: string) =>
    apiClient.get<UserRecipe>(`/user-recipes/${id}`),

  delete: (id: string) =>
    apiClient.delete(`/user-recipes/${id}`),
};
