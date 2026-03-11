import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BabyStageGuide } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

export interface BabySectionProps {
  currentStage: BabyStageGuide;
  onNavigate: () => void;
}

export function BabySection({ currentStage, onNavigate }: BabySectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍼 今日辅食建议</Text>
      </View>
      <TouchableOpacity style={styles.card} onPress={onNavigate} activeOpacity={0.85}>
        <View style={styles.cardLeft}>
          <Text style={styles.stage}>
            {currentStage.name} · {currentStage.age_range}
          </Text>
          <Text style={styles.nutrients}>
            重点营养：{currentStage.key_nutrients.slice(0, 3).join(' · ')}
          </Text>
          <Text style={styles.hint}>点击查看适合的食谱 ›</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: { ...Typography.heading.h4, color: Colors.text.primary },
  card: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.functional.warningLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.warning,
    ...Shadows.xs,
  },
  cardLeft: { flex: 1 },
  stage: { ...Typography.body.regular, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  nutrients: { fontSize: Typography.fontSize.sm, color: Colors.functional.warning, marginBottom: Spacing.xs },
  hint: { fontSize: Typography.fontSize.xs, color: Colors.text.tertiary },
  arrow: { fontSize: 22, color: Colors.neutral.gray300, marginLeft: Spacing.sm },
});
