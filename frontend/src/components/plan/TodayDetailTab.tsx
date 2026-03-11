import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../styles/theme';
import type { WeeklyPlanDayViewModel } from '../../viewmodels/uiMigration';
import { PlannedMealCard } from '../ui-migration';

interface TodayDetailTabProps {
  day?: WeeklyPlanDayViewModel;
  onMealPress: (recipeId: string) => void;
  onMarkComplete: (planId: string) => void;
  onAddMeal: (dateStr: string, mealType: string) => void;
}

export function TodayDetailTab({ day, onMealPress, onMarkComplete, onAddMeal }: TodayDetailTabProps) {
  const plannedMeals = day?.meals.filter(meal => meal.completionStatus !== 'empty') || [];

  if (!day || plannedMeals.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>今日暂无计划</Text>
        <Text style={styles.emptyText}>请先生成周计划</Text>
      </View>
    );
  }

  return (
    <View style={styles.todayDetailContainer}>
      {day.meals.map(meal => (
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 56,
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
  },
});
