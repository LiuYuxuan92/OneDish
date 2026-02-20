import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../types';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { FavoritesScreen } from '../screens/profile/FavoritesScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { InventoryScreen } from '../screens/profile/InventoryScreen';
import { MyRecipesScreen } from '../screens/profile/MyRecipesScreen';
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
    </Stack.Navigator>
  );
}
