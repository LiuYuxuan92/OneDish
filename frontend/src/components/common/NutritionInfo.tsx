/**
 * 简家厨 - 营养分析展示组件
 * 展示菜谱的营养成分信息
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

// ============================================
// 类型定义
// ============================================

/** 营养素类型 */
export interface NutritionItem {
  /** 营养素名称 */
  name: string;
  /** 营养素单位 */
  unit: string;
  /** 含量 */
  value: number;
  /** 每日推荐摄入量的百分比 */
  dailyPercent?: number;
  /** 图标 */
  icon?: string;
  /** 颜色 */
  color?: string;
}

/** 营养信息 */
export interface NutritionInfo {
  /** 热量 (kcal) */
  calories?: number;
  /** 蛋白质 (g) */
  protein?: number;
  /** 碳水化合物 (g) */
  carbs?: number;
  /** 脂肪 (g) */
  fat?: number;
  /** 膳食纤维 (g) */
  fiber?: number;
  /** 维生素A (μg) */
  vitaminA?: number;
  /** 维生素C (mg) */
  vitaminC?: number;
  /** 钙 (mg) */
  calcium?: number;
  /** 铁 (mg) */
  iron?: number;
  /** 锌 (mg) */
  zinc?: number;
}

export interface NutritionInfoCardProps {
  /** 营养信息数据 */
  nutrition: NutritionInfo;
  /** 是否为宝宝版本 */
  isBaby?: boolean;
  /** 是否展开详情 */
  expanded?: boolean;
  /** 展开/收起回调 */
  onToggleExpand?: () => void;
  /** 份量信息 */
  servingSize?: string;
}

// ============================================
// 营养素配置
// ============================================

// 中国居民膳食营养素参考摄入量（DRIs）- 成人
const ADULT_DRI = {
  calories: 2000,
  protein: 60,
  carbs: 300,
  fat: 60,
  fiber: 25,
  vitaminA: 800,
  vitaminC: 100,
  calcium: 800,
  iron: 20,
  zinc: 12,
};

// 中国居民膳食营养素参考摄入量（DRIs）- 1-3岁幼儿
const BABY_DRI = {
  calories: 1100,
  protein: 20,
  carbs: 120,
  fat: 35,
  fiber: 10,
  vitaminA: 300,
  vitaminC: 40,
  calcium: 600,
  iron: 9,
  zinc: 4,
};

// 营养素颜色
const NUTRITION_COLORS = {
  calories: '#FF8C42',    // 橙色
  protein: '#EF5350',     // 红色
  carbs: '#FFCA28',       // 黄色
  fat: '#42A5F5',         // 蓝色
  fiber: '#66BB6A',       // 绿色
  vitamins: '#AB47BC',     // 紫色
  minerals: '#26A69A',     // 青色
};

// 营养素图标
const NUTRITION_ICONS = {
  calories: '🔥',
  protein: '💪',
  carbs: '🍞',
  fat: '🧈',
  fiber: '🥬',
  vitaminA: '👁️',
  vitaminC: '🍊',
  calcium: '🥛',
  iron: '🔩',
  zinc: '⚡',
};

// ============================================
// 工具函数
// ============================================

/**
 * 获取推荐的DRI值
 */
export const getDailyValue = (key: keyof typeof ADULT_DRI, isBaby: boolean = false): number => {
  return isBaby ? BABY_DRI[key] : ADULT_DRI[key];
};

/**
 * 计算营养素占每日推荐摄入量的百分比
 */
export const calculateDailyPercent = (
  value: number,
  key: keyof typeof ADULT_DRI,
  isBaby: boolean = false
): number => {
  const dailyValue = getDailyValue(key, isBaby);
  return Math.round((value / dailyValue) * 100);
};

/**
 * 格式化营养素数值
 */
export const formatNutritionValue = (value: number, unit: string): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}g`;
  }
  return `${Math.round(value)}${unit}`;
};

// ============================================
// 营养标签组件
// ============================================

export interface NutritionTagProps {
  /** 营养素名称 */
  name: string;
  /** 含量值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 每日推荐百分比 */
  dailyPercent?: number;
  /** 图标 */
  icon?: string;
  /** 颜色 */
  color?: string;
}

export const NutritionTag: React.FC<NutritionTagProps> = ({
  name,
  value,
  unit,
  dailyPercent,
  icon,
  color = Colors.primary.main,
}) => {
  return (
    <View style={styles.tagContainer}>
      <View style={[styles.tagIcon, { backgroundColor: `${color}20` }]}>
        <Text style={styles.tagIconText}>{icon || '📊'}</Text>
      </View>
      <View style={styles.tagContent}>
        <Text style={styles.tagValue}>{value}{unit}</Text>
        <Text style={styles.tagName}>{name}</Text>
      </View>
      {dailyPercent !== undefined && (
        <View style={[styles.tagPercent, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.tagPercentText, { color }]}>{dailyPercent}%</Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// 营养进度条组件
// ============================================

export interface NutritionProgressBarProps {
  /** 营养素名称 */
  name: string;
  /** 当前值 */
  value: number;
  /** 目标值（每日推荐量） */
  target: number;
  /** 单位 */
  unit: string;
  /** 颜色 */
  color?: string;
  /** 图标 */
  icon?: string;
}

export const NutritionProgressBar: React.FC<NutritionProgressBarProps> = ({
  name,
  value,
  target,
  unit,
  color = Colors.primary.main,
  icon,
}) => {
  const percent = Math.min(Math.round((value / target) * 100), 100);
  const isOver = value > target;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabel}>
          {icon && <Text style={styles.progressIcon}>{icon}</Text>}
          <Text style={styles.progressName}>{name}</Text>
        </View>
        <Text style={styles.progressValue}>
          {value}{unit} / {target}{unit}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: isOver ? Colors.functional.warning : color,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressPercent, isOver && styles.progressPercentWarning]}>
        {percent}% {isOver && '(过量)'}
      </Text>
    </View>
  );
};

// ============================================
// 营养信息卡片主组件
// ============================================

export const NutritionInfoCard: React.FC<NutritionInfoCardProps> = ({
  nutrition,
  isBaby = false,
  expanded = false,
  onToggleExpand,
  servingSize = '每份',
}) => {
  // 构建主要营养素列表
  const mainNutrients: NutritionItem[] = [
    {
      name: '热量',
      unit: 'kcal',
      value: nutrition.calories || 0,
      dailyPercent: calculateDailyPercent(nutrition.calories || 0, 'calories', isBaby),
      icon: NUTRITION_ICONS.calories,
      color: NUTRITION_COLORS.calories,
    },
    {
      name: '蛋白质',
      unit: 'g',
      value: nutrition.protein || 0,
      dailyPercent: calculateDailyPercent(nutrition.protein || 0, 'protein', isBaby),
      icon: NUTRITION_ICONS.protein,
      color: NUTRITION_COLORS.protein,
    },
    {
      name: '碳水',
      unit: 'g',
      value: nutrition.carbs || 0,
      dailyPercent: calculateDailyPercent(nutrition.carbs || 0, 'carbs', isBaby),
      icon: NUTRITION_ICONS.carbs,
      color: NUTRITION_COLORS.carbs,
    },
    {
      name: '脂肪',
      unit: 'g',
      value: nutrition.fat || 0,
      dailyPercent: calculateDailyPercent(nutrition.fat || 0, 'fat', isBaby),
      icon: NUTRITION_ICONS.fat,
      color: NUTRITION_COLORS.fat,
    },
  ];

  // 构建维生素列表
  const vitamins: NutritionItem[] = [
    {
      name: '维生素A',
      unit: 'μg',
      value: nutrition.vitaminA || 0,
      dailyPercent: calculateDailyPercent(nutrition.vitaminA || 0, 'vitaminA', isBaby),
      icon: NUTRITION_ICONS.vitaminA,
      color: NUTRITION_COLORS.vitamins,
    },
    {
      name: '维生素C',
      unit: 'mg',
      value: nutrition.vitaminC || 0,
      dailyPercent: calculateDailyPercent(nutrition.vitaminC || 0, 'vitaminC', isBaby),
      icon: NUTRITION_ICONS.vitaminC,
      color: NUTRITION_COLORS.vitamins,
    },
  ];

  // 构建矿物质列表
  const minerals: NutritionItem[] = [
    {
      name: '钙',
      unit: 'mg',
      value: nutrition.calcium || 0,
      dailyPercent: calculateDailyPercent(nutrition.calcium || 0, 'calcium', isBaby),
      icon: NUTRITION_ICONS.calcium,
      color: NUTRITION_COLORS.minerals,
    },
    {
      name: '铁',
      unit: 'mg',
      value: nutrition.iron || 0,
      dailyPercent: calculateDailyPercent(nutrition.iron || 0, 'iron', isBaby),
      icon: NUTRITION_ICONS.iron,
      color: NUTRITION_COLORS.minerals,
    },
    {
      name: '锌',
      unit: 'mg',
      value: nutrition.zinc || 0,
      dailyPercent: calculateDailyPercent(nutrition.zinc || 0, 'zinc', isBaby),
      icon: NUTRITION_ICONS.zinc,
      color: NUTRITION_COLORS.minerals,
    },
  ];

  // 检查是否有营养数据
  const hasNutrition = Object.values(nutrition).some(v => v && v > 0);

  if (!hasNutrition) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>暂无营养信息</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <Text style={styles.titleIcon}>📊</Text>
          <Text style={styles.title}>营养信息</Text>
          {isBaby && (
            <View style={styles.babyBadge}>
              <Text style={styles.babyBadgeText}>宝宝版</Text>
            </View>
          )}
        </View>
        <Text style={styles.servingSize}>{servingSize}</Text>
      </TouchableOpacity>

      {/* 主要营养素 */}
      <View style={styles.mainNutrients}>
        {mainNutrients.map((item, index) => (
          <View key={index} style={styles.nutrientItem}>
            <NutritionTag {...item} />
          </View>
        ))}
      </View>

      {/* 展开的详细信息 */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* 维生素 */}
          <Text style={styles.sectionTitle}>维生素</Text>
          <View style={styles.nutrientGrid}>
            {vitamins.map((item, index) => (
              <View key={index} style={styles.nutrientGridItem}>
                <NutritionTag {...item} />
              </View>
            ))}
          </View>

          {/* 矿物质 */}
          <Text style={styles.sectionTitle}>矿物质</Text>
          <View style={styles.nutrientGrid}>
            {minerals.map((item, index) => (
              <View key={index} style={styles.nutrientGridItem}>
                <NutritionTag {...item} />
              </View>
            ))}
          </View>

          {/* 详细进度条 */}
          <Text style={styles.sectionTitle}>摄入参考</Text>
          {mainNutrients.map((item, index) => (
            <NutritionProgressBar
              key={index}
              name={item.name}
              value={item.value}
              target={getDailyValue(
                item.name === '热量' ? 'calories' :
                item.name === '蛋白质' ? 'protein' :
                item.name === '碳水' ? 'carbs' : 'fat',
                isBaby
              )}
              unit={item.unit}
              color={item.color}
              icon={item.icon}
            />
          ))}
        </View>
      )}

      {/* 展开/收起按钮 */}
      {onToggleExpand && (
        <TouchableOpacity style={styles.toggleButton} onPress={onToggleExpand}>
          <Text style={styles.toggleButtonText}>
            {expanded ? '收起详情' : '查看详情'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.heading.h5,
    color: Colors.text.primary,
  },
  babyBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  babyBadgeText: {
    ...Typography.body.caption,
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  servingSize: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  mainNutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutrientItem: {
    width: '48%',
  },
  expandedContent: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  sectionTitle: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nutrientGridItem: {
    width: '48%',
  },
  progressContainer: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  progressName: {
    ...Typography.body.caption,
    color: Colors.text.primary,
  },
  progressValue: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    ...Typography.body.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
    textAlign: 'right',
  },
  progressPercentWarning: {
    color: Colors.functional.warning,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  toggleButtonText: {
    ...Typography.body.regular,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  // Tag styles
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  tagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  tagIconText: {
    fontSize: 16,
  },
  tagContent: {
    flex: 1,
  },
  tagValue: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  tagName: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
  },
  tagPercent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tagPercentText: {
    ...Typography.body.caption,
    fontWeight: Typography.fontWeight.medium,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
});

export default NutritionInfoCard;
