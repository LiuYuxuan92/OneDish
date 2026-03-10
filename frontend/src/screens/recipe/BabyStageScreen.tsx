// @ts-nocheck
import React from 'react';
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7043" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Baby stages</Text>
          <Text style={styles.title}>先按月龄阶段选，再看更稳妥的辅食建议</Text>
          <Text style={styles.subtitle}>把阶段、关键营养和对应食谱放在一起，减少来回跳转的成本。</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{(stages ?? []).length}</Text>
              <Text style={styles.heroMetaLabel}>阶段入口</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>按月龄</Text>
              <Text style={styles.heroMetaLabel}>优先筛选</Text>
            </View>
          </View>
        </View>

        {(stages ?? []).map((stage) => {
          const color = STAGE_COLORS[stage.stage] ?? '#888';

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
            >
              <View style={[styles.indicator, { backgroundColor: color }]}>
                <Text style={styles.indicatorText}>
                  {stage.stage.replace('m', '月')}
                </Text>
              </View>
              <View style={styles.stageInfo}>
                <Text style={styles.stageName}>{stage.name}</Text>
                <Text style={styles.ageRange}>{stage.age_range}</Text>
                <Text style={styles.nutritionHint}>
                  重点：{stage.key_nutrients.slice(0, 3).join(' · ')}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.md, paddingBottom: Spacing['3xl'] },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginBottom: Spacing.md, lineHeight: 20 },
  heroMetaRow: { flexDirection: 'row', gap: Spacing.sm },
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
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  indicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  indicatorText: { fontSize: Typography.fontSize.xs, color: Colors.text.inverse, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  stageInfo: { flex: 1 },
  stageName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  ageRange: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  nutritionHint: { fontSize: Typography.fontSize.xs, color: Colors.primary.dark, marginTop: 4 },
  arrow: { fontSize: 22, color: Colors.text.tertiary },
});
