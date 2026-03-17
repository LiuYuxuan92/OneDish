// @ts-nocheck
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { BabyAgeCard } from '../../components/common/BabyAgeCard';
import {
  ChevronRightIcon,
  HeartIcon,
  HelpCircleIcon,
  InfoIcon,
  ListIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
  UtensilsIcon,
} from '../../components/common/Icons';
import { useUserInfo } from '../../hooks/useUsers';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { resolveMediaUrl } from '../../utils/media';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

interface MenuItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MenuSection({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: MenuItem[];
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.menuSectionLead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>

      {items.map((item, index) => (
        <TouchableOpacity
          key={`${item.title}-${index}`}
          style={[styles.menuItem, index === items.length - 1 && styles.menuItemLast]}
          onPress={item.onPress}
          activeOpacity={0.82}
        >
          <View style={styles.menuIconWrap}>{item.icon}</View>
          <View style={styles.menuCopy}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </View>
          <ChevronRightIcon size={18} color={Colors.text.tertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = React.useState(false);
  const { data: user, isLoading, refetch } = useUserInfo();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const userName = user?.username || '新手爸妈的厨房空间';
  const avatarText = userName.trim().slice(0, 1) || '家';
  const avatarUrl = resolveMediaUrl(user?.avatar_url);
  const excludeCount = Array.isArray(user?.preferences?.exclude_ingredients)
    ? user.preferences.exclude_ingredients.length
    : 0;

  const priorityCards = [
    {
      key: 'favorites',
      title: '我的收藏',
      subtitle: '把值得反复做的菜和灵感收在这里，临时做饭时不用再重找。',
      action: '打开收藏',
      tone: 'warm',
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      key: 'membership',
      title: '成长会员',
      subtitle: '查看 AI 次数、共食能力和成长型权益，知道现在能用到哪里。',
      action: '查看权益',
      tone: 'primary',
      onPress: () => navigation.navigate('Membership'),
    },
    {
      key: 'inventory',
      title: '我的食材',
      subtitle: '库存和缺口放在一个入口里，买菜和备餐更顺手。',
      action: '查看库存',
      tone: 'default',
      onPress: () => navigation.navigate('Inventory'),
    },
    {
      key: 'feedback',
      title: '喂养反馈',
      subtitle: '把宝宝真实接受情况记录下来，后续推荐会更贴近你家。',
      action: '继续记录',
      tone: 'default',
      onPress: () => navigation.navigate('FeedingFeedback'),
    },
  ];

  const accountItems: MenuItem[] = [
    {
      icon: <UserIcon size={18} color={Colors.primary.main} />,
      title: '个人资料',
      subtitle: user?.baby_age
        ? `${user.baby_age} 个月宝宝 · ${user?.family_size || 2} 人家庭`
        : '补充宝宝阶段、家庭人数和基础信息',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: <UtensilsIcon size={18} color={Colors.secondary.main} />,
      title: '我的投稿',
      subtitle: '整理和发布你自己的家庭菜谱。',
      onPress: () => navigation.navigate('MyRecipes'),
    },
    {
      icon: <ListIcon size={18} color={Colors.functional.success} />,
      title: '家庭空间',
      subtitle: '查看家人协作、共享计划和购物清单。',
      onPress: () => navigation.navigate('Family'),
    },
  ];

  const habitItems: MenuItem[] = [
    {
      icon: <HeartIcon size={18} color={Colors.functional.error} />,
      title: '每周回顾',
      subtitle: '回看本周做饭节奏、执行情况和反馈积累。',
      onPress: () => navigation.navigate('WeeklyReview'),
    },
    {
      icon: <SettingsIcon size={18} color={Colors.text.secondary} />,
      title: '设置',
      subtitle: '管理账号、偏好、缓存和界面配置。',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: <StarIcon size={18} color={Colors.functional.warning} filled />,
      title: '会员与配额',
      subtitle: '随时确认当前 AI 使用次数和权益状态。',
      onPress: () => navigation.navigate('Membership'),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: <HelpCircleIcon size={18} color={Colors.primary.main} />,
      title: '帮助与反馈',
      subtitle: '遇到问题先看这里，也可以继续去设置页处理。',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: <InfoIcon size={18} color={Colors.functional.info} />,
      title: '关于简家厨',
      subtitle: '查看产品版本和当前空间的基本说明。',
      onPress: () => navigation.navigate('Membership'),
    },
  ];

  if (isLoading && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理你的个人空间...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarBlock}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarText}</Text>
                  </View>
                )}
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>我的空间</Text>
                  <Text style={styles.heroTitle}>{userName}</Text>
                  <Text style={styles.heroSubtitle}>
                    {user?.email || '把宝宝阶段、收藏、库存、反馈和家庭协作收在一个稳定入口里。'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.heroAction} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.heroActionText}>编辑资料</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{user?.family_size || 2}</Text>
                <Text style={styles.heroStatLabel}>家庭成员</Text>
              </View>
              <View style={[styles.heroStatCard, styles.heroStatCardWarm]}>
                <Text style={styles.heroStatValue}>{user?.baby_age ? `${user.baby_age} 月` : '--'}</Text>
                <Text style={styles.heroStatLabel}>宝宝月龄</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{excludeCount > 0 ? excludeCount : '--'}</Text>
                <Text style={styles.heroStatLabel}>忌口记录</Text>
              </View>
            </View>

            <View style={styles.heroHighlights}>
              <View style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>收藏和反馈都在这里继续</Text>
              </View>
              <View style={styles.highlightChip}>
                <Text style={styles.highlightChipText}>做饭前先扫一眼就知道下一步</Text>
              </View>
            </View>
          </View>

          {user?.baby_age ? (
            <View style={styles.babyAgeSection}>
              <BabyAgeCard babyAge={user.baby_age} editable onEdit={() => navigation.navigate('EditProfile')} />
            </View>
          ) : null}

          <View style={styles.prioritySection}>
            <View style={styles.sectionLead}>
              <Text style={styles.sectionLeadTitle}>今天继续</Text>
              <Text style={styles.sectionLeadDesc}>把最高频入口放在前面，减少来回跳转和找入口的时间。</Text>
            </View>

            <View style={styles.priorityGrid}>
              {priorityCards.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.priorityCard,
                    item.tone === 'primary' && styles.priorityCardPrimary,
                    item.tone === 'warm' && styles.priorityCardWarm,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.86}
                >
                  <Text style={styles.priorityCardTitle}>{item.title}</Text>
                  <Text style={styles.priorityCardSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.priorityCardAction}>{item.action}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <MenuSection
            title="资料与家庭"
            description="围绕你自己和家人的常用信息与内容入口。"
            items={accountItems}
          />
          <MenuSection
            title="习惯与设置"
            description="把日常回顾、偏好和会员状态放在一起管理。"
            items={habitItems}
          />
          <MenuSection title="帮助与说明" items={supportItems} />

          <Text style={styles.versionText}>简家厨 v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
  },
  page: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
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
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatarBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 2,
    borderColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 2,
    borderColor: Colors.primary.light,
  },
  avatarText: {
    fontSize: 28,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.bold,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 21,
  },
  heroAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.tertiary,
  },
  heroActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroStatCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  heroStatCardWarm: {
    backgroundColor: '#FBF1E6',
  },
  heroStatValue: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  heroStatLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  highlightChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  highlightChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  babyAgeSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  prioritySection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionLead: {
    marginBottom: Spacing.sm,
  },
  sectionLeadTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionLeadDesc: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  priorityCard: {
    width: '48.5%',
    minHeight: 148,
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  priorityCardPrimary: {
    backgroundColor: Colors.background.tertiary,
  },
  priorityCardWarm: {
    backgroundColor: '#FBF1E6',
  },
  priorityCardTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  priorityCardSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  priorityCardAction: {
    marginTop: 'auto',
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuSectionLead: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  versionText: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
});
