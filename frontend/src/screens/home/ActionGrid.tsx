import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

interface ActionItem {
  icon: string;
  text: string;
  iconBg: string;
  onPress: () => void;
}

export interface ActionGridProps {
  actions: ActionItem[];
}

export function ActionGrid({ actions }: ActionGridProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Quick entry</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={action.onPress}
            activeOpacity={0.88}
          >
            <View style={[styles.icon, { backgroundColor: action.iconBg }]}>
              <Text style={styles.iconText}>{action.icon}</Text>
            </View>
            <Text style={styles.text}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  text: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});
