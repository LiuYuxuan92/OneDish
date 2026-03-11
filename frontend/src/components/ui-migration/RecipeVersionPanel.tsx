import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import { ChefHatIcon, ClockIcon, InfoIcon } from '../common/Icons';
import type { RecipeDetailVersionSectionViewModel } from '../../viewmodels/uiMigration';

interface RecipeVersionPanelProps {
  section?: RecipeDetailVersionSectionViewModel;
}

export const RecipeVersionPanel: React.FC<RecipeVersionPanelProps> = ({ section }) => {
  if (!section) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.key === 'adult' ? '🍽️' : '👶'}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.ageBadge ? (
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{section.ageBadge}</Text>
          </View>
        ) : null}
      </View>

      {section.ingredients.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 食材清单</Text>
          <View style={styles.list}>
            {section.ingredients.map((item) => (
              <View key={`${item.name}-${item.amount}`} style={styles.ingredientItem}>
                <View style={styles.ingredientDot} />
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientAmount}>{item.amount}</Text>
                </View>
                {item.note ? (
                  <View style={styles.noteBadge}>
                    <InfoIcon size={12} color={Colors.primary.main} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {section.seasonings.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧂 调料</Text>
          <View style={styles.seasoningsRow}>
            {section.seasonings.map((item) => (
              <View key={`${item.name}-${item.amount}`} style={styles.seasoningTag}>
                <Text style={styles.seasoningName}>{item.name}</Text>
                <Text style={styles.seasoningAmount}>{item.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {section.steps.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👨‍🍳 制作步骤</Text>
          <View style={styles.list}>
            {section.steps.map((step) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.indexLabel}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepAction}>{step.action}</Text>
                  <View style={styles.stepMeta}>
                    {step.timeText ? (
                      <View style={styles.stepMetaItem}>
                        <ClockIcon size={12} color={Colors.primary.main} />
                        <Text style={styles.stepMetaText}>{step.timeText}</Text>
                      </View>
                    ) : null}
                    {step.toolsText ? (
                      <View style={styles.stepMetaItem}>
                        <ChefHatIcon size={12} color={Colors.text.tertiary} />
                        <Text style={styles.stepMetaText}>{step.toolsText}</Text>
                      </View>
                    ) : null}
                  </View>
                  {step.note ? (
                    <View style={[styles.stepNote, step.highlighted && styles.stepNoteHighlight]}>
                      <Text style={[styles.stepNoteText, step.highlighted && styles.stepNoteTextHighlight]}>{step.note}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {section.nutritionTips ? (
        <View style={[styles.card, styles.softCard]}>
          <Text style={styles.cardTitle}>💡 营养要点</Text>
          <Text style={styles.bodyText}>{section.nutritionTips}</Text>
        </View>
      ) : null}

      {section.allergyAlert ? (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.cardTitle}>⚠️ 过敏提醒</Text>
          <Text style={styles.bodyText}>{section.allergyAlert}</Text>
          <Text style={styles.warningText}>首次添加辅食请遵循“3天观察期”原则。</Text>
        </View>
      ) : null}

      {section.preparationNotes ? (
        <View style={[styles.card, styles.softCard]}>
          <Text style={styles.cardTitle}>📝 准备要点</Text>
          <Text style={styles.bodyText}>{section.preparationNotes}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: Spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  sectionIcon: {
    fontSize: Typography.fontSize.lg,
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  ageBadge: {
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  ageBadgeText: {
    fontSize: Typography.fontSize['2xs'],
    fontWeight: Typography.fontWeight.medium,
    color: Colors.secondary[700],
  },
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[4],
    gap: Spacing[3],
  },
  softCard: {
    backgroundColor: Colors.secondary[50],
  },
  warningCard: {
    backgroundColor: '#FFF8E1',
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  list: {
    gap: Spacing[3],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
  },
  ingredientInfo: {
    flex: 1,
    gap: Spacing[0.5],
  },
  ingredientName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  ingredientAmount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  noteBadge: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.full,
    padding: Spacing[1],
  },
  seasoningsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  seasoningTag: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[0.5],
  },
  seasoningName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  seasoningAmount: {
    fontSize: Typography.fontSize['2xs'],
    color: Colors.text.tertiary,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary[700],
  },
  stepContent: {
    flex: 1,
    gap: Spacing[2],
  },
  stepAction: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    color: Colors.text.primary,
  },
  stepMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  stepMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  stepMetaText: {
    fontSize: Typography.fontSize['2xs'],
    color: Colors.text.secondary,
  },
  stepNote: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
  },
  stepNoteHighlight: {
    backgroundColor: '#FFF3E0',
  },
  stepNoteText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  stepNoteTextHighlight: {
    color: '#B26A00',
  },
  bodyText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    color: Colors.text.secondary,
  },
  warningText: {
    fontSize: Typography.fontSize.xs,
    color: '#8D5A00',
  },
});
