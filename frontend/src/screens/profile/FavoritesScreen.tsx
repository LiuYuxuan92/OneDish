import React, { useMemo, useState } from 'react';
import { mapRecipeToDisplayModel } from '../../mappers/recipeDisplayMapper';
import type { RecipeDisplayModel } from '../../viewmodels/uiMigration';
import type { RecipeSummary } from '../../types';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { useFavorites, useRemoveFavorite } from '../../hooks/useFavorites';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { HeartIcon, TrashIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch } = useFavorites({ page: 1, limit: 50 });
  const removeFavoriteMutation = useRemoveFavorite();
  const favorites = data?.items || [];
  const favoriteCards = useMemo(() => favorites.map((item) => ({
    ...item,
    displayRecipe: mapRecipeToDisplayModel({
      id: item.recipe.id,
      name: item.recipe.name,
      prep_time: item.recipe.prep_time,
      image_url: item.recipe.image_url,
      source: 'local',
    } as RecipeSummary, {
      onShoppingList: false,
    }),
  })), [favorites]);

  const averagePrepTime = favorites.length
    ? Math.round(favorites.reduce((sum, item) => sum + Number(item.recipe?.prep_time || 0), 0) / favorites.length)
    : 0;

  const latestFavoriteText = useMemo(() => {
    if (!favorites.length || !favorites[0]?.created_at) {
      return '把最常回做的菜先留在这里。';
    }
    return `最近一次收藏于 ${new Date(favorites[0].created_at).toLocaleDateString('zh-CN')}。`;
  }, [favorites]);

  const quickChips = useMemo(() => {
    const chips = [`共 ${favorites.length} 道收藏`];
    if (averagePrepTime > 0) {
      chips.push(`平均 ${averagePrepTime} 分钟`);
    }
    chips.push(favorites.length > 0 ? '适合临时决定做饭时回看' : '先去挑几道顺手菜');
    return chips;
  }, [averagePrepTime, favorites.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const handleRemoveFavorite = async (recipeId: string) => {
    try {
      await removeFavoriteMutation.mutateAsync(recipeId);
    } catch (removeError) {
      console.error('移出收藏失败:', removeError);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在整理你的收藏...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>收藏列表暂时没有拉回来</Text>
          <Text style={styles.errorText}>稍后再试一次。</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <HeartIcon size={14} color={Colors.functional.error} fill={Colors.functional.error} />
              <Text style={styles.heroBadgeText}>我的收藏</Text>
            </View>

            <TouchableOpacity
              style={styles.heroAction}
              onPress={() => navigation.navigate('Recipes')}
              activeOpacity={0.82}
            >
              <Text style={styles.heroActionText}>继续找菜</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>把值得反复做的菜先收好，想做饭时直接回来拿</Text>
          <Text style={styles.heroSubtitle}>
            收藏页只保留真正有用的内容：快速回看、立刻进入详情、顺手清理不再需要的菜。
          </Text>
          <Text style={styles.heroSupport}>{latestFavoriteText}</Text>

          <View style={styles.quickChipRow}>
            {quickChips.map((chip) => (
              <View key={chip} style={styles.quickChip}>
                <Text style={styles.quickChipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{favorites.length}</Text>
              <Text style={styles.summaryLabel}>收藏菜谱</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardWarm]}>
              <Text style={styles.summaryValue}>{averagePrepTime > 0 ? `${averagePrepTime}` : '--'}</Text>
              <Text style={styles.summaryLabel}>平均分钟</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{favorites.length > 0 ? '随时可做' : '待补充'}</Text>
              <Text style={styles.summaryLabel}>当前状态</Text>
            </View>
          </View>
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <HeartIcon size={28} color={Colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>还没有收藏</Text>
            <Text style={styles.emptyText}>
              看到适合你家的菜先点收藏，后面做饭、备餐和周计划都会更顺手。
            </Text>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigation.navigate('Recipes')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>去逛菜谱</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>收藏清单</Text>
                <Text style={styles.sectionCaption}>从这里直接回到详情页，决定今天做哪一道。</Text>
              </View>
              <Text style={styles.sectionMeta}>{favorites.length} 道</Text>
            </View>

            <View style={styles.recipeList}>
              {favoriteCards.map((item) => (
                <View key={item.id} style={styles.recipeCardShell}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => handleRecipePress(item.recipe.id)}>
                    <RecipeCard
                      recipe={{
                        id: item.displayRecipe.id,
                        name: item.displayRecipe.title,
                        prep_time: Number(item.recipe.prep_time || 0),
                        image_url: item.recipe.image_url,
                        stage: item.displayRecipe.stageLabel,
                        source: item.displayRecipe.source,
                        recommendation_explain: item.displayRecipe.recommendationReasons,
                        difficulty: item.displayRecipe.difficultyLabel,
                        servings: item.displayRecipe.servingsLabel,
                      } as RecipeSummary}
                    />
                    <View style={styles.inlineMetaRow}>
                      <Text style={styles.inlineMetaText}>{item.displayRecipe.cookTimeText}</Text>
                      <Text style={styles.inlineMetaDot}>•</Text>
                      <Text style={styles.inlineMetaText}>{item.displayRecipe.difficultyLabel}</Text>
                      <Text style={styles.inlineMetaDot}>•</Text>
                      <Text style={styles.inlineMetaText}>{item.displayRecipe.servingsLabel}</Text>
                    </View>
                    {item.displayRecipe.whyItFits ? (
                      <Text style={styles.inlineReason} numberOfLines={2}>{item.displayRecipe.whyItFits}</Text>
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.recipeFooter}>
                    <Text style={styles.recipeFooterHint}>
                      下次要做这道菜时，可以从这里直接回到做法与分餐说明。
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveFavorite(item.recipe.id)}
                      disabled={removeFavoriteMutation.isPending}
                      activeOpacity={0.78}
                    >
                      <TrashIcon size={14} color={Colors.functional.error} />
                      <Text style={styles.removeButtonText}>移出收藏</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    lineHeight: 44,
    backgroundColor: Colors.functional.errorLight,
    color: Colors.functional.error,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  errorTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  errorText: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.functional.errorLight,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.secondary,
  },
  heroActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: 30,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 21,
  },
  heroSupport: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  quickChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
  },
  quickChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  summaryCardWarm: {
    backgroundColor: '#FBF1E6',
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summaryLabel: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  emptyCard: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.md,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  emptyText: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryAction: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    ...Shadows.sm,
  },
  primaryActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionBlock: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
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
  },
  sectionMeta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  recipeList: {
    gap: Spacing.md,
  },
  recipeCardShell: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  inlineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  inlineMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  inlineMetaDot: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  inlineReason: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  recipeFooterHint: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.functional.errorLight,
  },
  removeButtonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
  },
});
