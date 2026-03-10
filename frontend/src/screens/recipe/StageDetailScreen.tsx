// @ts-nocheck
import React, { useState } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

type Props = NativeStackScreenProps<RecipeStackParamList, 'StageDetail'>;

const SCENE_FILTERS = [
  { id: '', label: '全部' },
  { id: 'first_intro', label: '首次引入' },
  { id: '快手', label: '⚡ 快手' },
  { id: '生病', label: '🤒 生病' },
  { id: '日常', label: '🌿 日常' },
  { id: '补铁', label: '🔴 补铁' },
  { id: '补钙', label: '🦴 补钙' },
];

export function StageDetailScreen({ route, navigation }: Props) {
  const { stage, stageName } = route.params;
  const [activeFilter, setActiveFilter] = useState('');

  const { data: stageData, isLoading: stageLoading } = useQuery({
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

  const { data: recipes, isLoading: recipesLoading } = useStageRecipes(stage, filters);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Stage detail</Text>
          <Text style={styles.heroTitle}>{stageName || stage}</Text>
          <Text style={styles.heroSubtitle}>先看这个阶段的喂养重点，再根据场景筛具体食谱。</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{recipes?.length ?? 0}</Text>
              <Text style={styles.heroMetaLabel}>可选食谱</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{activeFilter ? '已筛选' : '全部场景'}</Text>
              <Text style={styles.heroMetaLabel}>{activeFilter || '按月龄优先'}</Text>
            </View>
          </View>
        </View>

        {/* 阶段指南卡 */}
        {stageLoading ? (
          <ActivityIndicator style={{ margin: 20 }} color={Colors.primary.main} />
        ) : stageData ? (
          <StageGuideCard stage={stageData} defaultExpanded={false} />
        ) : null}

        {/* 筛选器 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {SCENE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                activeFilter === f.id && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f.id && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 食谱列表 */}
        <View style={styles.recipesSection}>
          <Text style={styles.recipesTitle}>
            {recipesLoading ? '加载中...' : `${recipes?.length ?? 0} 道食谱`}
          </Text>
          {recipesLoading ? (
            <ActivityIndicator color={Colors.primary.main} style={{ margin: 20 }} />
          ) : recipes?.length === 0 ? (
            <Text style={styles.emptyText}>该筛选条件下暂无食谱</Text>
          ) : (
            recipes?.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() =>
                  navigation.navigate('RecipeDetail', { recipeId: recipe.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    margin: Spacing.md,
    marginBottom: Spacing.sm,
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
  heroMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroMetaCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  heroMetaValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  heroMetaLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  filterList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterChipActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
  filterText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  filterTextActive: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.semibold },
  recipesSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  recipesTitle: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.sm },
  emptyText: {
    textAlign: 'center',
    color: Colors.text.secondary,
    marginTop: 40,
    fontSize: Typography.fontSize.sm,
  },
});
