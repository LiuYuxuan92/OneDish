// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useWeeklyReviewViewModel } from './useWeeklyReviewViewModel';
import { useRegenerateWeeklyReview } from '../../hooks/useWeeklyReview';

type Props = NativeStackScreenProps<ProfileStackParamList, 'WeeklyReview'>;

export function WeeklyReviewScreen({ navigation }: Props) {
  const { isLoading, review, weekStart, weekEnd } = useWeeklyReviewViewModel();
  const regenerate = useRegenerateWeeklyReview();
  const [showActions, setShowActions] = useState(false);

  const handleRegenerate = async () => {
    const now = new Date();
    const day = now.getUTCDay() || 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - day + 1);
    const start = monday.toISOString().slice(0, 10);
    await regenerate.mutateAsync({ week_start: start });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.eyebrow}>每周回顾</Text>
              <Text style={styles.title}>这周的一菜两吃，效果怎么样？</Text>
              <Text style={styles.subtitle}>{weekStart && weekEnd ? `${weekStart} 至 ${weekEnd}` : '基于真实周回顾数据生成'}，没有模拟摘要。</Text>
            </View>
            <TouchableOpacity style={styles.heroActionButton} onPress={() => setShowActions((prev) => !prev)}>
              <Text style={styles.heroActionButtonText}>{showActions ? '收起' : '更多'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroNarrativeCard}>
            <Text style={styles.heroNarrativeLabel}>本周回顾</Text>
            <Text style={styles.heroNarrativeText}>
              {review ? review.insightText : '等本周记录积累起来，这里会把接受度、双版本适配和下周建议压缩成一眼能看的总结。'}
            </Text>
          </View>
          {showActions && (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity style={styles.toolChip} onPress={() => navigation.navigate('FeedingFeedback')}>
                <Text style={styles.toolChipText}>查看反馈</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolChip} onPress={handleRegenerate}>
                <Text style={styles.toolChipText}>{regenerate.isPending ? '生成中...' : '重新生成'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary.main} style={{ marginTop: Spacing.xl }} />
        ) : !review ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>数据积累中</Text>
            <Text style={styles.emptyText}>本周记录还不够，继续提交喂养反馈后，这里会自动形成回顾。</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRegenerate}>
              <Text style={styles.primaryButtonText}>{regenerate.isPending ? '生成中...' : '尝试生成本周回顾'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {review.stats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  {!!stat.helper && <Text style={styles.statHelper}>{stat.helper}</Text>}
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>一菜两吃洞察</Text>
              <Text style={styles.bodyText}>{review.insightText}</Text>
              <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>{review.trendText}</Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>这周接受得不错的菜</Text>
              {review.acceptedRecipes.length ? review.acceptedRecipes.map(item => (
                <TouchableOpacity key={item.recipe_id} style={styles.recipeRow} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipe_id })}>
                  <View style={styles.recipeBody}>
                    <Text style={styles.recipeName}>{item.recipe_name}</Text>
                    <Text style={styles.recipeMeta}>{item.feedback_count} 次正向反馈</Text>
                  </View>
                  <Text style={styles.recipeLink}>去详情</Text>
                </TouchableOpacity>
              )) : <Text style={styles.bodyText}>暂时还没有明显偏好的菜。</Text>}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>谨慎 / 拒绝项</Text>
              {review.cautiousRecipes.length ? review.cautiousRecipes.map(item => (
                <TouchableOpacity key={item.recipe_id} style={styles.recipeRow} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipe_id })}>
                  <View style={styles.recipeBody}>
                    <Text style={styles.recipeName}>{item.recipe_name}</Text>
                    <Text style={styles.recipeMeta}>{item.accepted_level === 'reject' ? '出现拒绝反馈' : '建议谨慎继续观察'}</Text>
                  </View>
                  <Text style={styles.recipeLink}>查看</Text>
                </TouchableOpacity>
              )) : <Text style={styles.bodyText}>本周没有明显的谨慎项。</Text>}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>下周建议</Text>
              {review.suggestions.length ? review.suggestions.map((item, index) => (
                <View key={`${item.type}-${index}`} style={styles.suggestionRow}>
                  <Text style={styles.suggestionType}>{item.type}</Text>
                  <Text style={styles.suggestionText}>{item.reason}</Text>
                </View>
              )) : <Text style={styles.bodyText}>暂时没有建议，继续记录即可。</Text>}
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('FeedingFeedback')}>
                <Text style={styles.secondaryButtonText}>查看反馈记录</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Plan')}>
                <Text style={styles.primaryButtonText}>去安排下周</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  heroCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.sm },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  heroTextBlock: { flex: 1 },
  heroActionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary },
  heroActionButtonText: { fontSize: Typography.fontSize.sm, color: Colors.text.primary, fontWeight: Typography.fontWeight.medium },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.secondary.main, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase' },
  title: { fontSize: Typography.fontSize['2xl'], color: Colors.text.primary, fontWeight: Typography.fontWeight.bold, marginTop: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20, marginTop: Spacing.sm },
  heroNarrativeCard: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary },
  heroNarrativeLabel: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  heroNarrativeText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  heroActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  toolChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.secondary.light },
  toolChipText: { fontSize: Typography.fontSize.sm, color: Colors.secondary.dark, fontWeight: Typography.fontWeight.semibold },
  emptyCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginTop: Spacing.lg, ...Shadows.sm },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  statCard: { width: '47%', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.xs },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  statLabel: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  statHelper: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, marginTop: Spacing.xs },
  sectionCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  bodyText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  recipeBody: { flex: 1 },
  recipeName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  recipeMeta: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  recipeLink: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  suggestionType: { width: 72, fontSize: Typography.fontSize.xs, color: Colors.secondary.dark, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase' },
  suggestionText: { flex: 1, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  footerActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  secondaryButton: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.light },
  secondaryButtonText: { color: Colors.text.secondary, fontWeight: Typography.fontWeight.semibold },
  primaryButton: { flex: 1, backgroundColor: Colors.primary.main, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryButtonText: { color: Colors.text.inverse, fontWeight: Typography.fontWeight.semibold },
});
