// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { RecipeStackParamList } from '../../types';
import { babyStagesApi } from '../../api/babyStages';
import { useStageRecipes } from '../../hooks/useBabyStages';
import { StageGuideCard } from '../../components/recipe/StageGuideCard';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

type Props = NativeStackScreenProps<RecipeStackParamList, 'StageDetail'>;

const SCENE_FILTERS = [
  { id: '', label: '全部场景' },
  { id: 'first_intro', label: '首次引入' },
  { id: '快手', label: '快手' },
  { id: '生病', label: '生病' },
  { id: '日常', label: '日常' },
  { id: '补铁', label: '补铁' },
  { id: '补钙', label: '补钙' },
];

const getFilterDescription = (filter: string) => {
  if (!filter) return '先看全量，再按具体场景收窄。';
  if (filter === 'first_intro') return '优先看第一次尝试更稳妥的食谱。';
  return `当前只看“${filter}”相关的阶段食谱。`;
};

export function StageDetailScreen({ route, navigation }: Props) {
  const { stage, stageName } = route.params;
  const [activeFilter, setActiveFilter] = useState('');

  const {
    data: stageData,
    isLoading: stageLoading,
    error: stageError,
    refetch: refetchStage,
  } = useQuery({
    queryKey: ['babyStage', stage],
    queryFn: async () => {
      const res = await babyStagesApi.getByStage(stage);
      return res.data.data;
    },
  });

  const filters =
    activeFilter === 'first_intro'
      ? { first_intro: true }
      : activeFilter
        ? { scene_tag: activeFilter }
        : {};

  const {
    data: recipes,
    isLoading: recipesLoading,
    error: recipesError,
    refetch: refetchRecipes,
  } = useStageRecipes(stage, filters);

  const summaryCards = useMemo(
    () => [
      {
        label: '阶段月龄',
        value: stageData?.age_range || stage,
        helper: '先确认月龄再往下筛',
      },
      {
        label: '建议频次',
        value: stageData?.meal_frequency || '--',
        helper: '帮助安排一天节奏',
      },
      {
        label: '可选食谱',
        value: `${recipes?.length ?? 0}`,
        helper: activeFilter ? `已按 ${activeFilter} 筛选` : '当前未加筛选',
      },
    ],
    [activeFilter, recipes?.length, stage, stageData?.age_range, stageData?.meal_frequency]
  );

  const tipPreview = (stageData?.guide_tips || []).slice(0, 3);
  const nutrientPreview = (stageData?.key_nutrients || []).slice(0, 4);
  const cautionPreview = (stageData?.cannot_eat || []).slice(0, 4);

  const handleRetry = async () => {
    await Promise.allSettled([refetchStage(), refetchRecipes()]);
  };

  if ((stageLoading && !stageData) || (recipesLoading && !recipes)) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理阶段要点与推荐食谱...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if ((stageError && !stageData) || (recipesError && !recipes)) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>阶段详情加载失败</Text>
          <Text style={styles.errorText}>阶段说明或食谱列表暂时没有回来，重新加载一次即可。</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Stage detail</Text>
          <Text style={styles.heroTitle}>{stageName || stage}</Text>
          <Text style={styles.heroSubtitle}>先看这个阶段的喂养重点，再根据场景筛具体食谱，避免一上来就从全量列表里盲选。</Text>
          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>
        </View>

        {stageData ? (
          <>
            <View style={styles.focusCard}>
              <Text style={styles.sectionTitle}>阶段重点</Text>
              <Text style={styles.sectionDescription}>先确认质地、频次和关键营养，再决定具体做哪一道。</Text>
              <View style={styles.focusGrid}>
                <View style={styles.focusItem}>
                  <Text style={styles.focusLabel}>质地提示</Text>
                  <Text style={styles.focusValue}>{stageData.texture_desc}</Text>
                </View>
                <View style={styles.focusItem}>
                  <Text style={styles.focusLabel}>建议频次</Text>
                  <Text style={styles.focusValue}>{stageData.meal_frequency}</Text>
                </View>
              </View>
              {nutrientPreview.length > 0 ? (
                <View style={styles.chipRow}>
                  {nutrientPreview.map((item) => (
                    <View key={item} style={styles.nutrientChip}>
                      <Text style={styles.nutrientChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {tipPreview.length > 0 ? (
              <View style={styles.tipCard}>
                <Text style={styles.sectionTitle}>喂养提醒</Text>
                {tipPreview.map((tip) => (
                  <Text key={tip} style={styles.tipItem}>• {tip}</Text>
                ))}
              </View>
            ) : null}

            {cautionPreview.length > 0 ? (
              <View style={styles.cautionCard}>
                <Text style={styles.sectionTitle}>本阶段先别急着给</Text>
                <Text style={styles.sectionDescription}>{cautionPreview.join('、')}</Text>
              </View>
            ) : null}

            <StageGuideCard stage={stageData} defaultExpanded={false} />
          </>
        ) : null}

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>按场景筛食谱</Text>
          <Text style={styles.sectionDescription}>{getFilterDescription(activeFilter)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            {SCENE_FILTERS.map((filter) => {
              const selected = activeFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.recipesSection}>
          <View style={styles.recipesHeader}>
            <Text style={styles.sectionTitle}>对应食谱</Text>
            <Text style={styles.recipeCount}>{recipesLoading ? '加载中...' : `${recipes?.length ?? 0} 道`}</Text>
          </View>
          {recipesLoading ? (
            <ActivityIndicator color={Colors.primary.main} style={{ marginTop: Spacing.lg }} />
          ) : recipes?.length ? (
            recipes.map((recipe) => (
              <View key={recipe.id} style={styles.recipeCardWrap}>
                <RecipeCard recipe={recipe} onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>这个筛选下还没有食谱</Text>
              <Text style={styles.emptyText}>可以先切回“全部场景”，或者换一个更宽的筛选条件。</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  errorText: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  summaryHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  focusCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  tipCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cautionCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.functional.warningLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionDescription: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  focusGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  focusItem: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  focusLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  focusValue: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  nutrientChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  nutrientChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  tipItem: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  filterSection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    ...Shadows.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  filterText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  recipesSection: {
    marginTop: Spacing.md,
  },
  recipesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recipeCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  recipeCardWrap: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  emptyText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
