import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import type { WeeklyPlanDayViewModel } from '../../viewmodels/uiMigration';
import { PlannedMealCard } from '../ui-migration';

interface WeekDayCardProps {
  day: WeeklyPlanDayViewModel;
  weekday: string;
  isToday: boolean;
  refreshingMeals: Set<string>;
  onMarkComplete: (planId: string) => void;
  onMealPress: (recipeId: string) => void;
  onAddMeal: (dateStr: string, mealType: string) => void;
}

export function WeekDayCard({
  day,
  weekday,
  isToday,
  refreshingMeals,
  onMarkComplete,
  onMealPress,
  onAddMeal,
}: WeekDayCardProps) {
  const date = new Date(day.date);
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const plannedMeals = day.meals.filter((meal) => meal.completionStatus !== 'empty');
  const completedMeals = plannedMeals.filter((meal) => meal.completionStatus === 'completed').length;
  const prepMinutes = plannedMeals.reduce((sum, meal) => sum + (meal.prepMinutes || 0), 0);

  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <View style={styles.dayTitleBlock}>
          <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>{`${weekday} ${month}/${dayOfMonth}`}</Text>
          <View style={styles.dayMetaRow}>
            <Text style={styles.dayMetaText}>{plannedMeals.length} 餐</Text>
            <Text style={styles.dayMetaDot}>•</Text>
            <Text style={styles.dayMetaText}>{prepMinutes} 分钟</Text>
            <Text style={styles.dayMetaDot}>•</Text>
            <Text style={styles.dayMetaText}>已完成 {completedMeals}</Text>
          </View>
        </View>
        {isToday ? (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>今天</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.mealList}>
        {day.meals.map((meal) => {
          const slotId = `${day.date}-${meal.slotKey}`;
          if (refreshingMeals.has(slotId)) {
            return (
              <View key={slotId} style={styles.refreshingCard}>
                <ActivityIndicator size="small" color={Colors.primary.main} />
                <Text style={styles.refreshingText}>{meal.slotLabel} 更新中</Text>
              </View>
            );
          }

          return (
            <PlannedMealCard
              key={slotId}
              item={meal}
              onPress={(recipeId) => recipeId && onMealPress(recipeId)}
              onMarkComplete={(planId) => planId && onMarkComplete(planId)}
              onAddEmpty={(slotKey) => onAddMeal(day.date, slotKey)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  dayCardToday: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary[50],
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dayTitleBlock: {
    flex: 1,
    gap: Spacing.xs,
  },
  dayTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  dayTitleToday: {
    color: Colors.primary.main,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dayMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  dayMetaDot: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  todayBadge: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  todayBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  mealList: {
    gap: Spacing.sm,
  },
  refreshingCard: {
    minHeight: 96,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  refreshingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
});
