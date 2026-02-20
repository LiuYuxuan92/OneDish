import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import { HomeNavigator } from './HomeNavigator';
import { RecipeNavigator } from './RecipeNavigator';
import { PlanNavigator } from './PlanNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { Typography, Spacing } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { OfflineIndicator } from '../components/common/OfflineIndicator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// 标签配置
interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  icon: string;       // Ionicons 未激活
  iconFocused: string; // Ionicons 激活
  a11yLabel: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    name: 'Home',
    label: '首页',
    icon: 'home-outline',
    iconFocused: 'home',
    a11yLabel: '首页',
  },
  {
    name: 'Recipes',
    label: '菜谱',
    icon: 'restaurant-outline',
    iconFocused: 'restaurant',
    a11yLabel: '菜谱大全',
  },
  {
    name: 'Plan',
    label: '计划',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
    a11yLabel: '一周计划',
  },
  {
    name: 'Profile',
    label: '我的',
    icon: 'person-outline',
    iconFocused: 'person',
    a11yLabel: '个人中心',
  },
];

// ============================================
// 单个 Tab 按钮（带弹性动画）
// ============================================
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
        toValue: isFocused ? 1.12 : 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
      Animated.timing(dotOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused, scaleAnim, dotOpacity]);

  const handlePress = () => {
    // 按下动画反馈
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.12 : 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={config.a11yLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View
        style={[styles.tabIconWrapper, { transform: [{ scale: scaleAnim }] }]}
      >
        <Ionicons
          name={(isFocused ? config.iconFocused : config.icon) as any}
          size={24}
          color={isFocused ? activeColor : inactiveColor}
        />
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? activeColor : inactiveColor,
            fontWeight: isFocused
              ? Typography.fontWeight.semibold
              : Typography.fontWeight.regular,
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>

      {/* 活跃指示点 */}
      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: activeColor, opacity: dotOpacity },
        ]}
      />
    </TouchableOpacity>
  );
}

// ============================================
// 自定义底部导航栏
// ============================================
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const activeColor = theme.Colors.primary.main;
  const inactiveColor = theme.Colors.neutral.gray400;
  const bgColor = theme.Colors.background.primary;
  const borderColor = theme.Colors.border.light;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
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

// ============================================
// 主导航器
// ============================================
export function MainNavigator() {
  return (
    <>
    <OfflineIndicator />
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipeNavigator}
      />
      <Tab.Screen
        name="Plan"
        component={PlanNavigator}
        options={{ unmountOnBlur: true }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ unmountOnBlur: true }}
      />
    </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        paddingBottom: 20, // safe area for iPhone notch
      },
      android: {
        elevation: 8,
        paddingBottom: 4,
      },
      web: {
        paddingBottom: 4,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
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
    paddingVertical: Spacing[2],
    minHeight: 56,
    position: 'relative',
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
