import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import type { IngredientInventory, RecommendedRecipe } from '../../api/ingredientInventory';

interface ExpiryNotificationBannerProps {
  expiringItems: IngredientInventory[];
  recommendedRecipes?: RecommendedRecipe[];
  onPress?: () => void;
  onRecipePress?: (recipeId: string) => void;
}

export function ExpiryNotificationBanner({
  expiringItems,
  recommendedRecipes = [],
  onPress,
  onRecipePress,
}: ExpiryNotificationBannerProps) {
  if (expiringItems.length === 0) {
    return null;
  }

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const expiryDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天过期';
    if (diffDays === 1) return '明天过期';
    return `${diffDays}天后过期`;
  };

  const getExpiryTagColor = (dateStr: string | null) => {
    if (!dateStr) return Colors.text.tertiary;
    const expiryDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return Colors.functional.error;
    if (diffDays <= 2) return '#FF9800';
    return Colors.text.secondary;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>
          {expiringItems.length} 种食材即将过期
        </Text>
      </View>

      <View style={styles.itemsContainer}>
        {expiringItems.slice(0, 3).map((item, index) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.ingredient_name}
            </Text>
            <Text style={[styles.expiryTag, { color: getExpiryTagColor(item.expiry_date) }]}>
              {formatExpiryDate(item.expiry_date)}
            </Text>
          </View>
        ))}
        {expiringItems.length > 3 && (
          <Text style={styles.moreText}>还有 {expiringItems.length - 3} 种...</Text>
        )}
      </View>

      {recommendedRecipes.length > 0 && (
        <View style={styles.recipesSection}>
          <Text style={styles.recipesTitle}>推荐菜谱</Text>
          <View style={styles.recipesRow}>
            {recommendedRecipes.slice(0, 3).map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeChip}
                onPress={() => onRecipePress?.(recipe.id)}
              >
                <Text style={styles.recipeChipText} numberOfLines={1}>
                  {recipe.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  itemsContainer: {
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    flex: 1,
  },
  expiryTag: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
  moreText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  recipesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: Spacing.sm,
  },
  recipesTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  recipesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  recipeChip: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    maxWidth: 120,
  },
  recipeChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default ExpiryNotificationBanner;
