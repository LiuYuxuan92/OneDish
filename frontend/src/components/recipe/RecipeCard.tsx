import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { Card } from '../common/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { RecipeSummary, UserPreferences } from '../../types';
import { buildSearchPreferenceHint } from '../../utils/preferenceCopy';
import { resolveRecipeImageUrl } from '../../utils/media';

interface RecipeCardProps {
  recipe: RecipeSummary;
  onPress?: () => void;
  showSource?: boolean;
  preferenceSummary?: UserPreferences;
}

const SOURCE_LABELS = {
  local: { label: '本地菜谱', bg: '#EEF4EF', color: Colors.primary.main },
  tianxing: { label: '网络灵感', bg: '#EDF2F5', color: Colors.info },
  ai: { label: 'AI 推荐', bg: '#FAF1E3', color: Colors.warning },
} as const;

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  showSource = false,
  preferenceSummary,
}) => {
  const sourceInfo = recipe.source ? SOURCE_LABELS[recipe.source] : null;
  const prepTime = typeof recipe.prep_time === 'number' ? recipe.prep_time : 0;
  const preferenceHint = buildSearchPreferenceHint({
    recipe,
    preferenceSummary: {
      defaultBabyAge: preferenceSummary?.default_baby_age,
      preferIngredients: Array.isArray(preferenceSummary?.prefer_ingredients)
        ? preferenceSummary.prefer_ingredients
        : typeof preferenceSummary?.prefer_ingredients === 'string'
          ? preferenceSummary.prefer_ingredients
              .split(/[,，、]/)
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      excludeIngredients: preferenceSummary?.exclude_ingredients,
      cookingTimeLimit: preferenceSummary?.cooking_time_limit ?? preferenceSummary?.max_prep_time,
      difficultyPreference: preferenceSummary?.difficulty_preference,
    },
  });

  const topTags = [recipe.stage, ...(recipe.scene_tags || [])].filter(Boolean).slice(0, 2);
  const bottomTags = recipe.key_nutrients?.slice(0, 2) || [];
  const coverImage = resolveRecipeImageUrl(recipe.id, recipe.image_url);

  return (
    <Card variant="elevated" onPress={onPress} style={styles.card}>
      <View style={styles.cover}>
        {coverImage ? (
          <>
            <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
            <View style={styles.coverTopRowOverlay}>
              <Text style={styles.coverKickerOnImage}>FAMILY RECIPE</Text>
              {showSource && sourceInfo ? (
                <View style={[styles.sourceBadge, styles.sourceBadgeOnImage, { backgroundColor: sourceInfo.bg }]}>
                  <Text style={[styles.sourceText, { color: sourceInfo.color }]}>{sourceInfo.label}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.coverFallbackContent}>
            <View style={styles.coverTopRow}>
              <Text style={styles.coverKicker}>FAMILY RECIPE</Text>
              {showSource && sourceInfo ? (
                <View style={[styles.sourceBadge, { backgroundColor: sourceInfo.bg }]}>
                  <Text style={[styles.sourceText, { color: sourceInfo.color }]}>{sourceInfo.label}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.coverEmoji}>🥣</Text>
            <Text style={styles.coverTitle} numberOfLines={2}>
              {recipe.name || '未命名菜谱'}
            </Text>
            <Text style={styles.coverMeta}>{prepTime > 0 ? `${prepTime} 分钟上桌` : '适合慢慢挑选的一道菜'}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {!!topTags.length && (
          <View style={styles.tagRow}>
            {topTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.name} numberOfLines={2}>
          {recipe.name || '未命名菜谱'}
        </Text>

        {!!preferenceHint && (
          <View style={styles.preferenceHint}>
            <Text style={styles.preferenceHintLabel}>匹配理由</Text>
            <Text style={styles.preferenceHintText} numberOfLines={2}>
              {preferenceHint}
            </Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{prepTime > 0 ? `${prepTime} 分钟` : '可继续查看'}</Text>
          </View>
          {!!bottomTags.length && (
            <View style={styles.footerTags}>
              {bottomTags.map((tag) => (
                <Text key={tag} style={styles.footerTag}>
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    width: '100%',
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.card,
    ...Platform.select({
      web: {
        minWidth: 280,
        maxWidth: 420,
      },
    }),
  },
  cover: {
    minHeight: 156,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 156,
  },
  coverFallbackContent: {
    minHeight: 156,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  coverTopRowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  coverKicker: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  coverKickerOnImage: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sourceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  sourceBadgeOnImage: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  coverEmoji: {
    fontSize: 34,
    marginTop: Spacing.sm,
  },
  coverTitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.lg,
    lineHeight: 24,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  coverMeta: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  preferenceHint: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
  },
  preferenceHintLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
  preferenceHintText: {
    marginTop: 4,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metaChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
  },
  metaChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  footerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'flex-end',
    flex: 1,
  },
  footerTag: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary.main,
    fontWeight: Typography.fontWeight.medium,
  },
});
