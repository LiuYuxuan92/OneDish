// @ts-nocheck
/**
 * 简家厨 - 骨架屏组件
 * 提供多种形状的加载占位效果，提升加载感知的速度
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

// ============================================
// 类型定义
// ============================================

export type SkeletonShape = 'text' | 'circle' | 'rect' | 'card' | 'avatar';

export interface SkeletonProps {
  /** 骨架形状 */
  shape?: SkeletonShape;
  /** 自定义宽度 */
  width?: number | string;
  /** 自定义高度 */
  height?: number;
  /** 圆角大小 */
  borderRadius?: number;
  /** 动画时长(ms) */
  duration?: number;
  /** 是否有渐变动画 */
  animated?: boolean;
  /** 样式 */
  style?: ViewStyle;
  /** 子元素（用于复杂布局） */
  children?: React.ReactNode;
}

// ============================================
// Skeleton 组件
// ============================================

export const Skeleton: React.FC<SkeletonProps> = ({
  shape = 'text',
  width,
  height,
  borderRadius,
  duration = 1500,
  animated = true,
  style,
  children,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animated, duration, animatedValue]);

  const getDefaultDimensions = (): { width: number; height: number } => {
    switch (shape) {
      case 'text':
        return { width: width || '100%', height: 16 };
      case 'circle':
        return { width: width || 48, height: width || 48 };
      case 'rect':
        return { width: width || 100, height: height || 100 };
      case 'card':
        return { width: width || screenWidth - 32, height: height || 180 };
      case 'avatar':
        return { width: width || 40, height: height || 40 };
      default:
        return { width: width || '100%', height: height || 16 };
    }
  };

  const getBorderRadius = (): number => {
    if (borderRadius !== undefined) return borderRadius;
    switch (shape) {
      case 'circle':
      case 'avatar':
        return BorderRadius.full;
      case 'card':
        return BorderRadius.lg;
      case 'text':
        return BorderRadius.sm;
      default:
        return BorderRadius.sm;
    }
  };

  const defaultDims = getDefaultDimensions();

  const animatedStyle = animated
    ? {
        backgroundColor: Colors.neutral.gray100,
      }
    : {
        backgroundColor: Colors.neutral.gray200,
      };

  if (children) {
    return (
      <View style={[styles.container, style]}>
        <Animated.View
          style={[
            styles.skeleton,
            {
              width: width ?? defaultDims.width,
              height: height ?? defaultDims.height,
              borderRadius: getBorderRadius(),
              ...animatedStyle,
            },
            animated && {
              opacity: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.7],
              }),
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width ?? defaultDims.width,
          height: height ?? defaultDims.height,
          borderRadius: getBorderRadius(),
          ...animatedStyle,
        },
        animated && {
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
          }),
        },
        style,
      ]}
    />
  );
};

// ============================================
// SkeletonText - 多行文本骨架
// ============================================

export interface SkeletonTextProps {
  /** 行数 */
  lines?: number;
  /** 最后一行宽度（百分比） */
  lastLineWidth?: number;
  /** 行高 */
  lineHeight?: number;
  /** 行间距 */
  spacing?: number;
  /** 动画时长 */
  duration?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = 60,
  lineHeight = 16,
  spacing = 8,
  duration = 1500,
}) => {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          shape="text"
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          duration={duration}
          style={index > 0 ? { marginTop: spacing } : undefined}
        />
      ))}
    </View>
  );
};

// ============================================
// SkeletonCard - 卡片骨架
// ============================================

export interface SkeletonCardProps {
  /** 是否显示图片区域 */
  showImage?: boolean;
  /** 图片高度 */
  imageHeight?: number;
  /** 是否显示底部信息 */
  showFooter?: boolean;
  /** 动画时长 */
  duration?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  imageHeight = 140,
  showFooter = true,
  duration = 1500,
}) => {
  return (
    <View style={styles.cardContainer}>
      {showImage && (
        <Skeleton
          shape="rect"
          width="100%"
          height={imageHeight}
          borderRadius={0}
          duration={duration}
          style={styles.cardImage}
        />
      )}
      <View style={styles.cardContent}>
        <Skeleton
          shape="text"
          width="70%"
          height={20}
          duration={duration}
          style={styles.cardTitle}
        />
        <SkeletonText lines={2} duration={duration} />
        {showFooter && (
          <View style={styles.cardFooter}>
            <Skeleton shape="circle" width={24} height={24} duration={duration} />
            <Skeleton
              shape="text"
              width={80}
              height={12}
              duration={duration}
              style={{ marginLeft: 8 }}
            />
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================
// SkeletonList - 列表骨架
// ============================================

export interface SkeletonListProps {
  /** 列表项数量 */
  count?: number;
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 动画时长 */
  duration?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  showAvatar = true,
  duration = 1500,
}) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          {showAvatar && (
            <Skeleton
              shape="avatar"
              width={48}
              height={48}
              duration={duration}
            />
          )}
          <View style={styles.listItemContent}>
            <Skeleton
              shape="text"
              width="60%"
              height={16}
              duration={duration}
            />
            <Skeleton
              shape="text"
              width="40%"
              height={12}
              duration={duration}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================
// SkeletonRecipeCard - 菜谱卡片骨架（首页推荐）
// ============================================

export interface SkeletonRecipeCardProps {
  /** 卡片数量 */
  count?: number;
  /** 是否显示横向卡片（推荐） */
  horizontal?: boolean;
  /** 动画时长 */
  duration?: number;
}

export const SkeletonRecipeCard: React.FC<SkeletonRecipeCardProps> = ({
  count = 3,
  horizontal = true,
  duration = 1500,
}) => {
  if (horizontal) {
    // 横向卡片（首页今日推荐）
    return (
      <View style={styles.recipeHorizontalContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={styles.recipeHorizontalItem}>
            <Skeleton
              shape="rect"
              width={140}
              height={100}
              borderRadius={BorderRadius.lg}
              duration={duration}
            />
            <Skeleton
              shape="text"
              width={120}
              height={14}
              duration={duration}
              style={{ marginTop: Spacing.sm }}
            />
            <Skeleton
              shape="text"
              width={80}
              height={12}
              duration={duration}
              style={{ marginTop: 4 }}
            />
          </View>
        ))}
      </View>
    );
  }

  // 纵向卡片（菜谱列表）
  return (
    <View style={styles.recipeListContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} showImage showFooter duration={duration} />
      ))}
    </View>
  );
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  skeleton: {
    backgroundColor: Colors.neutral.gray100,
  },
  textContainer: {
    width: '100%',
  },
  cardContainer: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  cardImage: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  listContainer: {
    width: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  listItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  recipeHorizontalContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
  },
  recipeHorizontalItem: {
    marginRight: Spacing.md,
  },
  recipeListContainer: {
    padding: Spacing.md,
  },
});

export default Skeleton;
