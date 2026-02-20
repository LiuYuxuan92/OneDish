/**
 * 简家厨 - 多主题配置
 * 支持：温暖橙、暗色、清新绿、复古风
 */

import type { ColorsType, TypographyType, SpacingType, BorderRadiusType, ShadowsType, AnimationType, ZIndexType, SizingType } from './theme';

// ============================================
// 主题类型定义
// ============================================

export type ThemeMode = 'warm' | 'dark' | 'fresh' | 'vintage';

export interface Theme {
  name: string;
  mode: ThemeMode;
  Colors: ColorsType;
  Typography: TypographyType;
  Spacing: SpacingType;
  BorderRadius: BorderRadiusType;
  Shadows: ShadowsType;
  Animation: AnimationType;
  ZIndex: ZIndexType;
  Sizing: SizingType;
}

// ============================================
// 主题1: 温暖橙 (默认)
// ============================================
const WarmColors = {
  primary: {
    50: '#FFF5EB',
    100: '#FFE6D1',
    200: '#FFC9A3',
    300: '#FFA375',
    400: '#FF7D4A',
    500: '#FF8C42',
    600: '#E66E1F',
    700: '#CC5A14',
    800: '#A34710',
    900: '#7A350C',
    main: '#FF8C42',
    light: '#FFB77D',
    dark: '#E66E1F',
  },
  secondary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#FDFCFA',
    gray100: '#F7F5F2',
    gray200: '#EDE9E4',
    gray300: '#D9D4CC',
    gray400: '#B8B2A7',
    gray500: '#9A9184',
    gray600: '#7A7268',
    gray700: '#5C564F',
    gray800: '#3D3A36',
    gray900: '#1F1D1B',
  },
  functional: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    successLight: '#E8F5E9',
    warningLight: '#FFF3E0',
    errorLight: '#FFEBEE',
    infoLight: '#E3F2FD',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#FFF8F0',
    tertiary: '#FDF6ED',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: '#1F1D1B',
    secondary: '#5C564F',
    tertiary: '#9A9184',
    disabled: '#B8B2A7',
    inverse: '#FFFFFF',
    link: '#FF8C42',
  },
  border: {
    light: '#EDE9E4',
    default: '#D9D4CC',
    dark: '#B8B2A7',
  },
  food: {
    vegetable: '#66BB6A',
    meat: '#EF5350',
    grain: '#FFCA28',
    dairy: '#42A5F5',
    fruit: '#FFA726',
    seasoning: '#8D6E63',
  },
};

// ============================================
// 主题2: 暗色
// ============================================
const DarkColors = {
  primary: {
    50: '#FFF5EB',
    100: '#FFE6D1',
    200: '#FFC9A3',
    300: '#FFA375',
    400: '#FF7D4A',
    500: '#FF8C42',
    600: '#E66E1F',
    700: '#CC5A14',
    800: '#A34710',
    900: '#7A350C',
    main: '#FF9F5A',
    light: '#FFB77D',
    dark: '#E66E1F',
  },
  secondary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
    main: '#66BB6A',
    light: '#81C784',
    dark: '#388E3C',
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#1A1A1A',
    gray100: '#242424',
    gray200: '#2D2D2D',
    gray300: '#3D3D3D',
    gray400: '#4D4D4D',
    gray500: '#6B6B6B',
    gray600: '#8A8A8A',
    gray700: '#A8A8A8',
    gray800: '#C9C9C9',
    gray900: '#E8E8E8',
  },
  functional: {
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#42A5F5',
    successLight: '#1B3D1E',
    warningLight: '#3D2E1A',
    errorLight: '#3D1F1F',
    infoLight: '#1A2D3D',
  },
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2A2A2A',
    card: '#242424',
    elevated: '#2D2D2D',
    scrim: 'rgba(0, 0, 0, 0.7)',
  },
  text: {
    primary: '#E8E8E8',
    secondary: '#A8A8A8',
    tertiary: '#6B6B6B',
    disabled: '#4D4D4D',
    inverse: '#121212',
    link: '#FF9F5A',
  },
  border: {
    light: '#2D2D2D',
    default: '#3D3D3D',
    dark: '#4D4D4D',
  },
  food: {
    vegetable: '#66BB6A',
    meat: '#EF5350',
    grain: '#FFCA28',
    dairy: '#42A5F5',
    fruit: '#FFA726',
    seasoning: '#8D6E63',
  },
};

// ============================================
// 主题3: 清新绿
// ============================================
const FreshColors = {
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#43A047',
    600: '#388E3C',
    700: '#2E7D32',
    800: '#256427',
    900: '#1B4B1C',
    main: '#43A047',
    light: '#66BB6A',
    dark: '#2E7D32',
  },
  secondary: {
    50: '#E0F7FA',
    100: '#B2EBF2',
    200: '#80DEEA',
    300: '#4DD0E1',
    400: '#26C6DA',
    500: '#00BCD4',
    600: '#00ACC1',
    700: '#0097A7',
    800: '#00838F',
    900: '#006064',
    main: '#00BCD4',
    light: '#4DD0E1',
    dark: '#0097A7',
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#FAFDFB',
    gray100: '#F4F9F4',
    gray200: '#E8F2E8',
    gray300: '#D1E4D1',
    gray400: '#B0CDB0',
    gray500: '#8BB58B',
    gray600: '#6B9B6B',
    gray700: '#4E804E',
    gray800: '#366436',
    gray900: '#1F3B1F',
  },
  functional: {
    success: '#43A047',
    warning: '#FFA000',
    error: '#D32F2F',
    info: '#0288D1',
    successLight: '#E8F5E9',
    warningLight: '#FFF8E1',
    errorLight: '#FFEBEE',
    infoLight: '#E1F5FE',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F1F8F4',
    tertiary: '#E8F5E9',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: '#1B3B1F',
    secondary: '#4E804E',
    tertiary: '#8BB58B',
    disabled: '#B0CDB0',
    inverse: '#FFFFFF',
    link: '#43A047',
  },
  border: {
    light: '#E8F2E8',
    default: '#D1E4D1',
    dark: '#B0CDB0',
  },
  food: {
    vegetable: '#66BB6A',
    meat: '#EF5350',
    grain: '#FFCA28',
    dairy: '#42A5F5',
    fruit: '#FFA726',
    seasoning: '#8D6E63',
  },
};

// ============================================
// 主题4: 复古风
// ============================================
const VintageColors = {
  primary: {
    50: '#FDF3E7',
    100: '#FAE2C8',
    200: '#F5CEA3',
    300: '#EFB97A',
    400: '#E9A257',
    500: '#D48B3E',
    600: '#B87333',
    700: '#9C5C2A',
    800: '#7E4922',
    900: '#60361A',
    main: '#B87333',
    light: '#D48B3E',
    dark: '#9C5C2A',
  },
  secondary: {
    50: '#F5F5DC',
    100: '#EBE8C8',
    200: '#DDD9AA',
    300: '#CDC68A',
    400: '#BDB670',
    500: '#A69A5A',
    600: '#8A7D4B',
    700: '#6E613D',
    800: '#554831',
    900: '#3D3025',
    main: '#A69A5A',
    light: '#CDC68A',
    dark: '#6E613D',
  },
  neutral: {
    white: '#FDFBF7',
    gray50: '#FDFBF7',
    gray100: '#F5F0E6',
    gray200: '#EBE4D6',
    gray300: '#DED4C2',
    gray400: '#CEC3AD',
    gray500: '#B8AA93',
    gray600: '#9C8C76',
    gray700: '#7D6E5D',
    gray800: '#5E5047',
    gray900: '#3E332D',
  },
  functional: {
    success: '#8B9A5B',
    warning: '#D4A03E',
    error: '#B85450',
    info: '#6B8E9F',
    successLight: '#F0F3E4',
    warningLight: '#F9F3E4',
    errorLight: '#F5E8E7',
    infoLight: '#E8EEF1',
  },
  background: {
    primary: '#FDFBF7',
    secondary: '#F5F0E6',
    tertiary: '#F0EBE0',
    card: '#FFFFFF',
    elevated: '#FDFBF7',
    scrim: 'rgba(62, 51, 45, 0.6)',
  },
  text: {
    primary: '#3E332D',
    secondary: '#6E613D',
    tertiary: '#9C8C76',
    disabled: '#CEC3AD',
    inverse: '#FDFBF7',
    link: '#B87333',
  },
  border: {
    light: '#EBE4D6',
    default: '#DED4C2',
    dark: '#CEC3AD',
  },
  food: {
    vegetable: '#8B9A5B',
    meat: '#B85450',
    grain: '#D4A03E',
    dairy: '#6B8E9F',
    fruit: '#C49058',
    seasoning: '#8B7355',
  },
};

// ============================================
// 导入原有 Typography 等配置
// ============================================
import { Typography, Spacing, BorderRadius, Shadows, Animation, ZIndex, Sizing } from './theme';

// ============================================
// 主题配置对象
// ============================================
export const themes: Record<ThemeMode, Theme> = {
  warm: {
    name: '温暖橙',
    mode: 'warm',
    Colors: WarmColors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animation,
    ZIndex,
    Sizing,
  },
  dark: {
    name: '暗夜模式',
    mode: 'dark',
    Colors: DarkColors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animation,
    ZIndex,
    Sizing,
  },
  fresh: {
    name: '清新绿',
    mode: 'fresh',
    Colors: FreshColors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animation,
    ZIndex,
    Sizing,
  },
  vintage: {
    name: '复古风',
    mode: 'vintage',
    Colors: VintageColors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animation,
    ZIndex,
    Sizing,
  },
};

// ============================================
// 主题预览数据
// ============================================
export const themePreviews = [
  {
    mode: 'warm' as ThemeMode,
    name: '温暖橙',
    description: '温馨暖色调，食欲满满',
    primaryColor: '#FF8C42',
    backgroundColor: '#FFF8F0',
  },
  {
    mode: 'dark' as ThemeMode,
    name: '暗夜模式',
    description: '深色护眼，夜间更舒适',
    primaryColor: '#FF9F5A',
    backgroundColor: '#121212',
  },
  {
    mode: 'fresh' as ThemeMode,
    name: '清新绿',
    description: '清新自然，健康生活',
    primaryColor: '#43A047',
    backgroundColor: '#F1F8F4',
  },
  {
    mode: 'vintage' as ThemeMode,
    name: '复古风',
    description: '怀旧色调，品味时光',
    primaryColor: '#B87333',
    backgroundColor: '#FDFBF7',
  },
];

export default themes;
