import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../common/Card';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { RecommendationCardViewModel } from '../../viewmodels/uiMigration';
import { DualBadge } from './DualBadge';
import { StatusTag } from './StatusTag';

interface RecommendationCardProps {
  item: RecommendationCardViewModel;
  onPress?: (recipeId: string) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ item, onPress }) => {
  const recipe = item.recipe;
  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Pressable onPress={() => onPress?.(recipe.id)} style={styles.pressable}>
        {recipe.image ? <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" /> : <View style={styles.imageFallback}><Text style={styles.imageFallbackText}>🍲</Text></View>}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <DualBadge type={recipe.dualType} size="xs" />
          </View>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.meta}>{recipe.cookTimeText} · {recipe.difficultyLabel}</Text>
          {recipe.whyItFits ? <Text style={styles.reason}>{recipe.whyItFits}</Text> : null}
          <View style={styles.statusRow}>
            {recipe.statusTags.slice(0, 2).map(tag => <StatusTag key={`${tag.type}-${tag.detail || ''}`} type={tag.type} detail={tag.detail} />)}
          </View>
          {!!item.tags.length && (
            <View style={styles.tagRow}>
              {item.tags.map(tag => <Text key={tag} style={styles.tag}>{tag}</Text>)}
            </View>
          )}
        </View>
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderRadius: BorderRadius['2xl'],
    borderColor: Colors.border.light,
  },
  pressable: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 132,
  },
  imageFallback: {
    width: '100%',
    height: 132,
    backgroundColor: Colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 28,
  },
  content: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  meta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  reason: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[700],
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.lg,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  tag: {
    backgroundColor: Colors.neutral.gray100,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize['2xs'],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
});
