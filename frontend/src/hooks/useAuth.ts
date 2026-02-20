import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 存储键名
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Web平台使用localStorage，移动端使用AsyncStorage
const isWeb = Platform.OS === 'web';

const tokenStorage = {
  async getToken(): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },
  async removeToken(): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};

// Web平台游客登录
async function guestLoginForAuth(): Promise<string | null> {
  try {
    const baseUrl = 'http://localhost:3000/api/v1';
    const response = await axios.post(`${baseUrl}/auth/guest`);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        setIsAuthenticated(true);
      } else if (isWeb) {
        // Web平台无token时，自动游客登录
        const guestToken = await guestLoginForAuth();
        setIsAuthenticated(!!guestToken);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(token: string, refreshToken?: string): Promise<void> {
    await tokenStorage.setToken(token);
    if (refreshToken) {
      if (isWeb) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
    setIsAuthenticated(true);
  }

  async function logout(): Promise<void> {
    await tokenStorage.removeToken();
    setIsAuthenticated(false);
  }

  return { isAuthenticated, isLoading, login, logout };
}
