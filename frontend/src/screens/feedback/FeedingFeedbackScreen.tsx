// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useFeedingFeedbackViewModel } from './useFeedingFeedbackViewModel';

type Props = NativeStackScreenProps<ProfileStackParamList, 'FeedingFeedback'>;
type FilterKey = 'all' | 'loved' | 'okay' | 'cautious' | 'rejected';

export function FeedingFeedbackScreen({ navigation }: Props) {
  const { isLoading, records, grouped, summaryCards, refetch, isRefetching } = useFeedingFeedbackViewModel();
  const [filter, setFilter] = useState<FilterKey>('all');

  const visibleRecords = useMemo(() => {
    if (filter === 'all') return records;
    return grouped[filter] || [];
  }, [filter, records, grouped]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Feeding Feedback</Text>
          <Text style={styles.title}>这周宝宝对哪些菜更买账？</Text>
          <Text style={styles.subtitle}>保留真实喂养反馈接口，把“喜欢 / 一般 / 谨慎 / 拒绝”收拢成一个可回流计划的页面。</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          {summaryCards.map(card => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>建议重试</Text>
          {grouped.retry.length ? grouped.retry.slice(0, 3).map(item => (
            <TouchableOpacity key={item.id} style={styles.highlightCard} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipeId })}>
              <View style={[styles.toneDot, { backgroundColor: item.toneColor }]} />
              <View style={styles.highlightBody}>
                <Text style={styles.highlightTitle}>{item.recipeName}</Text>
                <Text style={styles.highlightText}>{item.summary}</Text>
              </View>
              <Text style={styles.highlightAction}>去详情</Text>
            </TouchableOpacity>
          )) : <Text style={styles.emptyText}>目前没有需要特别重试的菜，继续记录就好。</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>值得继续安排</Text>
          {grouped.loved.length ? grouped.loved.slice(0, 3).map(item => (
            <TouchableOpacity key={item.id} style={styles.highlightCard} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipeId })}>
              <View style={[styles.toneDot, { backgroundColor: item.toneColor }]} />
              <View style={styles.highlightBody}>
                <Text style={styles.highlightTitle}>{item.recipeName}</Text>
                <Text style={styles.highlightText}>{item.summary}</Text>
              </View>
              <Text style={styles.highlightAction}>再做一次</Text>
            </TouchableOpacity>
          )) : <Text style={styles.emptyText}>喜欢样本还不多，继续记录后这里会更有用。</Text>}
        </View>

        <View style={styles.filterRow}>
          {[
            ['all', '全部'],
            ['loved', '喜欢'],
            ['okay', '一般'],
            ['cautious', '谨慎'],
            ['rejected', '拒绝'],
          ].map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.filterChip, filter === key && styles.filterChipActive]} onPress={() => setFilter(key as FilterKey)}>
              <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>最近记录</Text>
            <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
              <Text style={styles.refreshText}>{isRefetching ? '刷新中...' : '刷新'}</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary.main} style={{ marginTop: Spacing.lg }} />
          ) : visibleRecords.length ? visibleRecords.map(item => (
            <TouchableOpacity key={item.id} style={styles.recordCard} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipeId })}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>{item.recipeName}</Text>
                <Text style={[styles.recordBadge, { color: item.toneColor }]}>{item.toneLabel}</Text>
              </View>
              <Text style={styles.recordSummary}>{item.summary}</Text>
              {!!item.note && <Text style={styles.recordNote}>备注：{item.note}</Text>}
              <Text style={styles.recordMeta}>{item.dateText}</Text>
            </TouchableOpacity>
          )) : <Text style={styles.emptyText}>还没有喂养反馈记录。</Text>}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('WeeklyReview')}>
            <Text style={styles.secondaryButtonText}>查看周回顾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Recipes')}>
            <Text style={styles.primaryButtonText}>去找菜谱</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  heroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase' },
  title: { fontSize: Typography.fontSize['2xl'], color: Colors.text.primary, fontWeight: Typography.fontWeight.bold, marginTop: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20, marginTop: Spacing.sm },
  summaryRow: { gap: Spacing.md, paddingVertical: Spacing.lg },
  summaryCard: { width: 110, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.xs },
  summaryValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summaryLabel: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  highlightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.xs },
  toneDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md },
  highlightBody: { flex: 1 },
  highlightTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  highlightText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  highlightAction: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background.primary },
  filterChipActive: { backgroundColor: Colors.primary.main },
  filterChipText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.semibold },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  refreshText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.medium },
  recordCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.xs },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, flex: 1, marginRight: Spacing.sm },
  recordBadge: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  recordSummary: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  recordNote: { fontSize: Typography.fontSize.sm, color: Colors.text.tertiary, marginTop: Spacing.xs },
  recordMeta: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, marginTop: Spacing.sm },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.text.tertiary, lineHeight: 20 },
  footerActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  secondaryButton: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.light },
  secondaryButtonText: { color: Colors.text.secondary, fontWeight: Typography.fontWeight.semibold },
  primaryButton: { flex: 1, backgroundColor: Colors.primary.main, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.semibold },
});
