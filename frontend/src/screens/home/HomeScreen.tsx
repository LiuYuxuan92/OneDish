// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDailyRecipe } from '../../hooks/useRecipes';
import { useBabyStageByAge } from '../../hooks/useBabyStages';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { Skeleton, SkeletonCard } from '../../components/common/Skeleton';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  // 获取今日推荐（一菜两吃配对）
  const { data: dailyData, isLoading, error, refetch } = useDailyRecipe({ type: 'dinner' });
  // 获取宝宝阶段信息（默认9个月）
  const { data: currentStage } = useBabyStageByAge(9);
  const recipe = dailyData?.recipe;
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {/* 头部标题 */}
        <View style={styles.header}>
          <Text style={styles.logo}>简家厨</Text>
          <Text style={styles.tagline}>一菜两吃，全家共享</Text>
        </View>

        {/* 今日配对推荐 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日推荐</Text>
            <View style={styles.pairBadge}>
              <Text style={styles.pairBadgeText}>一菜两吃</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonCard showImage showFooter />
            </View>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>加载失败，请稍后重试</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>点击重试</Text>
              </TouchableOpacity>
            </View>
          ) : recipe ? (
            <TouchableOpacity
              style={styles.pairingCard}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
              activeOpacity={0.9}
            >
              {/* 配对卡片头部 */}
              <View style={styles.pairingHeader}>
                <Text style={styles.pairingTitle}>{recipe.name}</Text>
                <Text style={styles.pairingSubtitle}>同样的食材，满足全家</Text>
              </View>

              {/* 双版本展示 */}
              <View style={styles.versionsContainer}>
                {/* 大人版 */}
                <View style={[styles.versionBox, styles.adultVersion]}>
                  <View style={styles.versionTag}>
                    <Text style={styles.versionTagText}>大人版</Text>
                  </View>
                  <Text style={styles.versionName}>
                    {recipe.name || '大人餐食'}
                  </Text>
                  <View style={styles.versionMeta}>
                    <Text style={styles.versionTime}>
                      {recipe.prep_time}分钟
                    </Text>
                    <Text style={styles.versionFeature}>口味浓郁</Text>
                  </View>
                </View>

                {/* 分隔线 */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <View style={styles.syncIcon}>
                    <Text style={styles.syncIconText}>同步</Text>
                  </View>
                  <View style={styles.dividerLine} />
                </View>

                {/* 宝宝版 */}
                <View style={[styles.versionBox, styles.babyVersion]}>
                  <View style={[styles.versionTag, styles.babyTag]}>
                    <Text style={styles.versionTagText}>宝宝版</Text>
                  </View>
                  <Text style={styles.versionName}>
                    宝宝版
                  </Text>
                  <View style={styles.versionMeta}>
                    <Text style={styles.versionTime}>
                      {recipe.prep_time}分钟
                    </Text>
                    <Text style={styles.versionFeature}>细腻易消化</Text>
                  </View>
                </View>
              </View>

              {/* 同步烹饪提示 */}
              <View style={styles.syncTip}>
                <Text style={styles.syncTipText}>
                  一起制作，省时省力
                </Text>
              </View>

              {/* 点击查看详情 */}
              <View style={styles.viewDetail}>
                <Text style={styles.viewDetailText}>点击查看详情 →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>暂无推荐</Text>
            </View>
          )}
        </View>

        {/* 今日辅食建议 */}
        {currentStage && (
          <View style={styles.babySection}>
            <View style={styles.babySectionHeader}>
              <Text style={styles.babySectionTitle}>🍼 今日辅食建议</Text>
            </View>
            <TouchableOpacity
              style={styles.babyCard}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Recipes', { screen: 'BabyStages' });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.babyCardLeft}>
                <Text style={styles.babyCardStage}>{currentStage.name} · {currentStage.age_range}</Text>
                <Text style={styles.babyCardNutrients}>
                  重点营养：{currentStage.key_nutrients.slice(0, 3).join(' · ')}
                </Text>
                <Text style={styles.babyCardHint}>点击查看适合的食谱 ›</Text>
              </View>
              <Text style={styles.babyCardArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 核心食材快速入口 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>按食材选菜</Text>
          <View style={styles.ingredientGrid}>
            {[
              { name: '鸡肉', icon: '🍗', color: '#FFE4C4' },
              { name: '猪肉', icon: '🥩', color: '#FFB6C1' },
              { name: '鱼肉', icon: '🐟', color: '#87CEEB' },
              { name: '蔬菜', icon: '🥬', color: '#98FB98' },
            ].map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.ingredientItem, { backgroundColor: item.color }]}
                onPress={() => {
                  const parentNav = navigation.getParent() as any;
                  parentNav?.navigate('Recipes', {
                    screen: 'RecipeList',
                    params: { ingredient: item.name },
                  });
                }}
              >
                <Text style={styles.ingredientIcon}>{item.icon}</Text>
                <Text style={styles.ingredientName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 功能入口 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Plan', { screen: 'ShoppingList' });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary.light }]}>
                <Text style={styles.actionIconText}>🛒</Text>
              </View>
              <Text style={styles.actionText}>购物清单</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                parentNav?.navigate('Plan', { screen: 'WeeklyPlan' });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.actionIconText}>📅</Text>
              </View>
              <Text style={styles.actionText}>一周计划</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const parentNav = navigation.getParent() as any;
                // 先返回Recipes标签页，然后导航到RecipeList（会重置栈）
                parentNav?.navigate('Recipes', {
                  screen: 'RecipeList',
                });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.actionIconText}>📖</Text>
              </View>
              <Text style={styles.actionText}>菜谱大全</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 一菜两吃理念说明 */}
        <View style={styles.conceptSection}>
          <Text style={styles.conceptTitle}>💡 什么是一菜两吃？</Text>
          <Text style={styles.conceptText}>
            同样的食材，一锅出两餐。大人吃香，宝宝吃健康。
            省去重复备菜的烦恼，让做饭变得更简单！
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  logo: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  tagline: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    marginTop: Spacing.xs,
    opacity: 0.9,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  pairBadge: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  pairBadgeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.medium,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  skeletonContainer: {
    padding: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  pairingCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  pairingHeader: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pairingTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  pairingSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  versionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  versionBox: {
    flex: 1,
    backgroundColor: Colors.neutral.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  adultVersion: {
    marginRight: Spacing.sm,
  },
  babyVersion: {
    marginLeft: Spacing.sm,
  },
  versionTag: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  babyTag: {
    backgroundColor: '#4CAF50',
  },
  versionTagText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  versionName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  versionMeta: {
    alignItems: 'center',
  },
  versionTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  versionFeature: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.medium,
  },
  syncIcon: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  syncIconText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
  },
  syncTip: {
    backgroundColor: '#FFF8E1',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  syncTipText: {
    fontSize: Typography.fontSize.sm,
    color: '#F57C00',
    fontWeight: Typography.fontWeight.medium,
  },
  viewDetail: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  ingredientItem: {
    width: (width - Spacing.lg * 2 - Spacing.md * 4) / 4,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.xs,
  },
  ingredientIcon: {
    fontSize: 28,
  },
  ingredientName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  conceptSection: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
  },
  conceptTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: '#2E7D32',
    marginBottom: Spacing.sm,
  },
  conceptText: {
    fontSize: Typography.fontSize.sm,
    color: '#388E3C',
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
  },
  retryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.tertiary,
  },
  babySection: { marginTop: 8, marginBottom: 8 },
  babySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  babySectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  babyCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF7043',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  babyCardLeft: { flex: 1 },
  babyCardStage: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  babyCardNutrients: { fontSize: 13, color: '#FF9800', marginBottom: 4 },
  babyCardHint: { fontSize: 12, color: '#888' },
  babyCardArrow: { fontSize: 22, color: '#CCC', marginLeft: 8 },
});
