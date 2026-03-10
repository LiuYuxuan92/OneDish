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
import { ActionGrid } from './ActionGrid';

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
    search: () => rootTabNavigation?.navigate('Recipes', { screen: 'Search', params: undefined }),
    baby: () => rootTabNavigation?.navigate('Recipes', { screen: 'BabyStages' }),
    plan: () => rootTabNavigation?.navigate('Plan', { screen: 'WeeklyPlan' }),
    feeding: () => rootTabNavigation?.navigate('Profile', { screen: 'FeedingFeedback' }),
    inventory: () => rootTabNavigation?.navigate('Profile', { screen: 'Inventory' }),
    recipeDetail: (recipeId: string) => navigation.navigate('RecipeDetail', { recipeId }),
  };

  const quickActions = [
    { icon: '📅', text: '计划', iconBg: '#EEF4FF', onPress: nav.plan },
    { icon: '🍲', text: '共享菜', iconBg: '#FFF4E8', onPress: nav.search },
    { icon: '🍼', text: '喂养', iconBg: '#EEF9F0', onPress: nav.feeding },
    { icon: '🛒', text: '采购', iconBg: '#FFF8E8', onPress: nav.shopping },
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
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>今日主页</Text>
              <Text style={styles.greeting}>{vm.header.greeting}</Text>
              <Text style={styles.subtitle}>{vm.header.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.searchEntry} onPress={nav.search}>
              <SearchIcon size={18} color={Colors.primary.main} />
              <Text style={styles.searchEntryText}>搜索</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.todayCard}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryCopyBlock}>
                <Text style={styles.summaryEyebrow}>今日摘要</Text>
                <Text style={styles.summaryPrimary}>{vm.todaySummary.primary}</Text>
                <Text style={styles.summarySecondary}>{vm.todaySummary.secondary}</Text>
              </View>
              <TouchableOpacity style={styles.inlineLinkPill} onPress={nav.plan}>
                <Text style={styles.inlineLinkPillText}>看周计划</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryMiniStatsRow}>
              {vm.todaySummaryCards.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.summaryMiniCard,
                    item.tone === 'warm' && styles.summaryMiniCardWarm,
                    item.tone === 'soft' && styles.summaryMiniCardSoft,
                  ]}
                >
                  <Text style={styles.summaryMiniValue}>{item.value}</Text>
                  <Text style={styles.summaryMiniLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.mealListCompact}>
              {vm.dashboard.meals.length > 0 ? vm.dashboard.meals.map((meal) => (
                <View key={meal.id} style={styles.mealItemCompact}>
                  <View style={styles.mealDot} />
                  <View style={styles.mealItemLeft}>
                    <Text style={styles.mealLabel}>{meal.mealLabel}</Text>
                    <Text style={styles.mealHint}>{meal.done ? '今天已做完' : '还可以继续补细节'}</Text>
                  </View>
                  <View style={[styles.mealStatus, meal.done && styles.mealStatusDone]}>
                    <Text style={[styles.mealStatusText, meal.done && styles.mealStatusTextDone]}>{meal.done ? '已完成' : '已安排'}</Text>
                  </View>
                </View>
              )) : <Text style={styles.emptyHint}>今天还没有安排，先去搜索一顿，再回周计划补齐。</Text>}
            </View>
          </View>
        </View>

        {vm.reminders.length > 0 && (
          <View style={styles.sectionTight}>
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
                >
                  <Text style={styles.reminderTitle}>{item.title}</Text>
                  <Text style={styles.reminderCta}>{item.cta}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.sectionPrimary}>
          <View style={styles.sectionRowBetween}>
            <View>
              <Text style={styles.sectionTitle}>一菜两吃</Text>
              <Text style={styles.sectionCaption}>主推荐先放前面，先把今天最值得做的一道定下来。</Text>
            </View>
            <TouchableOpacity onPress={nav.search}><Text style={styles.linkText}>去搜索</Text></TouchableOpacity>
          </View>
          {vm.isLoading ? (
            <View style={styles.skeletonContainer}><SkeletonCard showImage showFooter /></View>
          ) : vm.recommendationCards.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationScroll}>
              {vm.recommendationCards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.recommendationCard} onPress={() => nav.recipeDetail(card.recipe.id)} activeOpacity={0.92}>
                  <View style={styles.recommendationHeroRow}>
                    <View style={styles.recommendationBadge}><Text style={styles.recommendationBadgeText}>主推荐</Text></View>
                    {currentStage ? <View style={[styles.tag, styles.tagPositive]}><Text style={[styles.tagText, styles.tagPositiveText]}>{currentStage.name}</Text></View> : null}
                  </View>
                  <Text style={styles.recommendationTitle}>{card.title}</Text>
                  <Text style={styles.recommendationReason}>{card.reason}</Text>
                  <View style={styles.tagRow}>
                    {card.tags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
                  </View>
                  <View style={styles.recommendationSplitCard}>
                    <View style={styles.splitColumn}>
                      <Text style={styles.splitEyebrow}>大人版</Text>
                      <Text style={styles.splitText}>先做共享底菜，再按口味补成人调味。</Text>
                    </View>
                    <View style={styles.splitDivider} />
                    <View style={styles.splitColumn}>
                      <Text style={styles.splitEyebrow}>宝宝版</Text>
                      <Text style={styles.splitText}>提前分出一份，按阶段调口感与颗粒度。</Text>
                    </View>
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

        <View style={styles.sectionLight}>
          <ActionGrid actions={quickActions} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRowBetween}>
            <View>
              <Text style={styles.sectionTitle}>继续找菜</Text>
              <Text style={styles.sectionCaption}>像内容入口，不像后台模块，先逛再进具体流程。</Text>
            </View>
            <TouchableOpacity onPress={nav.search}><Text style={styles.linkText}>全部入口</Text></TouchableOpacity>
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
            {vm.quickEntries.map((entry, index) => (
              <TouchableOpacity
                key={entry.key}
                style={[styles.quickEntryCard, index === 0 && styles.quickEntryCardFeatured]}
                onPress={entry.target === 'plan' ? nav.plan : entry.target === 'shopping' ? nav.shopping : nav.search}
                activeOpacity={0.88}
              >
                <View style={styles.quickEntryCopy}>
                  <Text style={styles.quickEntryKicker}>{index === 0 ? 'Start here' : 'Quick entry'}</Text>
                  <Text style={styles.quickEntryTitle}>{entry.label}</Text>
                  <Text style={styles.quickEntryHint}>{entry.hint}</Text>
                </View>
                <Text style={styles.quickEntryArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.section, styles.inventoryCard]} onPress={nav.inventory} activeOpacity={0.9}>
          <View style={styles.sectionRowBetween}>
            <View>
              <Text style={styles.sectionTitle}>库存与采购</Text>
              <Text style={styles.inventoryCaption}>把家里已有食材和缺口放在一个轻入口里。</Text>
            </View>
            <Text style={styles.linkText}>去查看</Text>
          </View>
          <Text style={styles.inventoryText}>购物准备度 {vm.shoppingSummary.readiness}% · 待处理 {vm.shoppingSummary.unchecked} 项</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F4EF' },
  content: { flex: 1 },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? 96 : Spacing.xl,
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  heroCopy: { flex: 1 },
  eyebrow: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  greeting: { marginTop: 4, fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  subtitle: { marginTop: Spacing.xs, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  searchEntry: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: '#F0D8BF' },
  searchEntryText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  todayCard: { backgroundColor: '#FBF7F1', borderRadius: BorderRadius['2xl'], padding: Spacing.lg, borderWidth: 1, borderColor: '#EEDDC9', ...Shadows.sm },
  summaryHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  summaryCopyBlock: { flex: 1 },
  summaryEyebrow: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryPrimary: { marginTop: 6, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summarySecondary: { marginTop: 4, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  inlineLinkPill: { backgroundColor: '#F4EFE7', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  inlineLinkPillText: { fontSize: Typography.fontSize.xs, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  summaryMiniStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  summaryMiniCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, paddingVertical: Spacing.sm, alignItems: 'center' },
  summaryMiniCardWarm: { backgroundColor: '#FFF5E8' },
  summaryMiniCardSoft: { backgroundColor: '#EEF9F0' },
  summaryMiniValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  summaryMiniLabel: { marginTop: 2, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  mealListCompact: { marginTop: Spacing.md, gap: Spacing.xs },
  mealItemCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  mealDot: { width: 8, height: 8, borderRadius: BorderRadius.full, backgroundColor: '#E7B67B', marginRight: Spacing.sm },
  mealItemLeft: { flex: 1, paddingRight: Spacing.sm },
  mealLabel: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  mealHint: { marginTop: 2, fontSize: Typography.fontSize.xs, color: Colors.text.tertiary },
  mealStatus: { backgroundColor: '#FFF4E8', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  mealStatusDone: { backgroundColor: '#EAF7EC' },
  mealStatusText: { fontSize: Typography.fontSize.xs, color: Colors.primary.dark, fontWeight: Typography.fontWeight.semibold },
  mealStatusTextDone: { color: Colors.secondary.dark },
  section: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  sectionPrimary: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  sectionLight: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  sectionTight: { paddingLeft: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.xs },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  sectionCaption: { marginTop: 4, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  sectionRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  linkText: { fontSize: Typography.fontSize.sm, color: Colors.primary.main, fontWeight: Typography.fontWeight.semibold },
  reminderScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  reminderCard: { width: 220, borderRadius: BorderRadius.xl, padding: Spacing.md, backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.light },
  reminderWarning: { backgroundColor: '#FFF8E8', borderColor: '#F3D56A' },
  reminderAccent: { backgroundColor: '#EEF4FF', borderColor: '#B8D0FF' },
  reminderSuccess: { backgroundColor: '#EEF9F0', borderColor: '#AAD9B4' },
  reminderTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, lineHeight: 20 },
  reminderCta: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  skeletonContainer: { paddingVertical: Spacing.sm },
  recommendationScroll: { gap: Spacing.md },
  recommendationCard: { width: 316, backgroundColor: '#FFFDF9', borderRadius: BorderRadius['2xl'], padding: Spacing.lg, borderWidth: 1, borderColor: '#EEDDC9', ...Shadows.md },
  recommendationHeroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  recommendationBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF1DF', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  recommendationBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.primary.dark, fontWeight: Typography.fontWeight.bold },
  recommendationTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  recommendationReason: { marginTop: Spacing.sm, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  tag: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  tagPositive: { backgroundColor: '#EEF9F0' },
  tagText: { fontSize: Typography.fontSize.xs, color: Colors.text.secondary },
  tagPositiveText: { color: Colors.secondary.dark },
  recommendationSplitCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: '#F8F6F1', borderRadius: BorderRadius.xl, padding: Spacing.md, marginTop: Spacing.md },
  splitColumn: { flex: 1 },
  splitDivider: { width: 1, backgroundColor: Colors.border.light },
  splitEyebrow: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
  splitText: { marginTop: 6, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  recommendationActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryButton: { flex: 1, backgroundColor: Colors.primary.main, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  primaryButtonText: { color: Colors.text.inverse, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  secondaryButton: { flex: 1, backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  secondaryButtonText: { color: Colors.text.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  filterRow: { gap: Spacing.sm },
  filterChip: { backgroundColor: '#FFFDF9', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: '#E8DED1' },
  filterChipText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, fontWeight: Typography.fontWeight.medium },
  quickEntryStack: { marginTop: Spacing.md, gap: Spacing.sm },
  quickEntryCard: { backgroundColor: '#FFFDF9', borderRadius: BorderRadius['2xl'], padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E8DED1' },
  quickEntryCardFeatured: { backgroundColor: '#F7EBDD', borderColor: '#E7C8A4' },
  quickEntryCopy: { flex: 1, paddingRight: Spacing.sm },
  quickEntryKicker: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  quickEntryTitle: { marginTop: 4, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary },
  quickEntryHint: { marginTop: 4, fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  quickEntryArrow: { fontSize: Typography.fontSize.lg, color: Colors.text.tertiary },
  inventoryCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius['2xl'], marginHorizontal: Spacing.lg, paddingTop: Spacing.lg, ...Shadows.sm },
  inventoryCaption: { marginTop: 4, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  inventoryText: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 21 },
  emptyCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg },
  emptyHint: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
});
