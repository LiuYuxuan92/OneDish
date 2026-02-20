import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../types';
import { WeeklyPlanScreen } from '../screens/plan/WeeklyPlanScreen';
import { ShoppingListScreen } from '../screens/plan/ShoppingListScreen';
import { ShoppingListHistoryScreen } from '../screens/plan/ShoppingListHistoryScreen';
import { ShoppingListDetailScreen } from '../screens/plan/ShoppingListDetailScreen';
import { RecipeDetailScreen } from '../screens/recipe/RecipeDetailScreen';
import { useTheme } from '../contexts/ThemeContext';
import { buildHeaderOptions } from './headerOptions';
import { CookingModeScreen } from '../screens/recipe/CookingModeScreen';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export function PlanNavigator() {
  const { theme } = useTheme();
  const headerOptions = buildHeaderOptions(theme);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="WeeklyPlan"
        component={WeeklyPlanScreen}
        options={{ title: '一周计划' }}
      />
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: '今日清单' }}
      />
      <Stack.Screen
        name="ShoppingListHistory"
        component={ShoppingListHistoryScreen}
        options={{ title: '历史清单' }}
      />
      <Stack.Screen
        name="ShoppingListDetail"
        component={ShoppingListDetailScreen}
        options={{ title: '清单详情' }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: '菜谱详情' }}
      />
      <Stack.Screen
        name="CookingMode"
        component={CookingModeScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
