import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import { HomeNavigator } from './HomeNavigator';
import { RecipeNavigator } from './RecipeNavigator';
import { PlanNavigator } from './PlanNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { OfflineIndicator } from '../components/common/OfflineIndicator';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  icon: string;
  iconFocused: string;
  a11yLabel: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { name: 'Home', label: '首页', icon: 'home-outline', iconFocused: 'home', a11yLabel: '首页' },
  { name: 'Recipes', label: '菜谱', icon: 'restaurant-outline', iconFocused: 'restaurant', a11yLabel: '菜谱大全' },
  { name: 'Plan', label: '计划', icon: 'calendar-outline', iconFocused: 'calendar', a11yLabel: '一周计划' },
  { name: 'Profile', label: '我的', icon: 'person-outline', iconFocused: 'person', a11yLabel: '个人中心' },
];

function TabBarButton({
  config,
  isFocused,
  onPress,
  activeColor,
  inactiveColor,
}: {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 5,
      }),
      Animated.timing(dotOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dotOpacity, isFocused, scaleAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 5,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.tabButton, isFocused && styles.tabButtonActive]}
      onPress={handlePress}
      activeOpacity={0.72}
      accessibilityLabel={config.a11yLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View
        style={[
          styles.tabIconWrapper,
          isFocused && styles.tabIconWrapperActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={(isFocused ? config.iconFocused : config.icon) as any}
          size={22}
          color={isFocused ? activeColor : inactiveColor}
        />
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          isFocused && styles.tabLabelActive,
          {
            color: isFocused ? activeColor : inactiveColor,
            fontWeight: isFocused ? Typography.fontWeight.semibold : Typography.fontWeight.regular,
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>

      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: activeColor, opacity: dotOpacity },
        ]}
      />
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const activeColor = theme.Colors.primary.main;
  const inactiveColor = theme.Colors.text.tertiary;
  const bgColor = theme.Colors.background.elevated;
  const borderColor = theme.Colors.border.light;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 18 : 4),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const config = TAB_CONFIGS[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (route.name === 'Recipes') {
              navigation.navigate('Recipes' as any, { screen: 'RecipeList' } as any);
              return;
            }
            navigation.navigate(route.name as any);
          }
        };

        return (
          <TabBarButton
            key={route.key}
            config={config}
            isFocused={isFocused}
            onPress={onPress}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
        );
      })}
    </View>
  );
}

export function MainNavigator() {
  return (
    <>
      <OfflineIndicator />
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeNavigator} />
        <Tab.Screen name="Recipes" component={RecipeNavigator} options={{ unmountOnBlur: true }} />
        <Tab.Screen name="Plan" component={PlanNavigator} options={{ unmountOnBlur: true }} />
        <Tab.Screen name="Profile" component={ProfileNavigator} options={{ unmountOnBlur: true }} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        ...Shadows.lg,
        paddingBottom: 18,
      },
      android: {
        elevation: 10,
        paddingBottom: 4,
      },
      web: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: 720,
        paddingBottom: 0,
        boxShadow: '0 12px 32px rgba(34, 52, 43, 0.12)',
      },
      default: {
        paddingBottom: 4,
      },
    }),
    paddingTop: Spacing[2],
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    paddingVertical: Spacing[2.5],
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(72, 97, 84, 0.06)',
  },
  tabIconWrapper: {
    width: 46,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperActive: {
    backgroundColor: 'rgba(72, 97, 84, 0.12)',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
  },
  tabLabelActive: {
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 18,
    height: 4,
    borderRadius: BorderRadius.xs,
  },
});
