import { apiClient } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authApi = {
  // 用户注册
  register: (data: { username: string; email?: string; password: string; phone?: string }) =>
    apiClient.post('/auth/register', data),
  upgradeGuestRegister: (data: { username: string; email?: string; password: string; phone?: string }) =>
    apiClient.post('/auth/upgrade-guest/register', data),

  // 用户登录
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  upgradeGuestLogin: (data: { email: string; password: string }) =>
    apiClient.post('/auth/upgrade-guest/login', data),
  upgradeGuestWechat: (data: { code: string; userInfo?: any }) =>
    apiClient.post('/auth/upgrade-guest/wechat', data),

  // 刷新Token
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),

  // 退出登录
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
  },
};
