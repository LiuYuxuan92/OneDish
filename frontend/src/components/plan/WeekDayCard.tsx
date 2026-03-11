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

  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>{`${weekday} ${month}/${dayOfMonth}`}</Text>
        {isToday ? (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>今天</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.mealList}>
        {day.meals.map(meal => {
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  dayTitleToday: {
    color: Colors.primary.main,
  },
  todayBadge: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
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
    minHeight: 88,
    borderRadius: BorderRadius.lg,
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
