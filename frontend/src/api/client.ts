// @ts-nocheck
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

const getWebOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://43.135.174.206:3000';
};

const getBaseUrl = () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (!__DEV__) {
    return 'https://api.jianjiachu.com/v1';
  }

  if (Platform.OS === 'web') {
    const origin = getWebOrigin();
    if (/^https:\/\//.test(origin)) {
      return `${origin}/api/v1`;
    }
    return 'http://43.135.174.206:3000/api/v1';
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  return 'http://localhost:3000/api/v1';
};

const BASE_URL = getBaseUrl();

export const API_BASE_URL = BASE_URL;
export const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '');

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (!API_ORIGIN) return trimmed;
  return trimmed.startsWith('/') ? `${API_ORIGIN}${trimmed}` : `${API_ORIGIN}/${trimmed}`;
}

export function resolveMediaUrls(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => resolveMediaUrl(item)).filter(Boolean) as string[];
  }
  const single = resolveMediaUrl(value);
  return single ? [single] : [];
}

let webToken: string | null = null;

function initWebToken() {
  if (Platform.OS !== 'web') return;

  if (typeof localStorage !== 'undefined') {
    webToken = localStorage.getItem('access_token');
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
    initWebToken();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async config => {
        if (Platform.OS === 'web') {
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

    this.client.interceptors.response.use(
      response => {
        const body: any = response.data || {};
        return {
          ...body,
          meta: body?.meta || {
            request_id: response.headers?.['x-request-id'],
            route: response.headers?.['x-route-source'],
          },
        };
      },
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (Platform.OS === 'web') {
          return Promise.reject({
            message: (error.response?.data as any)?.message || error.message || '请求失败',
            code: (error.response?.data as any)?.code || error.response?.status,
            http_status: error.response?.status,
          });
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
              const { token, refresh_token } = response.data.data;
              await AsyncStorage.setItem('access_token', token);
              await AsyncStorage.setItem('refresh_token', refresh_token);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }

              return this.client(originalRequest);
            }
          } catch {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          }
        }

        return Promise.reject({
          message: (error.response?.data as any)?.message || error.message || '请求失败',
          code: (error.response?.data as any)?.code || error.response?.status,
          http_status: error.response?.status,
        });
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const isAISearch = url.includes('/search/source/ai');
    const timeout = isAISearch ? 120000 : 30000;
    const response = await this.client.get(url, { ...config, timeout });
    return response as ApiResponse<T>;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response as ApiResponse<T>;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response as ApiResponse<T>;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response as ApiResponse<T>;
  }
}

export const apiClient = new ApiClient();
