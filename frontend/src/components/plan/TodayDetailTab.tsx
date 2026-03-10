import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { MEAL_LABELS, MEAL_TYPES } from '../../hooks/useWeeklyPlanState';

interface TodayDetailTabProps {
  currentDate: string;
  weeklyData: { plans?: Record<string, Record<string, unknown>> } | undefined;
  navigation: { navigate: (screen: string, params: Record<string, string>) => void };
}

export function TodayDetailTab({ currentDate, weeklyData, navigation }: TodayDetailTabProps) {
  const todayPlans = weeklyData?.plans?.[currentDate];

  if (!todayPlans || Object.keys(todayPlans).length === 0) {
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
      {MEAL_TYPES.map(mealType => {
        const plan = todayPlans[mealType] as {
          id: string;
          name: string;
          prep_time: number;
          difficulty?: string;
          ingredients?: Array<{ name: string }>;
        } | null;
        const mealConfig = MEAL_LABELS[mealType];

        if (!plan) {return null;}

        return (
          <TouchableOpacity
            key={mealType}
            style={[styles.todayMealCard, { borderLeftColor: mealConfig.color }]}
            onPress={() => navigation.navigate('RecipeDetail' as never, { recipeId: plan.id } as never)}
          >
            <View style={styles.todayMealHeader}>
              <Text style={styles.todayMealIcon}>{mealConfig.icon}</Text>
              <View style={styles.todayMealInfo}>
                <Text style={styles.todayMealLabel}>{mealConfig.label}</Text>
                <Text style={styles.todayMealName}>{plan.name}</Text>
              </View>
              <View style={styles.todayMealMeta}>
                <Text style={styles.todayMealTime}>⏱ {plan.prep_time}分钟</Text>
                {plan.difficulty && (
                  <Text style={styles.todayMealDifficulty}>{plan.difficulty}</Text>
                )}
              </View>
            </View>

            {plan.ingredients && plan.ingredients.length > 0 && (
              <View style={styles.todayMealIngredients}>
                <Text style={styles.todayMealIngredientsTitle}>主要食材：</Text>
                <Text style={styles.todayMealIngredientsList} numberOfLines={2}>
                  {plan.ingredients.slice(0, 3).map((ing) => ing.name).join('、')}
                  {plan.ingredients.length > 3 ? '...' : ''}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  todayDetailContainer: {
    padding: Spacing.lg,
  },
  todayMealCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    ...Shadows.md,
  },
  todayMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayMealIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  todayMealInfo: {
    flex: 1,
  },
  todayMealLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  todayMealName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  todayMealMeta: {
    alignItems: 'flex-end',
  },
  todayMealTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  todayMealDifficulty: {
    fontSize: Typography.fontSize['2xs'],
    color: Colors.text.secondary,
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  todayMealIngredients: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  todayMealIngredientsTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  todayMealIngredientsList: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
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
