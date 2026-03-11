import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../styles/theme';
import type { RecipeDetailHeroViewModel, RecipeDetailTabKey, RecipeDisplayModel } from '../../viewmodels/uiMigration';
import { AdaptationSummary } from './AdaptationSummary';
import { BabySuitabilityChips } from './BabySuitabilityChips';
import { DualBadge } from './DualBadge';
import { StatusTag } from './StatusTag';

interface RecipeHeroPanelProps {
  hero: RecipeDetailHeroViewModel;
  recipe?: RecipeDisplayModel;
  activeTab: Extract<RecipeDetailTabKey, 'adult' | 'baby'>;
  onSelectTab: (tab: Extract<RecipeDetailTabKey, 'adult' | 'baby'>) => void;
}

export const RecipeHeroPanel: React.FC<RecipeHeroPanelProps> = ({ hero, recipe, activeTab, onSelectTab }) => (
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

    <View style={styles.cardPrimary}>
      <Text style={styles.eyebrow}>一菜两吃</Text>
      <Text style={styles.cardTitle}>先决定这是不是你们今天要做的那一道</Text>
      <View style={styles.versionRow}>
        {hero.versionCards.map((card) => {
          const selected = activeTab === card.key;
          return (
            <TouchableOpacity
              key={card.key}
              style={[styles.versionCard, selected && styles.versionCardActive]}
              onPress={() => onSelectTab(card.key)}
              activeOpacity={0.92}
            >
              <Text style={styles.versionTitle}>{card.title}</Text>
              <Text style={styles.versionSubtitle}>{card.subtitle}</Text>
              <Text style={styles.versionDescription} numberOfLines={3}>{card.description}</Text>
              <Text style={[styles.versionCta, selected && styles.versionCtaActive]}>
                {selected ? '当前查看中' : card.key === 'adult' ? '看大人版' : '看宝宝版'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {recipe?.adaptation ? <AdaptationSummary adaptation={recipe.adaptation} compact /> : null}
    </View>

    {!!hero.whyItFits.length && (
      <View style={styles.cardSoft}>
        <Text style={styles.cardTitle}>为什么适合你家今天来做</Text>
        {hero.whyItFits.map((line) => (
          <View key={line} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}
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
  cardPrimary: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing[4],
    gap: Spacing[3],
    ...Shadows.md,
  },
  cardSoft: {
    backgroundColor: '#F7F5EF',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[4],
    gap: Spacing[2],
  },
  eyebrow: {
    fontSize: Typography.fontSize['2xs'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  versionRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  versionCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing[3],
    gap: Spacing[2],
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  versionCardActive: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary[50],
  },
  versionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  versionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  versionDescription: {
    minHeight: 54,
    fontSize: Typography.fontSize.xs,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  versionCta: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary.main,
  },
  versionCtaActive: {
    color: Colors.primary[700],
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
});
