import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../styles/theme';

export function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>简家厨</Text>
      <Text style={styles.tagline}>一菜两吃，全家共享</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  logo: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  tagline: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    marginTop: Spacing.xs,
    opacity: 0.9,
  },
});
