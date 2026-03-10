import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trackMainFlowEvent } from '../../analytics/mainFlow';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, HomeTabParentParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { SkeletonCard } from '../../components/common/Skeleton';
import { SearchIcon } from '../../components/common/Icons';

import { useHomeDashboardViewModel } from './useHomeDashboardViewModel';
import { HomeDebugPanel } from './HomeDebugPanel';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const vm = useHomeDashboardViewModel();
  const { recommendation } = vm;
  const recipe = recommendation.recipe;
  const currentStage = recommendation.currentStage;

  useEffect(() => {
    if (!recipe?.id) return;
  }, [recipe?.id]);

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
      trackMainFlowEvent('shopping_list_generate_click', { source: 'home', screen: 'HomeScreen', recipeId: recipe?.id || null });
      rootTabNavigation?.navigate('Plan', { screen: 'ShoppingList' });
    },
    search: () => rootTabNavigation?.navigate('Recipes', { screen: 'Search' }),
    baby: () => rootTabNavigation?.navigate('Recipes', { screen: 'BabyStages' }),
    plan: () => rootTabNavigation?.navigate('Plan', { screen: 'WeeklyPlan' }),
    feeding: () => rootTabNavigation?.navigate('Profile', { screen: 'FeedingFeedback' }),
    inventory: () => rootTabNavigation?.navigate('Profile', { screen: 'Inventory' }),
    recipeDetail: (recipeId: string) => navigation.navigate('RecipeDetail', { recipeId }),
  };

  const quickActions = [
    { key: 'plan', emoji: '📅', title: '计划', subtitle: '安排本周与今天', onPress: nav.plan },
    { key: 'dual', emoji: '🍲', title: '找一菜两吃', subtitle: '直接去 Search', onPress: nav.search },
    { key: 'feeding', emoji: '🍼', title: '记录喂养', subtitle: '保留反馈闭环入口', onPress: nav.feeding },
    { key: 'shopping', emoji: '🛒', title: '购物清单', subtitle: '看准备度与缺口', onPress: nav.shopping },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={vm.refresh} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{vm.header.greeting}</Text>
              <Text style={styles.subtitle}>{vm.header.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.searchEntry} onPress={nav.search}>
              <SearchIcon size={18} color={Colors.primary.main} />
              <Text style={styles.searchEntryText}>搜索</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.planCard} onPress={nav.plan} activeOpacity={0.9}>
            <View style={styles.sectionRowBetween}>
              <Text style={styles.planTitle}>Today Dashboard</Text>
              <Text style={styles.planAction}>进入周计划</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statValue}>{vm.dashboard.plannedCount}</Text><Text style={styles.statLabel}>已计划</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{vm.dashboard.cookedCount}</Text><Text style={styles.statLabel}>已完成</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{vm.dashboard.undecidedCount}</Text><Text style={styles.statLabel}>待决定</Text></View>
            </View>
            <View style={styles.mealList}>
              {vm.dashboard.meals.length > 0 ? vm.dashboard.meals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <View>
                    <Text style={styles.mealLabel}>{meal.mealLabel}</Text>
                    <Text style={styles.mealHint}>{meal.done ? '已完成' : '已计划，可继续补细节'}</Text>
                  </View>
                  <View style={[styles.mealStatus, meal.done && styles.mealStatusDone]}>
                    <Text style={[styles.mealStatusText, meal.done && styles.mealStatusTextDone]}>{meal.done ? 'Done' : 'Planned'}</Text>
                  </View>
                </View>
              )) : <Text style={styles.emptyHint}>今天还没有安排，去 Search 或 WeeklyPlan 补齐。</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.key} style={styles.quickCard} onPress={action.onPress} activeOpacity={0.9}>
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
                <Text style={styles.quickTitle}>{action.title}</Text>
                <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {vm.reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Strip</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderScroll}>
              {vm.reminders.map((item: any) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.reminderCard, item.tone === 'warning' && styles.reminderWarning, item.tone === 'accent' && styles.reminderAccent, item.tone === 'success' && styles.reminderSuccess]}
                  onPress={item.key === 'shopping' ? nav.shopping : item.key === 'retry' ? nav.search : nav.feeding}
                >
                  <Text style={styles.reminderTitle}>{item.title}</Text>
                  <Text style={styles.reminderCta}>{item.cta}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionRowBetween}>
            <Text style={styles.sectionTitle}>One Dish, Two Ways</Text>
            <TouchableOpacity onPress={nav.search}><Text style={styles.linkText}>去搜索</Text></TouchableOpacity>
          </View>
          <Text style={styles.sectionCaption}>保留真实推荐逻辑，同时把一菜两吃入口抬到首页主视图。</Text>
          {vm.isLoading ? (
            <View style={styles.skeletonContainer}><SkeletonCard showImage showFooter /></View>
          ) : vm.recommendationCards.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationScroll}>
              {vm.recommendationCards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.recommendationCard} onPress={() => nav.recipeDetail(card.recipe.id)} activeOpacity={0.92}>
                  <View style={styles.recommendationBadge}><Text style={styles.recommendationBadgeText}>主推荐</Text></View>
                  <Text style={styles.recommendationTitle}>{card.title}</Text>
                  <Text style={styles.recommendationReason}>{card.reason}</Text>
                  <View style={styles.tagRow}>
                    {card.tags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
                    {currentStage ? <View style={[styles.tag, styles.tagPositive]}><Text style={[styles.tagText, styles.tagPositiveText]}>{currentStage.name}</Text></View> : null}
                  </View>
                  <View style={styles.recommendationActions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => nav.recipeDetail(card.recipe.id)}><Text style={styles.secondaryButtonText}>看详情</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={nav.plan}><Text style={styles.primaryButtonText}>进计划</Text></TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}><Text style={styles.emptyHint}>暂无推荐，稍后下拉刷新。</Text></View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Filters</Text>
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
        </View>

        <TouchableOpacity style={[styles.section, styles.inventoryCard]} onPress={nav.inventory} activeOpacity={0.9}>
          <View style={styles.sectionRowBetween}>
            <Text style={styles.sectionTitle}>库存 / 场景 / 计划入口</Text>
            <Text style={styles.linkText}>去查看</Text>
          </View>
          <Text style={styles.inventoryText}>购物准备度 {vm.shoppingSummary.readiness}% · 待处理 {vm.shoppingSummary.unchecked} 项。保留库存优先、场景搜索、计划入口等真实能力。</Text>
        </TouchableOpacity>

        <HomeDebugPanel />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { flex: 1 },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
    flexGrow: 1,
  },
  hero: { padding: Spacing.lg, paddingBottom: Spacing.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  greeting: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  subtitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  searchEntry: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.primary.light },
  searchEntryText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  planCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, ...Shadows.md },
  planTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  planAction: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  statLabel: { marginTop: 2, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  mealList: { marginTop: Spacing.md, gap: Spacing.sm },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  mealLabel: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  mealHint: { marginTop: 2, fontSize: Typography.fontSize.xs, color: Colors.text.tertiary },
  mealStatus: { backgroundColor: '#FFF4E8', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  mealStatusDone: { backgroundColor: '#EAF7EC' },
  mealStatusText: { fontSize: Typography.fontSize.xs, color: Colors.primary.dark, fontWeight: Typography.fontWeight.semibold },
  mealStatusTextDone: { color: Colors.secondary.dark },
  section: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.sm },
  sectionCaption: { marginTop: -4, marginBottom: Spacing.md, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  sectionRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  linkText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard: { width: '48%', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.md, minHeight: 104, ...Shadows.sm },
  quickEmoji: { fontSize: 24, marginBottom: Spacing.sm },
  quickTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  quickSubtitle: { marginTop: 4, fontSize: Typography.fontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  reminderScroll: { gap: Spacing.sm },
  reminderCard: { width: 220, borderRadius: BorderRadius.xl, padding: Spacing.md, backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.light },
  reminderWarning: { backgroundColor: '#FFF8E8', borderColor: '#F3D56A' },
  reminderAccent: { backgroundColor: '#EEF4FF', borderColor: '#B8D0FF' },
  reminderSuccess: { backgroundColor: '#EEF9F0', borderColor: '#AAD9B4' },
  reminderTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, lineHeight: 20 },
  reminderCta: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  skeletonContainer: { paddingVertical: Spacing.sm },
  recommendationScroll: { gap: Spacing.md },
  recommendationCard: { width: 300, backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], padding: Spacing.lg, ...Shadows.md },
  recommendationBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary.light, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginBottom: Spacing.md },
  recommendationBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.primary.dark, fontWeight: Typography.fontWeight.bold },
  recommendationTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  recommendationReason: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  tag: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  tagPositive: { backgroundColor: '#EEF9F0' },
  tagText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  tagPositiveText: { color: Colors.secondary.dark },
  recommendationActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryButton: { flex: 1, backgroundColor: Colors.primary.main, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  primaryButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  secondaryButton: { flex: 1, backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  secondaryButtonText: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  filterRow: { gap: Spacing.sm },
  filterChip: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border.light },
  filterChipText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  inventoryCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], marginHorizontal: Spacing.lg, paddingTop: Spacing.lg, ...Shadows.sm },
  inventoryText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 21 },
  emptyCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg },
  emptyHint: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
});
