import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>常用入口</Text>
        <Text style={styles.caption}>少走一步，直接去最常用的流程</Text>
      </View>
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
  headerRow: {
    gap: 2,
  },
  title: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  caption: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  button: {
    width: '48.5%',
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  text: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: 8,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});
