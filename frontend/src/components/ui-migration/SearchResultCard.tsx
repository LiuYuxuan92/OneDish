import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import { Card } from '../common/Card';
import { DualBadge } from './DualBadge';
import { StatusTag } from './StatusTag';
import type { SearchResultCardViewModel } from '../../viewmodels/uiMigration';
import {
  RECIPE_PLACEHOLDER_BADGE,
  RECIPE_PLACEHOLDER_EMOJI,
  RECIPE_PLACEHOLDER_SUBTITLE,
} from '../../utils/media';

interface SearchResultCardProps {
  item: SearchResultCardViewModel;
  onPress?: (resultKey: string) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ item, onPress }) => {
  const recipe = item.recommendation.recipe;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Pressable onPress={() => onPress?.(item.resultKey)} style={styles.pressable}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackBadge}>{RECIPE_PLACEHOLDER_BADGE}</Text>
            <Text style={styles.imageFallbackEmoji}>{RECIPE_PLACEHOLDER_EMOJI}</Text>
            <Text style={styles.imageFallbackText} numberOfLines={2}>{RECIPE_PLACEHOLDER_SUBTITLE}</Text>
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <DualBadge type={recipe.dualType} size="xs" />
            <Text style={styles.sourceText}>{item.sourceLabel}</Text>
          </View>
          <Text style={styles.title}>{recipe.title}</Text>
          {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={styles.meta}>{recipe.cookTimeText} · {recipe.difficultyLabel} · {recipe.servingsLabel}</Text>
          {recipe.stageLabel ? <Text style={styles.stageText}>{recipe.stageLabel}</Text> : null}
          <View style={styles.statusRow}>
            {recipe.statusTags.slice(0, 2).map((tag) => (
              <StatusTag key={`${tag.type}-${tag.detail || ''}`} type={tag.type} detail={tag.detail} />
            ))}
          </View>
          {!!item.recommendation.tags.length && (
            <View style={styles.tagRow}>
              {item.recommendation.tags.slice(0, 3).map((tag) => (
                <Text key={tag} style={styles.tag}>{tag}</Text>
              ))}
            </View>
          )}
          {recipe.whyItFits ? <Text style={styles.reason} numberOfLines={2}>{recipe.whyItFits}</Text> : null}
          {item.preferenceHint ? (
            <View style={styles.preferenceHintBadge}>
              <Text style={styles.preferenceHintText} numberOfLines={2}>{item.preferenceHint}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  pressable: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  image: {
    width: 88,
    height: 88,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  imageFallback: {
    width: 88,
    height: 88,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F4EEE5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
    gap: 2,
  },
  imageFallbackBadge: {
    fontSize: 8,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.4,
  },
  imageFallbackEmoji: {
    fontSize: 22,
  },
  imageFallbackText: {
    fontSize: 10,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sourceText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as never,
    color: Colors.text.primary,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  meta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  stageText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.neutral.gray100,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  reason: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  preferenceHintBadge: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  preferenceHintText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.main,
    lineHeight: 18,
  },
});
