import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { MEAL_LABELS, MEAL_TYPES, MealType } from '../../hooks/useWeeklyPlanState';
import { CheckIcon } from '../common/Icons';

interface MealPlan {
  id: string;
  name: string;
  prep_time: number;
  is_baby_suitable?: boolean;
  is_completed?: boolean;
  plan_id?: string;
}

interface DayPlan {
  [key: string]: MealPlan | null;
}

interface WeekDayCardProps {
  dateStr: string;
  weekday: string;
  isToday: boolean;
  dayPlans: DayPlan | undefined;
  refreshingMeals: Set<string>;
  onRefreshMeal: (dateStr: string, mealType: string) => void;
  onMarkComplete: (planId: string) => void;
  onMealPress: (recipeId: string) => void;
  onAddMeal: (dateStr: string, mealType: string) => void;
}

export function WeekDayCard({
  dateStr,
  weekday,
  isToday,
  dayPlans,
  refreshingMeals,
  onMarkComplete,
  onMealPress,
  onAddMeal,
}: WeekDayCardProps) {
  const formatDisplayDate = (dateStr: string, weekday: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return { text: `${weekday} ${month}/${day}`, isToday: dateStr === new Date().toISOString().split('T')[0] };
  };

  const { text } = formatDisplayDate(dateStr, weekday);

  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>{text}</Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>今天</Text>
          </View>
        )}
      </View>
      <View style={styles.mealsGrid}>
        {MEAL_TYPES.map((mealType) => (
          <View key={mealType} style={styles.mealWrapper}>
            <View style={styles.mealLabelContainer}>
              <Text style={styles.mealLabelIcon}>{MEAL_LABELS[mealType].icon}</Text>
              <Text style={styles.mealLabelText}>{MEAL_LABELS[mealType].label}</Text>
            </View>
            <MealCell
              dateStr={dateStr}
              mealType={mealType}
              plan={dayPlans?.[mealType]}
              isRefreshing={refreshingMeals.has(`${dateStr}-${mealType}`)}
              onMarkComplete={onMarkComplete}
              onMealPress={onMealPress}
              onAddMeal={onAddMeal}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

interface MealCellProps {
  dateStr: string;
  mealType: MealType;
  plan: MealPlan | null | undefined;
  isRefreshing: boolean;
  onMarkComplete: (planId: string) => void;
  onMealPress: (recipeId: string) => void;
  onAddMeal: (dateStr: string, mealType: string) => void;
}

function MealCell({
  dateStr,
  mealType,
  plan,
  isRefreshing,
  onMarkComplete,
  onMealPress,
  onAddMeal,
}: MealCellProps) {
  const mealConfig = MEAL_LABELS[mealType];

  if (isRefreshing) {
    return (
      <View style={[styles.mealFilled, styles.mealRefreshing]}>
        <ActivityIndicator size="small" color={mealConfig.color} />
      </View>
    );
  }

  if (!plan) {
    return (
      <TouchableOpacity style={styles.mealEmpty} onPress={() => onAddMeal(dateStr, mealType)}>
        <Text style={styles.mealEmptyIcon}>➕</Text>
        <Text style={styles.mealEmptyText}>添加</Text>
      </TouchableOpacity>
    );
  }

  const handleMarkComplete = () => {
    if (!plan.plan_id) return;
    onMarkComplete(plan.plan_id);
  };

  return (
    <TouchableOpacity
      style={[
        styles.mealFilled,
        { borderLeftColor: mealConfig.color, borderLeftWidth: 3 },
        plan.is_completed && styles.mealCompleted,
      ]}
      onPress={() => onMealPress(plan.id)}
    >
      <Text style={styles.mealName} numberOfLines={1}>{plan.name}</Text>
      <View style={styles.mealMeta}>
        <Text style={styles.mealTime}>⏱ {plan.prep_time}分钟</Text>
        {plan.is_baby_suitable && (
          <Text style={styles.babySuitableBadge}>👶</Text>
        )}
        {!plan.is_completed && plan.plan_id && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleMarkComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CheckIcon size={14} color={Colors.functional.success} />
          </TouchableOpacity>
        )}
        {plan.is_completed && (
          <Text style={styles.completedBadge}>✅</Text>
        )}
      </View>
    </TouchableOpacity>
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
  mealsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mealWrapper: {
    flex: 1,
  },
  mealLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mealLabelIcon: {
    fontSize: 12,
    marginRight: Spacing.xs,
  },
  mealLabelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealEmpty: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    minHeight: 70,
  },
  mealEmptyIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  mealEmptyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealFilled: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 70,
    ...Shadows.sm,
  },
  mealRefreshing: {
    opacity: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  mealMeta: {
    marginTop: 'auto',
  },
  mealTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealCompleted: {
    opacity: 0.6,
  },
  completeButton: {
    marginLeft: Spacing.xs,
    padding: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.functional.success}15`,
  },
  completedBadge: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  babySuitableBadge: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
});
