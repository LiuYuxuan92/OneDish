import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { PreferenceSettingsScreen } from '../screens/profile/PreferenceSettingsScreen';
import { AISettingsScreen } from '../screens/settings/AISettingsScreen';
import { FavoritesScreen } from '../screens/profile/FavoritesScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { InventoryScreen } from '../screens/profile/InventoryScreen';
import { MyRecipesScreen } from '../screens/profile/MyRecipesScreen';
import { FamilyScreen } from '../screens/profile/FamilyScreen';
import { WeeklyPlanScreen } from '../screens/plan/WeeklyPlanScreen';
import { ShoppingListScreen } from '../screens/plan/ShoppingListScreen';
import { FeedingFeedbackScreen } from '../screens/feedback/FeedingFeedbackScreen';
import { WeeklyReviewScreen } from '../screens/feedback/WeeklyReviewScreen';
import { RecipeDetailScreen } from '../screens/recipe/RecipeDetailScreen';
import { RecipeNavigator } from './RecipeNavigator';
import { PlanNavigator } from './PlanNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { buildHeaderOptions } from './headerOptions';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  const { theme } = useTheme();
  const headerOptions = buildHeaderOptions(theme);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '我的', headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '设置' }}
      />
      <Stack.Screen
        name="PreferenceSettings"
        component={PreferenceSettingsScreen}
        options={{ title: '饮食偏好' }}
      />
      <Stack.Screen
        name="AISettings"
        component={AISettingsScreen}
        options={{ title: 'AI 配置' }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: '我的收藏' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: '编辑资料' }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: '我的食材' }}
      />
      <Stack.Screen
        name="MyRecipes"
        component={MyRecipesScreen}
        options={{ title: '我的菜谱' }}
      />
      <Stack.Screen
        name="Family"
        component={FamilyScreen}
        options={{ title: '家庭空间' }}
      />
      <Stack.Screen
        name="FamilyWeeklyPlan"
        options={{ title: '家庭周计划' }}
      >
        {() => <WeeklyPlanScreen navigation={undefined as any} route={undefined as any} />}
      </Stack.Screen>
      <Stack.Screen
        name="FamilyShoppingList"
        options={{ title: '家庭购物清单' }}
      >
        {() => <ShoppingListScreen navigation={undefined as any} route={undefined as any} />}
      </Stack.Screen>
      <Stack.Screen
        name="FeedingFeedback"
        component={FeedingFeedbackScreen}
        options={{ title: '喂养反馈' }}
      />
      <Stack.Screen
        name="WeeklyReview"
        component={WeeklyReviewScreen}
        options={{ title: '每周回顾' }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: '菜谱详情' }}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipeNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Plan"
        component={PlanNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
