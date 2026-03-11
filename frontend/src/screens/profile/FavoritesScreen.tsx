import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useFavorites, useRemoveFavorite } from '../../hooks/useFavorites';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { HeartIcon, TrashIcon } from '../../components/common/Icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch } = useFavorites({ page: 1, limit: 50 });
  const removeFavoriteMutation = useRemoveFavorite();
  const favorites = data?.items || [];

  const averagePrepTime = favorites.length
    ? Math.round(favorites.reduce((sum, item) => sum + Number(item.recipe?.prep_time || 0), 0) / favorites.length)
    : 0;

  const insightChips = useMemo(() => {
    const chips = [`共 ${favorites.length} 道收藏`];
    if (averagePrepTime > 0) chips.push(`平均 ${averagePrepTime} 分钟`);
    chips.push(favorites.length > 0 ? '可直接回看详情复做' : '先去挑一菜两吃');
    return chips;
  }, [averagePrepTime, favorites.length]);

  const summaryCards = useMemo(
    () => [
      {
        label: '当前收藏',
        value: `${favorites.length}`,
        helper: '喜欢的菜先留在这里',
      },
      {
        label: '平均时长',
        value: averagePrepTime > 0 ? `${averagePrepTime} 分钟` : '--',
        helper: '方便挑适合今天节奏的菜',
      },
      {
        label: '复做状态',
        value: favorites.length > 0 ? '随时复做' : '待补充',
        helper: '从收藏直接回到详情页继续做',
      },
    ],
    [averagePrepTime, favorites.length]
  );

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
      console.error('取消收藏失败:', removeError);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>正在加载收藏...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>收藏列表暂时没拉回来</Text>
          <Text style={styles.errorText}>请稍后再试一次。</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} tintColor={Colors.primary.main} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <HeartIcon size={16} color={Colors.functional.error} fill={Colors.functional.error} />
            <Text style={styles.heroBadgeText}>我的收藏</Text>
          </View>
          <Text style={styles.heroTitle}>把值得反复做的一菜两吃，先收在这里</Text>
          <Text style={styles.heroSubtitle}>共 {data?.total || 0} 道精选菜谱，可直接回看或重新进入详情页继续做。</Text>

          <View style={styles.chipRow}>
            {insightChips.map((chip) => (
              <View key={chip} style={styles.insightChip}>
                <Text style={styles.insightChipText}>{chip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <HeartIcon size={48} color={Colors.text.disabled} />
            </View>
            <Text style={styles.emptyTitle}>还没有收藏</Text>
            <Text style={styles.emptyText}>把喜欢的菜谱先收藏起来，之后就能在这里快速回看。</Text>
            <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('Recipes')}>
              <Text style={styles.primaryActionText}>去逛逛菜谱</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recipeList}>
            {favorites.map((item) => (
              <View key={item.id} style={styles.recipeCardWrapper}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => handleRecipePress(item.recipe.id)}>
                  <RecipeCard
                    recipe={{
                      id: item.recipe.id,
                      name: item.recipe.name,
                      prep_time: item.recipe.prep_time,
                      image_url: item.recipe.image_url,
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFavorite(item.recipe.id)}
                  disabled={removeFavoriteMutation.isPending}
                  activeOpacity={0.75}
                >
                  <TrashIcon size={16} color={Colors.functional.error} />
                  <Text style={styles.removeButtonText}>取消收藏</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
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
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
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
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.functional.errorLight,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  insightChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  insightChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
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
  summaryHelper: {
    marginTop: 4,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  emptyContainer: {
    marginTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    ...Shadows.sm,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
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
    lineHeight: 20,
  },
  primaryAction: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
  },
  primaryActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  recipeList: {
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  recipeCardWrapper: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    ...Shadows.sm,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.functional.errorLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.functional.error,
  },
  removeButtonText: {
    color: Colors.functional.error,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginLeft: Spacing.xs,
  },
});
