// @ts-nocheck
import React, { useState } from 'react';
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
    ? Math.round(
        favorites.reduce((sum, item) => sum + Number(item.recipe?.prep_time || 0), 0) / favorites.length
      )
    : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const handleRemoveFavorite = async (recipeId: string, recipeName: string) => {
    try {
      await removeFavoriteMutation.mutateAsync(recipeId);
    } catch (error) {
      console.error('取消收藏失败:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>加载收藏中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>加载失败</Text>
          <Text style={styles.errorText}>请稍后重试</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <HeartIcon size={16} color={Colors.functional.error} fill={Colors.functional.error} />
          <Text style={styles.headerBadgeText}>我的收藏</Text>
        </View>
        <Text style={styles.headerTitle}>把值得反复做的一菜两吃，先收在这里</Text>
        <Text style={styles.headerSubtitle}>共 {data?.total || 0} 道精选菜谱，可直接回看或重新进入详情页继续做。</Text>
        <View style={styles.headerStatsRow}>
          <View style={styles.headerStatCard}>
            <Text style={styles.headerStatValue}>{favorites.length}</Text>
            <Text style={styles.headerStatLabel}>当前收藏</Text>
          </View>
          <View style={styles.headerStatCard}>
            <Text style={styles.headerStatValue}>{averagePrepTime > 0 ? `${averagePrepTime} 分钟` : '--'}</Text>
            <Text style={styles.headerStatLabel}>平均时长</Text>
          </View>
          <View style={styles.headerStatCard}>
            <Text style={styles.headerStatValue}>{favorites.length > 0 ? '随时复做' : '先去挑菜'}</Text>
            <Text style={styles.headerStatLabel}>当前状态</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.main]}
            tintColor={Colors.primary.main}
          />
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <HeartIcon size={48} color={Colors.text.disabled} />
            </View>
            <Text style={styles.emptyTitle}>还没有收藏</Text>
            <Text style={styles.emptyText}>点击菜谱卡片上的 ♥ 收藏喜欢的菜谱</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('Recipes')}
            >
              <Text style={styles.browseButtonText}>去逛逛菜谱</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recipeList}>
            {favorites.map((item, index) => (
              <View key={item.id} style={styles.recipeCardWrapper}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleRecipePress(item.recipe.id)}
                >
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
                  onPress={() => handleRemoveFavorite(item.recipe.id, item.recipe.name)}
                  disabled={removeFavoriteMutation.isPending}
                  activeOpacity={0.7}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: BorderRadius.xl,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.functional.errorLight,
    marginBottom: Spacing.sm,
  },
  headerBadgeText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.error,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  headerStatCard: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  headerStatValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  browseButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  browseButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  recipeList: {
    gap: Spacing.lg,
  },
  recipeCardWrapper: {
    marginBottom: Spacing.md,
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.functional.error,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
