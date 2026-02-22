import { apiClient } from './client';

// 用户相关类型定义
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role?: 'user' | 'admin';
  phone?: string;
  avatar_url?: string;
  family_size: number;
  baby_age?: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  max_prep_time?: number;
  favorite_categories?: string[];
  exclude_ingredients?: string[];
}

export interface UpdateUserInfoRequest {
  family_size?: number;
  baby_age?: number;
  avatar_url?: string;
}

// 用户API
export const usersApi = {
  // 获取用户信息
  getUserInfo: () => {
    return apiClient.get<UserInfo>('/users/me');
  },

  // 更新用户信息
  updateUserInfo: (data: UpdateUserInfoRequest) => {
    return apiClient.put<UserInfo>('/users/me', data);
  },

  // 更新用户偏好
  updatePreferences: (data: UserPreferences) => {
    return apiClient.put<{ preferences: UserPreferences }>('/users/me/preferences', data);
  },
};
