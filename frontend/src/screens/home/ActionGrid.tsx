import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

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
      <Text style={styles.title}>快捷操作</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={action.onPress}
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
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: Spacing.lg,
  },
  button: {
    alignItems: 'center',
    width: '25%',
    minWidth: 72,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  text: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});
