/**
 * 简家厨 - 导航头部共享配置
 * 统一 stack navigator 的头部样式，跟随主题颜色
 */

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Theme } from '../styles/themes';
import { Typography } from '../styles/theme';

/**
 * 生成主题一致的 Stack Navigator screenOptions
 */
export function buildHeaderOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    headerStyle: {
      backgroundColor: theme.Colors.background.primary,
    },
    headerTintColor: theme.Colors.primary.main,
    headerTitleStyle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: theme.Colors.text.primary,
    },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    contentStyle: {
      backgroundColor: theme.Colors.background.secondary,
    },
  };
}
