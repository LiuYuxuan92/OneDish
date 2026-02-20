import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { RecipeDetailScreen } from '../screens/recipe/RecipeDetailScreen';
import { useTheme } from '../contexts/ThemeContext';
import { buildHeaderOptions } from './headerOptions';
import { CookingModeScreen } from '../screens/recipe/CookingModeScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  const { theme } = useTheme();
  const headerOptions = buildHeaderOptions(theme);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '简家厨', headerShown: false }}
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
