/**
 * 简家厨 - 宝宝月龄卡片组件
 * 显示宝宝月龄和适龄辅食建议
 * 支持6个精细阶段: 6-8m, 8-10m, 10-12m, 12-18m, 18-24m, 24-36m
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { BabyIcon } from './Icons';

// ============================================
// 月龄阶段定义（6阶段）
// ============================================

export type BabyStage =
  | 'newborn'           // 0-6个月新生儿
  | 'early'             // 6-8个月辅食初期
  | 'early_mid'         // 8-10个月辅食早期
  | 'mid'               // 10-12个月辅食中期
  | 'late'              // 12-18个月辅食后期
  | 'toddler_early'     // 18-24个月幼儿早期
  | 'toddler';          // 24-36个月幼儿期

export interface BabyAgeInfo {
  months: number;
  stage: BabyStage;
  stageName: string;
  description: string;
  texture: string;      // 食物质地要求
  suggestions: string[];
  foods: string[];
}

// 6阶段月龄数据
const babyStageData: Record<BabyStage, Omit<BabyAgeInfo, 'months'>> = {
  newborn: {
    stage: 'newborn',
    stageName: '新生儿期',
    description: '以母乳或配方奶为主',
    texture: '流质',
    suggestions: ['建议纯母乳喂养6个月', '无需添加辅食'],
    foods: ['母乳/配方奶'],
  },
  early: {
    stage: 'early',
    stageName: '辅食初期',
    description: '开始尝试单一食材的泥糊状食物',
    texture: '细腻泥状',
    suggestions: ['从单一食材开始', '每种食物尝试3-5天', '注意观察过敏反应'],
    foods: ['高铁米粉', '南瓜泥', '胡萝卜泥', '苹果泥', '香蕉泥'],
  },
  early_mid: {
    stage: 'early_mid',
    stageName: '辅食早期',
    description: '可以尝试混合食材和稍粗的质地',
    texture: '稍粗泥状',
    suggestions: ['引入蛋白质食物', '锻炼咀嚼能力', '增加食物种类'],
    foods: ['鱼肉泥', '鸡肉泥', '蛋黄', '烂面条', '蔬菜粥'],
  },
  mid: {
    stage: 'mid',
    stageName: '辅食中期',
    description: '碎末状食物，训练咀嚼能力',
    texture: '碎末状',
    suggestions: ['增加食材种类', '注意软烂程度', '培养自主进食'],
    foods: ['小馄饨', '软米饭', '蒸糕', '肉末蔬菜', '鸡蛋羹'],
  },
  late: {
    stage: 'late',
    stageName: '辅食后期',
    description: '接近成人食物质地，但需注意调味料',
    texture: '小颗粒',
    suggestions: ['可以吃软烂的成人饭菜', '少盐少糖', '培养自主进食'],
    foods: ['小馄饨', '软米饭', '蒸糕', '小块水果', '肉末蔬菜'],
  },
  toddler_early: {
    stage: 'toddler_early',
    stageName: '幼儿早期',
    description: '约1cm小块，训练咀嚼能力',
    texture: '小块(约1cm)',
    suggestions: ['每日3餐2点', '奶制品补充', '注意营养均衡'],
    foods: ['牛奶', '酸奶', '软米饭', '炒菜', '面食', '水果'],
  },
  toddler: {
    stage: 'toddler',
    stageName: '幼儿期',
    description: '与家人共餐，注意营养均衡',
    texture: '小块(约2cm)',
    suggestions: ['每日3餐2点', '奶制品补充', '多样化的食物'],
    foods: ['牛奶', '酸奶', '软米饭', '炒菜', '面食', '水果'],
  },
};

// ============================================
// 工具函数
// ============================================

/**
 * 根据月龄获取阶段信息（6阶段）
 */
export const getBabyAgeInfo = (months: number): BabyAgeInfo => {
  if (months < 6) {
    return { months, ...babyStageData.newborn };
  } else if (months < 8) {
    return { months, ...babyStageData.early };
  } else if (months < 10) {
    return { months, ...babyStageData.early_mid };
  } else if (months < 12) {
    return { months, ...babyStageData.mid };
  } else if (months < 18) {
    return { months, ...babyStageData.late };
  } else if (months < 24) {
    return { months, ...babyStageData.toddler_early };
  } else {
    return { months, ...babyStageData.toddler };
  }
};

/**
 * 获取所有阶段列表（用于选择器）
 */
export const getAllStages = (): Array<{ key: BabyStage; label: string; icon: string }> => [
  { key: 'early', label: '6-8个月', icon: '🍼' },
  { key: 'early_mid', label: '8-10个月', icon: '🥄' },
  { key: 'mid', label: '10-12个月', icon: '🍚' },
  { key: 'late', label: '12-18个月', icon: '🍲' },
  { key: 'toddler_early', label: '18-24个月', icon: '🥢' },
  { key: 'toddler', label: '2-3岁', icon: '🍴' },
];

/**
 * 将阶段Key转换为月龄范围
 */
export const stageToAgeRange = (stage: BabyStage): { min: number; max: number } => {
  switch (stage) {
    case 'early': return { min: 6, max: 8 };
    case 'early_mid': return { min: 8, max: 10 };
    case 'mid': return { min: 10, max: 12 };
    case 'late': return { min: 12, max: 18 };
    case 'toddler_early': return { min: 18, max: 24 };
    case 'toddler': return { min: 24, max: 36 };
    default: return { min: 6, max: 36 };
  }
};

/**
 * 格式化月龄显示
 */
export const formatBabyAge = (months: number): string => {
  if (months < 12) {
    return `${months}个月`;
  } else {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years}岁`;
    }
    return `${years}岁${remainingMonths}个月`;
  }
};

/**
 * 判断是否适合推荐菜谱
 */
export const isAgeAppropriate = (recipeMinAge: number, babyMonths: number): boolean => {
  return babyMonths >= recipeMinAge;
};

// ============================================
// 组件
// ============================================

export interface BabyAgeCardProps {
  /** 宝宝月龄 */
  babyAge: number;
  /** 是否可编辑 */
  editable?: boolean;
  /** 编辑点击事件 */
  onEdit?: () => void;
}

export const BabyAgeCard: React.FC<BabyAgeCardProps> = ({
  babyAge,
  editable = false,
  onEdit,
}) => {
  const ageInfo = getBabyAgeInfo(babyAge);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BabyIcon size={20} color={Colors.secondary.main} />
          <Text style={styles.title}>宝宝信息</Text>
        </View>
        {editable && (
          <TouchableOpacity onPress={onEdit}>
            <Text style={styles.editButton}>编辑</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.ageInfo}>
        <View style={styles.ageBadge}>
          <Text style={styles.ageNumber}>{babyAge}</Text>
          <Text style={styles.ageUnit}>个月</Text>
        </View>
        <View style={styles.stageInfo}>
          <Text style={styles.stageName}>{ageInfo.stageName}</Text>
          <Text style={styles.stageDescription}>{ageInfo.description}</Text>
        </View>
      </View>

      {/* 建议 */}
      <View style={styles.suggestions}>
        <Text style={styles.sectionTitle}>喂养建议</Text>
        {ageInfo.suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <Text style={styles.suggestionIcon}>✓</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {/* 质地要求 */}
      <View style={styles.texture}>
        <Text style={styles.sectionTitle}>食物质地</Text>
        <View style={styles.textureBadge}>
          <Text style={styles.textureText}>{ageInfo.texture}</Text>
        </View>
      </View>

      {/* 推荐食材 */}
      <View style={styles.foods}>
        <Text style={styles.sectionTitle}>推荐食材</Text>
        <View style={styles.foodTags}>
          {ageInfo.foods.map((food, index) => (
            <View key={index} style={styles.foodTag}>
              <Text style={styles.foodTagText}>{food}</Text>
            </View>
          ))}
        </View>
      </View>
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
  title: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  editButton: {
    ...Typography.body.regular,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  ageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: Spacing.md,
  },
  ageNumber: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.secondary.main,
  },
  ageUnit: {
    ...Typography.body.regular,
    color: Colors.secondary.main,
    marginLeft: Spacing.xs,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  stageDescription: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  suggestions: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  suggestionIcon: {
    fontSize: 12,
    color: Colors.functional.success,
    marginRight: Spacing.sm,
  },
  suggestionText: {
    ...Typography.body.caption,
    color: Colors.text.primary,
  },
  texture: {
    marginBottom: Spacing.md,
  },
  textureBadge: {
    backgroundColor: Colors.functional.info + '20',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  textureText: {
    ...Typography.body.regular,
    color: Colors.functional.info,
    fontWeight: Typography.fontWeight.medium,
  },
  foods: {},
  foodTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  foodTag: {
    backgroundColor: Colors.primary[50],
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  foodTagText: {
    ...Typography.body.caption,
    color: Colors.primary.main,
  },
});

export default BabyAgeCard;
