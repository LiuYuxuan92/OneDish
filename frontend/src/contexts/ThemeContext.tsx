/**
 * 简家厨 - 主题上下文
 * 提供全局主题切换功能
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, Theme, ThemeMode, themePreviews } from '../styles/themes';

// 存储键名
const THEME_STORAGE_KEY = '@app_theme_mode';

// ============================================
// Context 类型定义
// ============================================
interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themePreviews: typeof themePreviews;
  isDark: boolean;
}

// ============================================
// 创建 Context
// ============================================
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// Provider 组件
// ============================================
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('warm');
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载保存的主题
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'warm' || savedMode === 'dark' || savedMode === 'fresh' || savedMode === 'vintage')) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('加载主题失败:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // 设置主题并保存
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('保存主题失败:', error);
    }
  };

  // 当前主题
  const theme = themes[themeMode];
  const isDark = themeMode === 'dark';

  // 如果未加载完成，显示空内容
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        themePreviews,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// 自定义 Hook
// ============================================
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用');
  }
  return context;
}

// ============================================
// 便捷 Hook: 获取主题颜色
// ============================================
export function useColors() {
  const { theme } = useTheme();
  return theme.Colors;
}

// ============================================
// 便捷 Hook: 获取主题间距
// ============================================
export function useSpacing() {
  const { theme } = useTheme();
  return theme.Spacing;
}

// ============================================
// 便捷 Hook: 获取排版样式
// ============================================
export function useTypography() {
  const { theme } = useTheme();
  return theme.Typography;
}

export default ThemeContext;
