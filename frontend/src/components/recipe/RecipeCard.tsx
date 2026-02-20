import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Card } from '../common/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';
import { RecipeSummary } from '../../types';

interface RecipeCardProps {
  recipe: RecipeSummary;
  onPress?: () => void;
  showSource?: boolean;
}

const SOURCE_LABELS = {
  local: { label: '本地', color: Colors.functional.success },
  tianxing: { label: '联网', color: Colors.functional.info },
  ai: { label: 'AI推荐', color: Colors.functional.warning },
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress, showSource = false }) => {
  const source = recipe.source;
  const sourceInfo = source ? SOURCE_LABELS[source] : null;

  // 确保 prep_time 是有效数字
  const prepTime = typeof recipe.prep_time === 'number' ? recipe.prep_time : 0;

  return (
    <Card variant="elevated" onPress={onPress} style={styles.card}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.emoji}>🍽️</Text>
      </View>
      <View style={styles.content}>
        {showSource && sourceInfo && (
          <View style={[styles.sourceBadge, { backgroundColor: sourceInfo.color }]}>
            <Text style={styles.sourceText}>{sourceInfo.label}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
          {recipe.name || '未命名菜谱'}
        </Text>
        <Text style={styles.metaText}>⏱ {prepTime}分钟</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      web: {
        minWidth: 280,
        maxWidth: 400,
      },
    }),
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  content: {
    padding: Spacing.md,
    minHeight: 80,
  },
  sourceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sourceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.inverse,
  },
  name: {
    fontFamily: Typography.fontFamily.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  metaText: {
    fontFamily: Typography.fontFamily.primary,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 'auto',
  },
});
