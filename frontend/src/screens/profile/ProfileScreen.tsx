// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const { data: user, isLoading, refetch } = useUserInfo();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = [
    { label: '家庭成员', value: `${user?.family_size || 2}` },
    { label: '宝宝月龄', value: user?.baby_age ? `${user.baby_age}` : '--' },
    { label: '收藏菜谱', value: '15' },
  ];

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
      subtitle: '回看保存过的一菜两吃',
      onPress: () => navigation.navigate('Favorites'),
      showArrow: true,
    },
    {
      icon: <UtensilsIcon size={20} color={Colors.primary.main} />,
      title: '我的投稿',
      subtitle: '创建 / 提交 / 发布一菜两吃',
      onPress: () => navigation.navigate('MyRecipes'),
      showArrow: true,
    },
    {
      icon: <ListIcon size={20} color={Colors.functional.success} />,
      title: '我的食材',
      subtitle: '管理家中库存与临期提醒',
      onPress: () => navigation.navigate('Inventory'),
      showArrow: true,
    },
  ];

  const secondaryMenuItems: MenuItem[] = [
    {
      icon: <UserIcon size={20} color={Colors.secondary.main} />,
      title: '家庭空间',
      subtitle: '共享计划、清单和成员协作',
      onPress: () => navigation.navigate('Family'),
      showArrow: true,
    },
    {
      icon: <HeartIcon size={20} color={Colors.secondary.main} />,
      title: '喂养反馈',
      subtitle: '查看真实反馈记录与重试建议',
      onPress: () => navigation.navigate('FeedingFeedback'),
      showArrow: true,
    },
    {
      icon: <InfoIcon size={20} color={Colors.primary.dark} />,
      title: '每周回顾',
      subtitle: '看本周做饭节奏和完成情况',
      onPress: () => navigation.navigate('WeeklyReview'),
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

  const supportItems: MenuItem[] = [
    {
      icon: <HelpCircleIcon size={20} color={Colors.secondary.main} />,
      title: '帮助与反馈',
      subtitle: '问题排查与意见反馈',
      onPress: () => {},
      showArrow: true,
    },
    {
      icon: <InfoIcon size={20} color={Colors.info} />,
      title: '关于我们',
      subtitle: '版本信息与产品说明',
      onPress: () => {},
      showArrow: true,
    },
  ];

  const MenuSection = ({ title, caption, items }: { title: string; caption?: string; items: MenuItem[] }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.menuItem, index === items.length - 1 && styles.menuItemLast]}
          onPress={item.onPress}
          activeOpacity={0.75}
        >
          <View style={styles.menuIconContainer}>{item.icon}</View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
          </View>
          {item.showArrow ? <ChevronRightIcon size={20} color={Colors.text.tertiary} /> : null}
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>👨‍🍳</Text>
              </View>
              <View style={styles.userStatus}>
                <Text style={styles.statusIcon}>✓</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.profileActionButton} onPress={() => setShowQuickLinks((prev) => !prev)}>
              <Text style={styles.profileActionButtonText}>{showQuickLinks ? '收起快捷入口' : '快捷入口'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileEyebrow}>个人中心</Text>
          <Text style={styles.username}>{user?.username || '美食家'}</Text>
          <Text style={styles.userEmail}>{user?.email || '欢迎回来'}</Text>
          <Text style={styles.profileNarrative}>把家庭资料、宝宝阶段、收藏、库存和反馈回顾，收成一个更清爽的个人工作台。</Text>

          <View style={styles.statsRow}>
            {stats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {showQuickLinks ? (
            <View style={styles.quickLinksRow}>
              <TouchableOpacity style={styles.quickLinkChip} onPress={() => navigation.navigate('Family')}>
                <Text style={styles.quickLinkChipText}>家庭空间</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickLinkChip} onPress={() => navigation.navigate('FeedingFeedback')}>
                <Text style={styles.quickLinkChipText}>喂养反馈</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickLinkChip} onPress={() => navigation.navigate('WeeklyReview')}>
                <Text style={styles.quickLinkChipText}>每周回顾</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {user?.baby_age ? (
          <View style={styles.babyAgeSection}>
            <BabyAgeCard babyAge={user.baby_age} editable onEdit={() => navigation.navigate('EditProfile')} />
          </View>
        ) : null}

        <MenuSection title="常用功能" caption="日常最常回来的入口先放前面" items={mainMenuItems} />
        <MenuSection title="家庭与反馈" caption="协作、反馈、回顾放到同一组" items={secondaryMenuItems} />
        <MenuSection title="帮助与信息" items={supportItems} />

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
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
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
  heroCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.primary,
    ...Shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.main,
  },
  avatarText: {
    fontSize: 38,
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
  profileActionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  profileActionButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  profileEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  profileNarrative: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.main,
  },
  statLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  quickLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickLinkChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.light,
  },
  quickLinkChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  babyAgeSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionCaption: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
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
    lineHeight: 18,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    color: Colors.text.disabled,
    marginTop: Spacing.lg,
  },
});
