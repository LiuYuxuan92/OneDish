import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { RecipeDetailHeroViewModel, RecipeDisplayModel } from '../../viewmodels/uiMigration';
import { AdaptationSummary } from './AdaptationSummary';
import { BabySuitabilityChips } from './BabySuitabilityChips';
import { DualBadge } from './DualBadge';
import { StatusTag } from './StatusTag';

interface RecipeHeroPanelProps {
  hero: RecipeDetailHeroViewModel;
  recipe?: RecipeDisplayModel;
}

export const RecipeHeroPanel: React.FC<RecipeHeroPanelProps> = ({ hero, recipe }) => (
  <View style={styles.container}>
    <View style={styles.headerBlock}>
      {recipe ? <DualBadge type={recipe.dualType} size="sm" /> : null}
      <Text style={styles.title}>{hero.title}</Text>
      <Text style={styles.summary}>{hero.summary}</Text>

      <View style={styles.metaRow}>
        {hero.meta.map((item, index) => (
          <React.Fragment key={item.key}>
            {index > 0 ? <View style={styles.metaDivider} /> : null}
            <Text style={styles.metaText}>{item.label}</Text>
          </React.Fragment>
        ))}
      </View>

      {hero.statusTags.length ? (
        <View style={styles.statusRow}>
          {hero.statusTags.map((tag, index) => (
            <StatusTag key={`${tag.type}-${index}`} type={tag.type} detail={tag.detail} />
          ))}
        </View>
      ) : null}

      {recipe?.babySuitability.chips?.length ? (
        <View style={styles.chipBlock}>
          <BabySuitabilityChips chips={recipe.babySuitability.chips} />
        </View>
      ) : null}
    </View>

    {!!hero.whyItFits.length && (
      <View style={styles.cardSoft}>
        <Text style={styles.cardTitle}>今天先看这几件事</Text>
        {hero.whyItFits.slice(0, 3).map((line) => (
          <View key={line} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}
        {recipe?.adaptation ? (
          <View style={styles.adaptationBlock}>
            <AdaptationSummary adaptation={recipe.adaptation} compact />
          </View>
        ) : null}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing[3],
  },
  headerBlock: {
    gap: Spacing[2],
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  summary: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    color: Colors.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border.light,
  },
  metaText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  chipBlock: {
    marginTop: Spacing[1],
  },
  cardSoft: {
    backgroundColor: '#F7F5EF',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  bullet: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    color: Colors.text.secondary,
  },
  adaptationBlock: {
    marginTop: Spacing[1],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
});
