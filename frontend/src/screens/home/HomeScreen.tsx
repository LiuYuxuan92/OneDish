import React from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, HomeTabParentParamList } from '../../types';
import { trackMainFlowEvent } from '../../analytics/mainFlow';
import { SearchIcon } from '../../components/common/Icons';
import { SkeletonCard } from '../../components/common/Skeleton';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { ActionGrid } from './ActionGrid';
import { useHomeDashboardViewModel } from './useHomeDashboardViewModel';
import { resolveMediaUrl } from '../../utils/media';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const vm = useHomeDashboardViewModel();
  const recipe = vm.recommendation.recipe;
  const currentStage = vm.recommendation.currentStage;
  const featuredRecommendation = vm.recommendationCards[0];

  const parentNavigation = navigation.getParent();
  const rootTabNavigation = parentNavigation as typeof parentNavigation & {
    navigate: <T extends keyof HomeTabParentParamList>(
      ...args: undefined extends HomeTabParentParamList[T]
        ? [screen: T] | [screen: T, params: HomeTabParentParamList[T]]
        : [screen: T, params: HomeTabParentParamList[T]]
    ) => void;
  };

  const nav = {
    shopping: () => {
      trackMainFlowEvent('shopping_list_generate_click', {
        source: 'home',
        screen: 'HomeScreen',
        recipeId: recipe?.id || null,
      });
      rootTabNavigation?.navigate('Plan', { screen: 'ShoppingList' });
    },
    search: () => rootTabNavigation?.navigate('Recipes', { screen: 'Search', params: undefined }),
    baby: () => rootTabNavigation?.navigate('Recipes', { screen: 'BabyStages' }),
    plan: () => rootTabNavigation?.navigate('Plan', { screen: 'WeeklyPlan' }),
    feeding: () => rootTabNavigation?.navigate('Profile', { screen: 'FeedingFeedback' }),
    inventory: () => rootTabNavigation?.navigate('Profile', { screen: 'Inventory' }),
    recipeDetail: (recipeId: string) => navigation.navigate('RecipeDetail', { recipeId }),
  };

  const quickActions = [
    { icon: '📅', text: '本周计划', iconBg: '#EEF4EF', onPress: nav.plan },
    { icon: '🥘', text: '找共食菜', iconBg: '#FBF1E6', onPress: nav.search },
    { icon: '👶', text: '喂养记录', iconBg: '#EDF5EE', onPress: nav.feeding },
    { icon: '🛒', text: '采购清单', iconBg: '#FAF1E3', onPress: nav.shopping },
  ];

  const topQuickEntries = vm.quickEntries.slice(0, 2);
  const homeHeroCover = resolveMediaUrl('/media/generated/covers/onedish-family-cover.jpg');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={vm.refresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        <View style={styles.page}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>今日厨房</Text>
                <Text style={styles.greeting}>{vm.header.greeting}</Text>
                <Text style={styles.subtitle}>{vm.header.subtitle}</Text>
              </View>

              <TouchableOpacity style={styles.searchEntry} onPress={nav.search} activeOpacity={0.86}>
                <SearchIcon size={18} color={Colors.primary.main} />
                <Text style={styles.searchEntryText}>搜菜谱</Text>
              </TouchableOpacity>
            </View>

            {homeHeroCover ? (
              <View style={styles.heroVisualCard}>
                <Image source={{ uri: homeHeroCover }} style={styles.heroVisualImage} resizeMode="cover" />
                <View style={styles.heroVisualOverlay}>
                  <Text style={styles.heroVisualBadge}>ONE DISH · TWO WAYS</Text>
                  <Text style={styles.heroVisualTitle}>一锅备菜，先顾全家，再顺手照顾宝宝。</Text>
                  <Text style={styles.heroVisualCaption}>把“今天吃什么”变成一眼能做决定的首屏入口。</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.focusCard}>
              <View style={styles.focusCopy}>
                <Text style={styles.focusLabel}>今天先从这里开始</Text>
                <Text style={styles.focusTitle}>{vm.todaySummary.primary}</Text>
                <Text style={styles.focusText}>{vm.todaySummary.secondary}</Text>
              </View>

              <View style={styles.focusActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={nav.plan}>
                  <Text style={styles.primaryButtonText}>打开周计划</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={nav.shopping}>
                  <Text style={styles.secondaryButtonText}>看采购缺口</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              {vm.todaySummaryCards.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.heroStatCard,
                    item.tone === 'warm' && styles.heroStatCardWarm,
                    item.tone === 'soft' && styles.heroStatCardSoft,
                  ]}
                >
                  <Text style={styles.heroStatValue}>{item.value}</Text>
                  <Text style={styles.heroStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {vm.dashboard.meals.length > 0 ? (
              <View style={styles.agendaCard}>
                <View style={styles.sectionRowBetween}>
                  <View>
                    <Text style={styles.cardTitle}>今天安排</Text>
                    <Text style={styles.cardCaption}>先看已经定下来的餐，再决定后面怎么补。</Text>
                  </View>
                  <TouchableOpacity onPress={nav.plan}>
                    <Text style={styles.linkText}>全部计划</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mealList}>
                  {vm.dashboard.meals.map((meal) => (
                    <View key={meal.id} style={styles.mealRow}>
                      <View style={[styles.mealDot, meal.done && styles.mealDotDone]} />
                      <View style={styles.mealMain}>
                        <Text style={styles.mealLabel}>{meal.mealLabel}</Text>
                        <Text style={styles.mealHint}>{meal.done ? '这餐已经完成' : '还可以继续补细节'}</Text>
                      </View>
                      <View style={[styles.mealStatus, meal.done && styles.mealStatusDone]}>
                        <Text style={[styles.mealStatusText, meal.done && styles.mealStatusTextDone]}>
                          {meal.done ? '已完成' : '已安排'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyStrip}>
                <Text style={styles.emptyStripText}>今天还没有安排，先挑一道共食菜，再回计划里补齐。</Text>
              </View>
            )}
          </View>

          {vm.reminders.length > 0 ? (
            <View style={styles.sectionBlock}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderScroll}>
                {vm.reminders.map((item: any) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.reminderCard,
                      item.tone === 'warning' && styles.reminderWarning,
                      item.tone === 'accent' && styles.reminderAccent,
                      item.tone === 'success' && styles.reminderSuccess,
                    ]}
                    onPress={item.key === 'shopping' ? nav.shopping : item.key === 'retry' ? nav.search : nav.feeding}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.reminderTitle}>{item.title}</Text>
                    <Text style={styles.reminderCta}>{item.cta}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <View style={styles.sectionRowBetween}>
              <View>
                <Text style={styles.sectionTitle}>今天优先做这道</Text>
                <Text style={styles.sectionCaption}>先把最值得做的一道菜定下来，再延伸今天后面的安排。</Text>
              </View>
              <TouchableOpacity onPress={nav.search}>
                <Text style={styles.linkText}>更多菜谱</Text>
              </TouchableOpacity>
            </View>

            {vm.isLoading ? (
              <View style={styles.skeletonContainer}>
                <SkeletonCard showImage showFooter />
              </View>
            ) : featuredRecommendation ? (
              <TouchableOpacity
                style={styles.featuredCard}
                onPress={() => nav.recipeDetail(featuredRecommendation.recipe.id)}
                activeOpacity={0.9}
              >
                <View style={styles.featuredHeader}>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>今日主推荐</Text>
                  </View>
                  {currentStage ? (
                    <View style={styles.featuredStageBadge}>
                      <Text style={styles.featuredStageBadgeText}>{currentStage.name}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.featuredTitle}>{featuredRecommendation.title}</Text>
                <Text style={styles.featuredReason}>{featuredRecommendation.reason}</Text>

                <View style={styles.featuredTagRow}>
                  {featuredRecommendation.tags.map((tag) => (
                    <View key={tag} style={styles.featuredTag}>
                      <Text style={styles.featuredTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.versionHints}>
                  <View style={styles.versionHintCard}>
                    <Text style={styles.versionHintLabel}>成人版</Text>
                    <Text style={styles.versionHintText}>先做共享底菜，再按大人口味补层次。</Text>
                  </View>
                  <View style={[styles.versionHintCard, styles.versionHintCardBaby]}>
                    <Text style={styles.versionHintLabel}>宝宝版</Text>
                    <Text style={styles.versionHintText}>提前分出一份，按阶段调整口感和颗粒度。</Text>
                  </View>
                </View>

                <View style={styles.featuredActions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => nav.recipeDetail(featuredRecommendation.recipe.id)}>
                    <Text style={styles.secondaryButtonText}>看详情</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={nav.plan}>
                    <Text style={styles.primaryButtonText}>加入计划</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>暂时没有推荐，下拉刷新后再看一眼。</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.toolsCard}>
              <ActionGrid actions={quickActions} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionRowBetween}>
              <View>
                <Text style={styles.sectionTitle}>继续找菜</Text>
                <Text style={styles.sectionCaption}>按入口去逛，比在长列表里来回翻更省劲。</Text>
              </View>
              <TouchableOpacity onPress={nav.baby}>
                <Text style={styles.linkText}>看辅食阶段</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {vm.quickFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={styles.filterChip}
                  onPress={() => rootTabNavigation?.navigate('Recipes', { screen: 'RecipeList', params: { ingredient: filter.label } })}
                >
                  <Text style={styles.filterChipText}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.quickEntryStack}>
              {topQuickEntries.map((entry, index) => (
                <TouchableOpacity
                  key={entry.key}
                  style={[styles.quickEntryCard, index === 0 && styles.quickEntryCardFeatured]}
                  onPress={entry.target === 'plan' ? nav.plan : entry.target === 'shopping' ? nav.shopping : nav.search}
                  activeOpacity={0.88}
                >
                  <View style={styles.quickEntryCopy}>
                    <Text style={styles.quickEntryKicker}>{index === 0 ? '优先入口' : '继续探索'}</Text>
                    <Text style={styles.quickEntryTitle}>{entry.label}</Text>
                    <Text style={styles.quickEntryHint}>{entry.hint}</Text>
                  </View>
                  <Text style={styles.quickEntryArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.inventoryCard} onPress={nav.inventory} activeOpacity={0.9}>
            <View style={styles.sectionRowBetween}>
              <View>
                <Text style={styles.sectionTitle}>库存与采购</Text>
                <Text style={styles.sectionCaption}>把家里已有食材和缺口放在一个顺手入口里。</Text>
              </View>
              <Text style={styles.linkText}>去查看</Text>
            </View>
            <Text style={styles.inventoryText}>
              采购准备度 {vm.shoppingSummary.readiness}% · 待处理 {vm.shoppingSummary.unchecked} 项
            </Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
  },
  page: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
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
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.4,
  },
  greeting: {
    marginTop: 4,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  searchEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchEntryText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroVisualCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  heroVisualImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 280 : 220,
  },
  heroVisualOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(31, 47, 37, 0.42)',
  },
  heroVisualBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.6,
  },
  heroVisualTitle: {
    marginTop: Spacing.sm,
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  heroVisualCaption: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.88)',
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  focusCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.tertiary,
    gap: Spacing.md,
  },
  focusCopy: {
    gap: Spacing.xs,
  },
  focusLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  focusTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  focusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  focusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroStatCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  heroStatCardWarm: {
    backgroundColor: '#FBF1E6',
  },
  heroStatCardSoft: {
    backgroundColor: '#EDF5EE',
  },
  heroStatValue: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  heroStatLabel: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  agendaCard: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
  },
  sectionRowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  cardCaption: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  linkText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  mealList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary.light,
  },
  mealDotDone: {
    backgroundColor: Colors.functional.success,
  },
  mealMain: {
    flex: 1,
  },
  mealLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  mealHint: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  mealStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FBF1E6',
  },
  mealStatusDone: {
    backgroundColor: '#EDF5EE',
  },
  mealStatusText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  mealStatusTextDone: {
    color: Colors.functional.success,
  },
  emptyStrip: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  emptyStripText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  sectionBlock: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  reminderScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  reminderCard: {
    width: 220,
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.xs,
  },
  reminderWarning: {
    backgroundColor: '#FFF4E8',
  },
  reminderAccent: {
    backgroundColor: Colors.background.tertiary,
  },
  reminderSuccess: {
    backgroundColor: '#EEF7F0',
  },
  reminderTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 20,
  },
  reminderCta: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  sectionCaption: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  skeletonContainer: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  featuredCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.md,
    ...Shadows.md,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.tertiary,
  },
  featuredBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  featuredStageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FBF1E6',
  },
  featuredStageBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  featuredTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 30,
  },
  featuredReason: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 21,
  },
  featuredTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  featuredTag: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  featuredTagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  versionHints: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  versionHintCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F3D8B7',
    gap: 4,
  },
  versionHintCardBaby: {
    backgroundColor: '#F6FBF8',
    borderColor: '#CFE7D7',
  },
  versionHintLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionHintText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  featuredActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  toolsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  quickEntryStack: {
    gap: Spacing.sm,
  },
  quickEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.xs,
  },
  quickEntryCardFeatured: {
    backgroundColor: Colors.background.tertiary,
  },
  quickEntryCopy: {
    flex: 1,
    gap: 4,
  },
  quickEntryKicker: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  quickEntryTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  quickEntryHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  quickEntryArrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.tertiary,
  },
  inventoryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  inventoryText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
