import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../common/Card';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { FeedbackAcceptance, PlannedMealCardViewModel } from '../../viewmodels/uiMigration';
import { DualBadge } from './DualBadge';
import { AdaptationSummary } from './AdaptationSummary';

interface PlannedMealCardProps {
  item: PlannedMealCardViewModel;
  onPress?: (recipeId?: string) => void;
  onMarkComplete?: (planId?: string) => void;
  onReplace?: (planId?: string) => void;
  onRemove?: (planId?: string) => void;
  onAddEmpty?: (slotKey: string) => void;
}

const ACCEPTANCE_LABELS: Record<FeedbackAcceptance, string> = {
  loved: '最近很喜欢',
  okay: '吃过还行',
  cautious: '建议谨慎回试',
  rejected: '最近没接受',
};

function getAcceptanceLabel(acceptance?: FeedbackAcceptance) {
  return acceptance ? ACCEPTANCE_LABELS[acceptance] : undefined;
}

export const PlannedMealCard: React.FC<PlannedMealCardProps> = ({ item, onPress, onMarkComplete, onReplace, onRemove, onAddEmpty }) => {
  if (!item.recipe) {
    return (
      <Card variant="outlined" style={styles.emptyCard}>
        <View style={styles.header}>
          <Text style={styles.slot}>{item.slotLabel}</Text>
          <Text style={[styles.readiness, styles.readinessPending]}>{item.readinessLabel}</Text>
        </View>
        <Pressable onPress={() => onAddEmpty?.(item.slotKey)} style={styles.emptyAction}>
          <Text style={styles.emptyPlus}>＋</Text>
          <Text style={styles.emptyText}>添加菜谱</Text>
        </Pressable>
      </Card>
    );
  }

  const acceptanceLabel = getAcceptanceLabel(item.acceptance);
  const actions = [
    item.planId && item.completionStatus !== 'completed' && onMarkComplete
      ? <Pressable key="complete" onPress={() => onMarkComplete(item.planId)}><Text style={styles.actionText}>完成</Text></Pressable>
      : null,
    item.planId && onReplace
      ? <Pressable key="replace" onPress={() => onReplace(item.planId)}><Text style={styles.actionText}>替换</Text></Pressable>
      : null,
    item.planId && onRemove
      ? <Pressable key="remove" onPress={() => onRemove(item.planId)}><Text style={styles.actionText}>移除</Text></Pressable>
      : null,
  ].filter(Boolean);

  return (
    <Card variant="outlined" style={item.completionStatus === 'completed' ? styles.cardCompleted : styles.card}>
      <View style={styles.header}>
        <Text style={styles.slot}>{item.slotLabel}</Text>
        <Text style={[styles.readiness, item.readiness === 'ready' ? styles.readinessReady : item.readiness === 'partial' ? styles.readinessPartial : styles.readinessPending]}>{item.readinessLabel}</Text>
      </View>
      <Pressable onPress={() => onPress?.(item.recipe?.id)} style={styles.mainRow}>
        {item.recipe.image ? <Image source={{ uri: item.recipe.image }} style={styles.image} resizeMode="cover" /> : <View style={styles.imageFallback}><Text>🍽️</Text></View>}
        <View style={styles.info}>
          <Text style={styles.title}>{item.recipe.title}</Text>
          <Text style={styles.meta}>{item.recipe.cookTimeText} · {item.recipe.difficultyLabel}</Text>
          <View style={styles.badgesRow}>
            <DualBadge type={item.recipe.dualType} size="xs" />
            {acceptanceLabel ? <Text style={styles.acceptance}>{acceptanceLabel}</Text> : null}
            {item.completionStatus === 'completed' ? <Text style={styles.completedPill}>已完成</Text> : null}
          </View>
        </View>
      </Pressable>
      {item.adaptation ? <AdaptationSummary adaptation={item.adaptation} compact /> : null}
      {actions.length ? <View style={styles.actionRow}>{actions}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing[3],
  },
  cardCompleted: {
    gap: Spacing[3],
    opacity: 0.78,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  slot: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  readiness: {
    fontSize: Typography.fontSize['2xs'],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  readinessReady: { backgroundColor: Colors.secondary[50], color: Colors.secondary[700] },
  readinessPartial: { backgroundColor: '#FFF3E0', color: '#8D5A00' },
  readinessPending: { backgroundColor: Colors.neutral.gray100, color: Colors.text.secondary },
  mainRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
  },
  imageFallback: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing[1],
  },
  title: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  meta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
    alignItems: 'center',
  },
  acceptance: {
    fontSize: Typography.fontSize['2xs'],
    backgroundColor: Colors.primary[50],
    color: Colors.primary[700],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  completedPill: {
    fontSize: Typography.fontSize['2xs'],
    backgroundColor: Colors.secondary[50],
    color: Colors.secondary[700],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  actionRow: {
    marginTop: Spacing[2],
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[4],
  },
  actionText: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyCard: {
    gap: Spacing[3],
    borderStyle: 'dashed',
    borderColor: Colors.border.default,
  },
  emptyAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[6],
    gap: Spacing[2],
  },
  emptyPlus: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text.tertiary,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
});
