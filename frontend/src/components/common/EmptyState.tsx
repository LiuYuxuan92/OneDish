/**
 * 简家厨 - 空状态组件
 * 用于列表为空、搜索无结果等场景的优雅展示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

// ============================================
// 类型定义
// ============================================

/** 空状态类型 */
export type EmptyStateType = 
  | 'no-data'        // 无数据
  | 'no-result'      // 搜索无结果
  | 'no-favorite'    // 无收藏
  | 'no-plan'        // 无计划
  | 'no-shopping'    // 购物清单为空
  | 'no-inventory'   // 食材库存为空
  | 'error'          // 错误状态
  | 'custom';        // 自定义

export interface EmptyStateProps {
  /** 空状态类型 */
  type?: EmptyStateType;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 标题文字 */
  title?: string;
  /** 描述文字 */
  description?: string;
  /** 按钮文字 */
  buttonText?: string;
  /** 按钮点击事件 */
  onButtonPress?: () => void;
  /** 自定义样式 */
  style?: ViewStyle;
  /** 是否显示按钮 */
  showButton?: boolean;
}

// ============================================
// 空状态配置
// ============================================

const emptyStateConfig: Record<EmptyStateType, {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
}> = {
  'no-data': {
    icon: '📭',
    title: '暂无数据',
    description: '这里还没有内容，敬请期待',
    buttonText: '',
  },
  'no-result': {
    icon: '🔍',
    title: '未找到相关结果',
    description: '试试其他关键词或筛选条件',
    buttonText: '清除搜索',
  },
  'no-favorite': {
    icon: '❤️',
    title: '还没有收藏',
    description: '收藏你喜欢的菜谱，方便下次查看',
    buttonText: '浏览菜谱',
  },
  'no-plan': {
    icon: '📅',
    title: '本周还没有计划',
    description: '添加餐食计划，让做饭更有条理',
    buttonText: '添加计划',
  },
  'no-shopping': {
    icon: '🛒',
    title: '购物清单是空的',
    description: '从菜谱中添加食材到购物清单',
    buttonText: '浏览菜谱',
  },
  'no-inventory': {
    icon: '🥕',
    title: '还没有食材',
    description: '添加你家厨房的食材，方便搭配菜谱',
    buttonText: '添加食材',
  },
  'error': {
    icon: '😵',
    title: '出错了',
    description: '请稍后重试或联系客服',
    buttonText: '重试',
  },
  'custom': {
    icon: '📭',
    title: '',
    description: '',
    buttonText: '',
  },
};

// ============================================
// EmptyState 组件
// ============================================

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  icon,
  title,
  description,
  buttonText,
  onButtonPress,
  style,
  showButton = true,
}) => {
  const config = emptyStateConfig[type];

  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayButtonText = buttonText ?? config.buttonText;
  const displayIcon = icon ?? config.icon;

  const shouldShowButton = showButton && !!displayButtonText && !!onButtonPress;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {typeof displayIcon === 'string' ? (
          <Text style={styles.iconText}>{displayIcon}</Text>
        ) : (
          displayIcon
        )}
      </View>
      
      <Text style={styles.title}>{displayTitle}</Text>
      
      {displayDescription ? (
        <Text style={styles.description}>{displayDescription}</Text>
      ) : null}
      
      {shouldShowButton && (
        <TouchableOpacity
          style={styles.button}
          onPress={onButtonPress}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{displayButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// EmptyStateList - 列表空状态
// ============================================

export interface EmptyStateListProps {
  /** 空状态类型 */
  type: EmptyStateType;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 按钮文字 */
  buttonText?: string;
  /** 按钮点击 */
  onButtonPress?: () => void;
  /** 自定义样式 */
  style?: ViewStyle;
}

export const EmptyStateList: React.FC<EmptyStateListProps> = ({
  type,
  title,
  description,
  buttonText,
  onButtonPress,
  style,
}) => {
  return (
    <View style={[styles.listContainer, style]}>
      <EmptyState
        type={type}
        title={title}
        description={description}
        buttonText={buttonText}
        onButtonPress={onButtonPress}
      />
    </View>
  );
};

// ============================================
// EmptyStateInline - 内联空状态（用于表单等）
// ============================================

export interface EmptyStateInlineProps {
  /** 图标 */
  icon: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 点击事件 */
  onPress?: () => void;
}

export const EmptyStateInline: React.FC<EmptyStateInlineProps> = ({
  icon,
  title,
  description,
  onPress,
}) => {
  const content = (
    <View style={styles.inlineContainer}>
      <Text style={styles.inlineIcon}>{icon}</Text>
      <View style={styles.inlineContent}>
        <Text style={styles.inlineTitle}>{title}</Text>
        {description && (
          <Text style={styles.inlineDescription}>{description}</Text>
        )}
      </View>
      <Text style={styles.inlineArrow}>›</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  buttonText: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  inlineIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  inlineContent: {
    flex: 1,
  },
  inlineTitle: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  inlineDescription: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  inlineArrow: {
    fontSize: 24,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm,
  },
});

export default EmptyState;
