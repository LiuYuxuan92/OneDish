// @ts-nocheck
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

// 获取开发服务器地址
// iOS Simulator: localhost 可以工作
// Android Emulator: 需要使用 10.0.2.2
// 真机: 需要使用电脑的 IP 地址
const getBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.jianjiachu.com/v1';
  }

  // 开发环境
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  // iOS 和其他平台
  return 'http://localhost:3000/api/v1';
};

const BASE_URL = getBaseUrl();

// Web平台token存储
let webToken: string | null = null;

// 游客登录获取token
async function guestLogin(): Promise<string> {
  try {
    const response = await axios.post(`${BASE_URL}/auth/guest`);
    const token = response.data?.data?.token;
    if (token) {
      webToken = token;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('access_token', token);
      }
      return token;
    }
    return '';
  } catch (error) {
    console.error('Guest login failed:', error);
    return '';
  }
}

// 初始化Web token
async function initWebToken() {
  if (Platform.OS !== 'web') return;
  
  // 尝试从localStorage获取
  if (typeof localStorage !== 'undefined') {
    webToken = localStorage.getItem('access_token');
  }
  
  // 如果没有token，进行游客登录
  if (!webToken) {
    await guestLogin();
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    
    // Web平台初始化token
    initWebToken();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      async config => {
        // Web 平台使用存储的token
        if (Platform.OS === 'web') {
          // 优先使用内存中的token，其次localStorage
          let token = webToken;
          if (!token && typeof localStorage !== 'undefined') {
            token = localStorage.getItem('access_token');
          }
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        }
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      response => response.data,
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Web 平台不处理 token 刷新
        if (Platform.OS === 'web') {
          return Promise.reject(error.response?.data || error.message);
        }

        // Token 过期处理
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(
                `${BASE_URL}/auth/refresh`,
                { refresh_token: refreshToken }
              );

              const { token, refresh_token } = response.data.data;
              await AsyncStorage.setItem('access_token', token);
              await AsyncStorage.setItem('refresh_token', refresh_token);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }

              return this.client(originalRequest);
            }
          } catch {
            // 刷新失败，清除 token
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          }
        }

        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // AI 接口需要更长的超时时间
    const isAISearch = url.includes('/search/source/ai');
    const timeout = isAISearch ? 120000 : 30000; // AI 接口 120 秒，其他 30 秒
    
    const response = await this.client.get(url, { ...config, timeout });
    // 拦截器已经返回 response.data，所以这里直接返回
    return response as ApiResponse<T>;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response as ApiResponse<T>;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response as ApiResponse<T>;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response as ApiResponse<T>;
  }
}

export const apiClient = new ApiClient();
