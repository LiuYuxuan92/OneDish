import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useUserInfo } from '../../hooks/useUsers';
import { ChevronRightIcon, UserIcon, HeartIcon, SettingsIcon, HelpCircleIcon, InfoIcon, ListIcon, UtensilsIcon } from '../../components/common/Icons';
import { BabyAgeCard } from '../../components/common/BabyAgeCard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

interface MenuItem {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
}

export function ProfileScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = React.useState(false);
  const { data: user, isLoading, error, refetch } = useUserInfo();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const mainMenuItems: MenuItem[] = [
    {
      icon: <UserIcon size={20} color={Colors.primary.main} />,
      title: '个人信息',
      subtitle: `${user?.family_size || 2}人家庭${user?.baby_age ? ` · ${user.baby_age}个月宝宝` : ''}`,
      onPress: () => navigation.navigate('EditProfile'),
      showArrow: true,
    },
    {
      icon: <HeartIcon size={20} color={Colors.functional.error} />,
      title: '我的收藏',
      subtitle: '查看已收藏的菜谱',
      onPress: () => navigation.navigate('Favorites'),
      showArrow: true,
    },
    {
      icon: <UtensilsIcon size={20} color={Colors.primary.main} />,
      title: '我的菜谱',
      subtitle: '搜索保存的菜谱',
      onPress: () => navigation.navigate('MyRecipes'),
      showArrow: true,
    },
    {
      icon: <ListIcon size={20} color={Colors.functional.success} />,
      title: '我的食材',
      subtitle: '管理家中食材库存',
      onPress: () => navigation.navigate('Inventory'),
      showArrow: true,
    },
    {
      icon: <SettingsIcon size={20} color={Colors.text.secondary} />,
      title: '设置',
      subtitle: '偏好设置与账号管理',
      onPress: () => navigation.navigate('Settings'),
      showArrow: true,
    },
  ];

  const moreMenuItems: MenuItem[] = [
    {
      icon: <HelpCircleIcon size={20} color={Colors.secondary.main} />,
      title: '帮助与反馈',
      onPress: () => {},
      showArrow: true,
    },
    {
      icon: <InfoIcon size={20} color={Colors.info} />,
      title: '关于我们',
      onPress: () => {},
      showArrow: true,
    },
  ];

  const MenuSection = ({ items, style }: { items: MenuItem[]; style?: any }) => (
    <View style={[styles.menuSection, style]}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.menuItem,
            index === items.length - 1 && styles.menuItemLast,
          ]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.menuIconContainer}>{item.icon}</View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
          </View>
          {item.showArrow && (
            <ChevronRightIcon size={20} color={Colors.text.tertiary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👨‍🍳</Text>
            </View>
            <View style={styles.userStatus}>
              <Text style={styles.statusIcon}>✓</Text>
            </View>
          </View>
          <Text style={styles.username}>{user?.username || '美食家'}</Text>
          <Text style={styles.userEmail}>{user?.email || '欢迎回来'}</Text>
          
          {/* 统计信息 */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.family_size || 2}</Text>
              <Text style={styles.statLabel}>家庭成员</Text>
            </View>
            <View style={styles.statDivider} />
            {user?.baby_age ? (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user.baby_age}</Text>
                  <Text style={styles.statLabel}>宝宝月龄</Text>
                </View>
                <View style={styles.statDivider} />
              </>
            ) : null}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>收藏菜谱</Text>
            </View>
          </View>
        </View>

        {/* 宝宝月龄卡片 - 当有宝宝时显示 */}
        {user?.baby_age ? (
          <View style={styles.babyAgeSection}>
            <BabyAgeCard
              babyAge={user.baby_age}
              editable
              onEdit={() => navigation.navigate('EditProfile')}
            />
          </View>
        ) : null}

        {/* 功能菜单 */}
        <MenuSection items={mainMenuItems} />
        
        {/* 更多选项 */}
        <MenuSection items={moreMenuItems} style={styles.moreSection} />

        {/* 版本信息 */}
        <Text style={styles.versionText}>简家厨 v1.0.0 · 让做饭变得简单</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  userCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  babyAgeSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.main,
  },
  avatarText: {
    fontSize: 40,
  },
  userStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.functional.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  statusIcon: {
    fontSize: 12,
    color: Colors.text.inverse,
    fontWeight: 'bold',
  },
  username: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border.light,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.main,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  menuSection: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  moreSection: {
    marginTop: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    color: Colors.text.disabled,
    marginTop: Spacing.xl,
  },
});
