import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useUserRecipes, useDeleteUserRecipe } from '../../hooks/useUserRecipes';
import { EmptyState } from '../../components/common/EmptyState';
import { ClockIcon, ChefHatIcon, TrashIcon } from '../../components/common/Icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyRecipes'>;

export function MyRecipesScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = React.useState(false);
  const { data, isLoading, refetch } = useUserRecipes();
  const deleteMutation = useDeleteUserRecipe();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('确认删除', `确定要删除「${name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
          } catch {
            Alert.alert('提示', '删除失败，请重试');
          }
        },
      },
    ]);
  };

  const recipes = data?.items || [];

  if (isLoading && recipes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />
        }
      >
        {recipes.length === 0 ? (
          <EmptyState
            icon="📚"
            title="还没有收藏菜谱"
            description="在搜索页面找到喜欢的菜谱，点击「收藏到我的菜谱」即可保存"
          />
        ) : (
          recipes.map((recipe: any) => (
            <View key={recipe.id} style={styles.recipeCard}>
              <View style={styles.recipeHeader}>
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <View style={styles.recipeMeta}>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {recipe.source === 'tianxing' ? '🌐 联网' : recipe.source === 'ai' ? '🤖 AI' : '📚 搜索'}
                      </Text>
                    </View>
                    {recipe.prep_time && (
                      <View style={styles.metaItem}>
                        <ClockIcon size={14} color={Colors.text.secondary} />
                        <Text style={styles.metaText}>{recipe.prep_time}分钟</Text>
                      </View>
                    )}
                    {recipe.difficulty && (
                      <View style={styles.metaItem}>
                        <ChefHatIcon size={14} color={Colors.text.secondary} />
                        <Text style={styles.metaText}>{recipe.difficulty}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(recipe.id, recipe.name)}
                >
                  <TrashIcon size={18} color={Colors.functional.error} />
                </TouchableOpacity>
              </View>

              {/* 食材预览 */}
              {recipe.adult_version?.ingredients && recipe.adult_version.ingredients.length > 0 && (
                <View style={styles.ingredientsPreview}>
                  <Text style={styles.ingredientsLabel}>食材：</Text>
                  <Text style={styles.ingredientsText} numberOfLines={2}>
                    {recipe.adult_version.ingredients
                      .slice(0, 5)
                      .map((ing: any) => typeof ing === 'string' ? ing : ing.name)
                      .join('、')}
                    {recipe.adult_version.ingredients.length > 5 ? '...' : ''}
                  </Text>
                </View>
              )}

              {/* 标签 */}
              {recipe.tags && recipe.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {recipe.tags.slice(0, 4).map((tag: string, i: number) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  recipeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recipeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sourceBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  ingredientsPreview: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  ingredientsLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  ingredientsText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
});
