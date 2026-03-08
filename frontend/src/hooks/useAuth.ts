import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

type WebStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiClient } from '../api/client';

// 存储键名
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Web平台使用localStorage，移动端使用AsyncStorage
const isWeb = Platform.OS === 'web';
const webStorage: WebStorageLike | null =
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    ? ((globalThis as typeof globalThis & { localStorage: WebStorageLike }).localStorage)
    : null;

const tokenStorage = {
  async getToken(): Promise<string | null> {
    if (isWeb) {
      return webStorage?.getItem(TOKEN_KEY) || null;
    }
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    if (isWeb) {
      webStorage?.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },
  async removeToken(): Promise<void> {
    if (isWeb) {
      webStorage?.removeItem(TOKEN_KEY);
      webStorage?.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};

// 共享认证状态，避免每个 useAuth 实例各自维护导致登录后界面不切换
let authState = {
  isAuthenticated: false,
  isLoading: true,
};

const authListeners = new Set<(state: typeof authState) => void>();

function emitAuthState(nextState: Partial<typeof authState>) {
  authState = { ...authState, ...nextState };
  authListeners.forEach(listener => listener(authState));
}

// Web平台游客登录
async function guestLoginForAuth(): Promise<string | null> {
  try {
    const response = await axios.post(`${(apiClient as any).client?.defaults?.baseURL || 'http://localhost:3000/api/v1'}/auth/guest`);
    const token = response.data?.data?.token;
    if (token) {
      await tokenStorage.setToken(token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Guest login failed:', error);
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState(authState);

  useEffect(() => {
    authListeners.add(setState);
    checkAuth();
    return () => {
      authListeners.delete(setState);
    };
  }, []);

  async function checkAuth() {
    emitAuthState({ isLoading: true });
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        emitAuthState({ isAuthenticated: true });
      } else if (isWeb) {
        // Web平台无token时，自动游客登录
        const guestToken = await guestLoginForAuth();
        emitAuthState({ isAuthenticated: !!guestToken });
      } else {
        emitAuthState({ isAuthenticated: false });
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      emitAuthState({ isAuthenticated: false });
    } finally {
      emitAuthState({ isLoading: false });
    }
  }

  async function login(token: string, refreshToken?: string): Promise<void> {
    await tokenStorage.setToken(token);
    if (refreshToken) {
      if (isWeb) {
        webStorage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
    emitAuthState({ isAuthenticated: true, isLoading: false });
  }

  async function logout(): Promise<void> {
    await tokenStorage.removeToken();
    emitAuthState({ isAuthenticated: false, isLoading: false });
  }

  return { isAuthenticated: state.isAuthenticated, isLoading: state.isLoading, login, logout, checkAuth };
}
