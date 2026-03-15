import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { WeeklyPlanDayViewModel } from '../../viewmodels/uiMigration';
import { PlannedMealCard } from '../ui-migration';

interface TodayDetailTabProps {
  day?: WeeklyPlanDayViewModel;
  onMealPress: (recipeId: string) => void;
  onMarkComplete: (planId: string) => void;
  onAddMeal: (dateStr: string, mealType: string) => void;
}

export function TodayDetailTab({ day, onMealPress, onMarkComplete, onAddMeal }: TodayDetailTabProps) {
  const plannedMeals = day?.meals.filter((meal) => meal.completionStatus !== 'empty') || [];
  const completedMeals = plannedMeals.filter((meal) => meal.completionStatus === 'completed').length;
  const prepMinutes = plannedMeals.reduce((sum, meal) => sum + (meal.prepMinutes || 0), 0);

  if (!day || plannedMeals.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>今日空白</Text>
        <Text style={styles.emptyTitle}>今天还没有安排</Text>
        <Text style={styles.emptyText}>先生成一份周计划，或者从上方切回本周视图继续排。</Text>
      </View>
    );
  }

  return (
    <View style={styles.todayDetailContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEyebrow}>今日详情</Text>
        <Text style={styles.summaryTitle}>把今天的做饭节奏先理顺</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{plannedMeals.length}</Text>
            <Text style={styles.summaryLabel}>已安排餐次</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{prepMinutes}</Text>
            <Text style={styles.summaryLabel}>预计分钟</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{completedMeals}</Text>
            <Text style={styles.summaryLabel}>已经完成</Text>
          </View>
        </View>
      </View>

      {day.meals.map((meal) => (
        <PlannedMealCard
          key={`${day.date}-${meal.slotKey}`}
          item={meal}
          onPress={(recipeId) => recipeId && onMealPress(recipeId)}
          onMarkComplete={(planId) => planId && onMarkComplete(planId)}
          onAddEmpty={(slotKey) => onAddMeal(day.date, slotKey)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  todayDetailContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.md,
  },
  summaryEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 400,
    margin: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyIcon: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
