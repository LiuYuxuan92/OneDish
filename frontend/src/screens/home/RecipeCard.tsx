import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import type { Recipe } from '../../types';
import type { BabyStageGuide } from '../../types';
import type { RecommendationReasons } from './useHomeRecommendation';

export interface RecipeCardProps {
  recipe: Recipe;
  currentStage?: BabyStageGuide;
  recommendationReasons: RecommendationReasons[];
  swapping: boolean;
  onSwap: () => void;
  onShoppingList: () => void;
  onCookingStart: () => void;
  onRecipePress: () => void;
}

export function RecipeCard({
  recipe,
  currentStage,
  recommendationReasons,
  swapping,
  onSwap,
  onShoppingList,
  onCookingStart,
  onRecipePress,
}: RecipeCardProps) {
  return (
    <View style={styles.pairingCard}>
      {/* 配对卡片头部 */}
      <TouchableOpacity
        onPress={onRecipePress}
        activeOpacity={0.9}
        style={styles.pairingHeader}
      >
        <Text style={styles.pairingTitle}>{recipe.name}</Text>
        <Text style={styles.pairingSubtitle}>成人 + 宝宝今日推荐，一次备菜两份餐</Text>
      </TouchableOpacity>

      {/* 双版本展示 */}
      <View style={styles.versionsContainer}>
        {/* 大人版 */}
        <View style={[styles.versionBox, styles.adultVersion]}>
          <View style={styles.versionTag}>
            <Text style={styles.versionTagText}>大人版</Text>
          </View>
          <Text style={styles.versionName}>{recipe.name || '大人餐食'}</Text>
          <View style={styles.versionMeta}>
            <Text style={styles.versionTime}>{recipe.prep_time}分钟</Text>
            <Text style={styles.versionFeature}>口味浓郁</Text>
          </View>
        </View>

        {/* 分隔线 */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.syncIcon}>
            <Text style={styles.syncIconText}>同步</Text>
          </View>
          <View style={styles.dividerLine} />
        </View>

        {/* 宝宝版 */}
        <View style={[styles.versionBox, styles.babyVersion]}>
          <View style={[styles.versionTag, styles.babyTag]}>
            <Text style={styles.versionTagText}>宝宝版</Text>
          </View>
          <Text style={styles.versionName}>宝宝版</Text>
          <View style={styles.versionMeta}>
            <Text style={styles.versionTime}>{recipe.prep_time}分钟</Text>
            <Text style={styles.versionFeature}>细腻易消化</Text>
          </View>
        </View>
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonTitle}>推荐理由</Text>
        {recommendationReasons.map((reason) => (
          <View key={reason.key} style={styles.reasonItem}>
            <View style={[styles.reasonStrengthBadge, styles[`reasonStrength_${reason.strength}`]]}>
              <Text style={styles.reasonStrengthText}>{reason.strength.toUpperCase()}</Text>
            </View>
            <View style={styles.reasonContent}>
              <Text style={styles.reasonItemTitle}>{reason.title}</Text>
              <Text style={styles.reasonText}>{reason.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.decisionActions}>
        <TouchableOpacity
          style={[styles.primaryCTA, styles.shoppingCTA]}
          onPress={onShoppingList}
        >
          <Text style={styles.primaryCTAText}>去购物清单</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryCTA, styles.cookingCTA]}
          onPress={onCookingStart}
        >
          <Text style={styles.primaryCTAText}>开始烹饪</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.swapButton, swapping && styles.swapButtonDisabled]}
        onPress={onSwap}
        disabled={swapping}
      >
        <Text style={styles.swapButtonText}>{swapping ? '换菜中...' : '换一道'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  pairingCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  pairingHeader: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pairingTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  pairingSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  versionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  versionBox: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  adultVersion: {
    marginRight: Spacing.sm,
  },
  babyVersion: {
    marginLeft: Spacing.sm,
  },
  versionTag: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  babyTag: {
    backgroundColor: '#4CAF50',
  },
  versionTagText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  versionMeta: {
    alignItems: 'center',
  },
  versionTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  versionFeature: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.default,
  },
  syncIcon: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  syncIconText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
  },
  reasonBox: {
    marginTop: Spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reasonTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: '#F57C00',
    marginBottom: Spacing.xs,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  reasonStrengthBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: Spacing.xs,
    marginTop: 1,
  },
  reasonStrength_high: {
    backgroundColor: '#FFB74D',
  },
  reasonStrength_medium: {
    backgroundColor: '#FFD54F',
  },
  reasonStrength_low: {
    backgroundColor: '#FFE082',
  },
  reasonStrengthText: {
    fontSize: 10,
    color: '#7A4B00',
    fontWeight: Typography.fontWeight.bold,
  },
  reasonContent: {
    flex: 1,
  },
  reasonItemTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  decisionActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  primaryCTA: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  shoppingCTA: {
    backgroundColor: Colors.primary.light,
    marginRight: Spacing.sm,
  },
  cookingCTA: {
    backgroundColor: Colors.primary.main,
  },
  primaryCTAText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  swapButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  swapButtonDisabled: {
    opacity: 0.6,
  },
  swapButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
});
