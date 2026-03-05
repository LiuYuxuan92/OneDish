import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

export function ConceptSection() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 什么是一菜两吃？</Text>
      <Text style={styles.text}>
        同样的食材，一锅出两餐。大人吃香，宝宝吃健康。 省去重复备菜的烦恼，让做饭变得更简单！
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: '#2E7D32',
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: Typography.fontSize.sm,
    color: '#388E3C',
    lineHeight: 20,
  },
});
