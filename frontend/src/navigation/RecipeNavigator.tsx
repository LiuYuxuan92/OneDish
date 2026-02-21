import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RecipeStackParamList } from '../types';
import { RecipeListScreen } from '../screens/recipe/RecipeListScreen';
import { RecipeDetailScreen } from '../screens/recipe/RecipeDetailScreen';
import { SearchScreen } from '../screens/recipe/SearchScreen';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { SearchIcon } from '../components/common/Icons';
import { useTheme } from '../contexts/ThemeContext';
import { buildHeaderOptions } from './headerOptions';
import { CookingModeScreen } from '../screens/recipe/CookingModeScreen';
import { BabyStageScreen } from '../screens/recipe/BabyStageScreen';
import { StageDetailScreen } from '../screens/recipe/StageDetailScreen';

const Stack = createNativeStackNavigator<RecipeStackParamList>();

export function RecipeNavigator() {
  const { theme } = useTheme();
  const headerOptions = buildHeaderOptions(theme);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="RecipeList"
        component={RecipeListScreen}
        options={({ navigation }) => ({
          title: '菜谱大全',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Search')}
              style={styles.searchButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel="搜索菜谱"
              accessibilityRole="button"
            >
              <SearchIcon size={22} color={theme.Colors.primary.main} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: '菜谱详情' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: '搜索菜谱' }}
      />
      <Stack.Screen
        name="CookingMode"
        component={CookingModeScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="BabyStages"
        component={BabyStageScreen}
        options={{ title: '辅食体系' }}
      />
      <Stack.Screen
        name="StageDetail"
        component={StageDetailScreen}
        options={({ route }) => ({ title: route.params.stageName })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  searchButton: {
    marginRight: 4,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
