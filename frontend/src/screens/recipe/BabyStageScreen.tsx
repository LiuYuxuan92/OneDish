// @ts-nocheck
import React, { useMemo } from 'react';
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
import type { RecipeStackParamList, BabyStageKey } from '../../types';
import { useAllBabyStages } from '../../hooks/useBabyStages';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

type Props = NativeStackScreenProps<RecipeStackParamList, 'BabyStages'>;

const STAGE_COLORS: Record<string, string> = {
  '6-8m': '#4CAF50',
  '8-10m': '#8BC34A',
  '10-12m': '#FF7043',
  '12-18m': '#FF9800',
  '18-24m': '#9C27B0',
  '24-36m': '#2196F3',
};

export function BabyStageScreen({ navigation }: Props) {
  const { data: stages, isLoading } = useAllBabyStages();
  const stageList = stages ?? [];

  const overviewCards = useMemo(
    () => [
      {
        label: '阶段入口',
        value: `${stageList.length}`,
        helper: '按月龄直接选，不用来回猜',
      },
      {
        label: '起步阶段',
        value: stageList[0]?.age_range || '6-8 月',
        helper: stageList[0]?.name || '从初次引入开始',
      },
      {
        label: '使用方式',
        value: '先看阶段',
        helper: '再进入详情筛场景菜谱',
      },
    ],
    [stageList]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理月龄阶段...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>月龄阶段</Text>
          <Text style={styles.title}>先按月龄找阶段，再看更稳妥的辅食建议</Text>
          <Text style={styles.subtitle}>把阶段要点、重点营养和入口卡片收在一起，减少从菜谱列表里反复试错。</Text>
          <View style={styles.overviewRow}>
            {overviewCards.map((card) => (
              <View key={card.label} style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{card.value}</Text>
                <Text style={styles.overviewLabel}>{card.label}</Text>
                <Text style={styles.overviewHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>怎么用这个入口</Text>
          <Text style={styles.tipText}>先按宝宝当前月龄进入对应阶段，再在详情页按“首次引入 / 快手 / 补铁 / 补钙”等场景筛食谱，会比直接翻全量菜谱更稳。</Text>
        </View>

        {stageList.map((stage) => {
          const color = STAGE_COLORS[stage.stage] ?? Colors.primary.main;
          const nutrientPreview = (stage.key_nutrients || []).slice(0, 3);

          return (
            <TouchableOpacity
              key={stage.stage}
              style={styles.stageCard}
              onPress={() =>
                navigation.navigate('StageDetail', {
                  stage: stage.stage as BabyStageKey,
                  stageName: stage.name,
                })
              }
              activeOpacity={0.88}
            >
              <View style={[styles.stageBadge, { backgroundColor: color }]}>
                <Text style={styles.stageBadgeText}>{stage.age_range}</Text>
              </View>
              <View style={styles.stageBody}>
                <View style={styles.stageHeaderRow}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <Text style={styles.stageArrow}>查看详情</Text>
                </View>
                <Text style={styles.stageMeta}>建议频次：{stage.meal_frequency}</Text>
                <Text style={styles.stageTexture}>质地提示：{stage.texture_desc}</Text>
                <View style={styles.nutrientRow}>
                  {nutrientPreview.map((item) => (
                    <View key={`${stage.stage}-${item}`} style={styles.nutrientChip}>
                      <Text style={styles.nutrientChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  overviewCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  overviewValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  overviewLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  overviewHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  tipCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  tipTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  tipText: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  stageCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  stageBadge: {
    width: 76,
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  stageBadgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 18,
  },
  stageBody: {
    flex: 1,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stageName: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  stageArrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  stageMeta: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  stageTexture: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  nutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
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
});
