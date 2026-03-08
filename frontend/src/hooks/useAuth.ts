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
const USER_INFO_KEY = 'user_info';

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
  async getUserInfo(): Promise<any | null> {
    const raw = isWeb ? (webStorage?.getItem(USER_INFO_KEY) || null) : await AsyncStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async setUserInfo(user: any): Promise<void> {
    const value = JSON.stringify(user || null);
    if (isWeb) {
      webStorage?.setItem(USER_INFO_KEY, value);
    } else {
      await AsyncStorage.setItem(USER_INFO_KEY, value);
    }
  },
  async removeToken(): Promise<void> {
    if (isWeb) {
      webStorage?.removeItem(TOKEN_KEY);
      webStorage?.removeItem(REFRESH_TOKEN_KEY);
      webStorage?.removeItem(USER_INFO_KEY);
    } else {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY]);
    }
  },
};

// 共享认证状态，避免每个 useAuth 实例各自维护导致登录后界面不切换
let authState = {
  isAuthenticated: false,
  isLoading: true,
  user: null as any,
  isGuest: false,
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
    const payload = response.data?.data;
    const token = payload?.token;
    if (token) {
      await tokenStorage.setToken(token);
      await tokenStorage.setUserInfo(payload?.user || null);
      emitAuthState({ user: payload?.user || null, isGuest: Boolean(payload?.user?.is_guest) });
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
      const user = await tokenStorage.getUserInfo();
      if (token) {
        emitAuthState({ isAuthenticated: true, user, isGuest: Boolean(user?.is_guest) });
      } else if (isWeb) {
        // Web平台无token时，自动游客登录
        const guestToken = await guestLoginForAuth();
        emitAuthState({ isAuthenticated: !!guestToken });
      } else {
        emitAuthState({ isAuthenticated: false, user: null, isGuest: false });
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      emitAuthState({ isAuthenticated: false });
    } finally {
      emitAuthState({ isLoading: false });
    }
  }

  async function login(token: string, refreshToken?: string, user?: any): Promise<void> {
    await tokenStorage.setToken(token);
    if (user) {
      await tokenStorage.setUserInfo(user);
    }
    if (refreshToken) {
      if (isWeb) {
        webStorage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
    emitAuthState({ isAuthenticated: true, isLoading: false, user: user || state.user, isGuest: Boolean(user?.is_guest) });
  }

  async function logout(): Promise<void> {
    await tokenStorage.removeToken();
    emitAuthState({ isAuthenticated: false, isLoading: false, user: null, isGuest: false });
  }

  return {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    isGuest: state.isGuest,
    login,
    logout,
    checkAuth,
  };
}
