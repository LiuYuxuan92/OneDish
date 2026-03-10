import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../styles/theme';
import type { DualType } from '../../viewmodels/uiMigration';

interface DualBadgeProps {
  type: DualType;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

const CONFIG: Record<DualType, { emoji: string; label: string; shortLabel: string; bg: string; text: string; border: string }> = {
  dual: {
    emoji: '👨‍👩‍👦',
    label: 'One Dish, Two Ways',
    shortLabel: '2-in-1',
    bg: '#FFF1EB',
    text: '#C4553A',
    border: '#F3C7B9',
  },
  'baby-friendly': {
    emoji: '👶',
    label: 'Baby-Friendly',
    shortLabel: 'Baby OK',
    bg: Colors.secondary[50],
    text: Colors.secondary[700],
    border: Colors.secondary[200],
  },
  'baby-only': {
    emoji: '🍼',
    label: 'Baby Only',
    shortLabel: 'Baby',
    bg: '#E8F0E4',
    text: '#3D6B35',
    border: '#C5DEB8',
  },
  'family-only': {
    emoji: '🍽️',
    label: 'Family Only',
    shortLabel: 'Family',
    bg: Colors.neutral.gray100,
    text: Colors.text.secondary,
    border: Colors.border.light,
  },
};

export const DualBadge: React.FC<DualBadgeProps> = ({ type, size = 'sm', showLabel = true }) => {
  const config = CONFIG[type];
  const fontSize = size === 'xs' ? Typography.fontSize['2xs'] : size === 'md' ? Typography.fontSize.sm : Typography.fontSize.xs;
  const horizontal = size === 'xs' ? Spacing[1.5] : size === 'md' ? Spacing[3] : Spacing[2];
  const vertical = size === 'xs' ? Spacing[0.5] : size === 'md' ? Spacing[1.5] : Spacing[1];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border, paddingHorizontal: horizontal, paddingVertical: vertical }]}> 
      <Text style={[styles.emoji, { fontSize }]}>{config.emoji}</Text>
      {showLabel ? (
        <Text style={[styles.text, { color: config.text, fontSize }]}>{size === 'xs' ? config.shortLabel : config.label}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    gap: Spacing[1],
  },
  emoji: {
    lineHeight: 14,
  },
  text: {
    fontWeight: Typography.fontWeight.medium,
  },
});
