import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { BabySuitabilityChipModel } from '../../viewmodels/uiMigration';

interface BabySuitabilityChipsProps {
  chips: BabySuitabilityChipModel[];
}

const toneStyle = {
  success: { backgroundColor: Colors.secondary[50], color: Colors.secondary[700] },
  warning: { backgroundColor: '#FFF8E1', color: '#C88900' },
  neutral: { backgroundColor: Colors.neutral.gray100, color: Colors.text.secondary },
  accent: { backgroundColor: Colors.primary[50], color: Colors.primary[700] },
} as const;

export const BabySuitabilityChips: React.FC<BabySuitabilityChipsProps> = ({ chips }) => (
  <View style={styles.container}>
    {chips.map(chip => {
      const palette = toneStyle[chip.tone];
      return (
        <View key={chip.key} style={[styles.chip, { backgroundColor: palette.backgroundColor }]}> 
          <Text style={[styles.label, { color: palette.color }]}>{chip.label}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  chip: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: Typography.fontSize['2xs'],
    fontWeight: Typography.fontWeight.medium,
  },
});
