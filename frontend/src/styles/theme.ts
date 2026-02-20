/**
 * 简家厨 - 设计系统主题配置
 * 遵循温馨活泼 + 现代简约的设计原则
 */

// ============================================
// 类型定义
// ============================================
export type ColorsType = typeof Colors;
export type TypographyType = typeof Typography;
export type SpacingType = typeof Spacing;
export type BorderRadiusType = typeof BorderRadius;
export type ShadowsType = typeof Shadows;
export type AnimationType = typeof Animation;
export type ZIndexType = typeof ZIndex;
export type SizingType = typeof Sizing;

// ============================================
// 颜色系统
// ============================================
export const Colors = {
  // 主色调 - 温暖橙色系
  primary: {
    50: '#FFF5EB',
    100: '#FFE6D1',
    200: '#FFC9A3',
    300: '#FFA375',
    400: '#FF7D4A',
    500: '#FF8C42', // 品牌主色
    600: '#E66E1F',
    700: '#CC5A14',
    800: '#A34710',
    900: '#7A350C',
    main: '#FF8C42',
    light: '#FFB77D',
    dark: '#E66E1F',
  },

  // 辅助色 - 健康绿色系
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

  // 中性色 - 温暖灰调
  neutral: {
    white: '#FFFFFF',
    gray50: '#FDFCFA',  // 温暖的米白色
    gray100: '#F7F5F2', // 奶油色
    gray200: '#EDE9E4',
    gray300: '#D9D4CC',
    gray400: '#B8B2A7',
    gray500: '#9A9184',
    gray600: '#7A7268',
    gray700: '#5C564F',
    gray800: '#3D3A36',
    gray900: '#1F1D1B',
  },

  // 功能色
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

  // 背景色
  background: {
    primary: '#FFFFFF',
    secondary: '#FFF8F0',    // 温馨的奶白色
    tertiary: '#FDF6ED',     // 浅橙色背景
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },

  // 文字色
  text: {
    primary: '#1F1D1B',
    secondary: '#5C564F',
    tertiary: '#9A9184',
    disabled: '#B8B2A7',
    inverse: '#FFFFFF',
    link: '#FF8C42',
  },

  // 边框色
  border: {
    light: '#EDE9E4',
    default: '#D9D4CC',
    dark: '#B8B2A7',
  },

  // 食物相关色彩
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
// 字体系统
// ============================================
export const Typography = {
  // 字体家族
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    secondary: '"Nunito", "Quicksand", sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
  },

  // 字号系统
  fontSize: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // 字重
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // 行高
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // 字间距
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },

  // 标题样式预设
  heading: {
    h1: {
      fontSize: 30,
      fontWeight: '700' as const,
      lineHeight: 1.25,
      letterSpacing: -0.025,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 1.3,
      letterSpacing: -0.025,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 1.35,
      letterSpacing: -0.025,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 1.4,
      letterSpacing: -0.025,
    },
    h5: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 1.5,
      letterSpacing: -0.025,
    },
    h6: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 1.5,
      letterSpacing: -0.025,
    },
  },

  // 正文样式预设
  body: {
    large: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 1.6,
    },
    regular: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 1.6,
    },
    small: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },
  },
};

// ============================================
// 间距系统 (8px 基准)
// ============================================
export const Spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
  // 别名
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
  '5xl': 128,
};

// ============================================
// 圆角系统
// ============================================
export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// ============================================
// 阴影系统
// ============================================
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 0,
  },
};

// ============================================
// 动画配置
// ============================================
export const Animation = {
  // 持续时间
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  // 缓动函数
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // 预设动画
  preset: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      duration: 250,
      easing: 'ease-out',
    },
    slideUp: {
      initial: { opacity: 0, transform: 'translateY(10px)' },
      animate: { opacity: 1, transform: 'translateY(0)' },
      duration: 300,
      easing: 'ease-out',
    },
    slideDown: {
      initial: { opacity: 0, transform: 'translateY(-10px)' },
      animate: { opacity: 1, transform: 'translateY(0)' },
      duration: 300,
      easing: 'ease-out',
    },
    scale: {
      initial: { opacity: 0, transform: 'scale(0.95)' },
      animate: { opacity: 1, transform: 'scale(1)' },
      duration: 200,
      easing: 'spring',
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      duration: 2000,
      easing: 'ease-in-out',
    },
    skeleton: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
      duration: 1500,
      easing: 'linear',
    },
  },
};

// ============================================
// 断点系统
// ============================================
export const Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ============================================
// Z-Index 层级
// ============================================
export const ZIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// ============================================
// 尺寸规范
// ============================================
export const Sizing = {
  // 触摸目标最小尺寸
  touchTarget: {
    min: 44,
    comfortable: 48,
  },

  // 图标尺寸
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  },

  // 按钮尺寸
  button: {
    xs: { height: 24, padding: 8, fontSize: 12 },
    sm: { height: 32, padding: 12, fontSize: 12 },
    md: { height: 40, padding: 16, fontSize: 14 },
    lg: { height: 48, padding: 20, fontSize: 16 },
    xl: { height: 56, padding: 24, fontSize: 18 },
  },

  // 输入框尺寸
  input: {
    sm: { height: 32, padding: 8, fontSize: 12 },
    md: { height: 40, padding: 12, fontSize: 14 },
    lg: { height: 48, padding: 16, fontSize: 16 },
  },

  // 卡片尺寸
  card: {
    sm: { padding: 12, borderRadius: 8 },
    md: { padding: 16, borderRadius: 12 },
    lg: { padding: 24, borderRadius: 16 },
  },

  // 容器最大宽度
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
};

// ============================================
// 主题对象
// ============================================
export const theme = {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animation,
  Breakpoints,
  ZIndex,
  Sizing,
};

export default theme;
