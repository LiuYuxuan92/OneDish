import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { StatusTagType } from '../../viewmodels/uiMigration';

interface StatusTagProps {
  type: StatusTagType;
  detail?: string;
}

const CONFIG: Record<StatusTagType, { emoji: string; label: string; bg: string; text: string }> = {
  'in-plan': { emoji: '🗓️', label: 'In plan', bg: Colors.secondary[50], text: Colors.secondary[700] },
  'on-shopping-list': { emoji: '🛒', label: 'On shopping list', bg: '#FFF3E0', text: '#B26A00' },
  'needs-adaptation': { emoji: '⚠️', label: 'Needs adaptation', bg: '#FFF8E1', text: '#C88900' },
  'previously-rejected': { emoji: '⛔', label: 'Previously rejected', bg: Colors.functional.errorLight, text: '#C62828' },
  'retry-suggested': { emoji: '🔁', label: 'Retry suggested', bg: '#FFF3E0', text: '#8D5A00' },
  'low-confidence': { emoji: '🕒', label: 'Not enough data', bg: Colors.neutral.gray100, text: Colors.text.secondary },
  'pantry-covered': { emoji: '✅', label: 'Pantry covers this', bg: Colors.secondary[50], text: Colors.secondary[700] },
  'few-missing': { emoji: '🧺', label: 'Few items missing', bg: '#FFF3E0', text: '#8D5A00' },
  'updated-by-other': { emoji: '👨‍👩‍👧', label: 'Updated by family', bg: Colors.functional.infoLight, text: '#1565C0' },
};

export const StatusTag: React.FC<StatusTagProps> = ({ type, detail }) => {
  const config = CONFIG[type];
  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}> 
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.text, { color: config.text }]}>{detail || config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    gap: Spacing[1],
  },
  emoji: {
    fontSize: Typography.fontSize['2xs'],
  },
  text: {
    fontSize: Typography.fontSize['2xs'],
    fontWeight: Typography.fontWeight.medium,
  },
});
