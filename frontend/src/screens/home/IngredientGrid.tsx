import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface IngredientItem {
  name: string;
  icon: string;
  color: string;
}

const ingredients: IngredientItem[] = [
  { name: '鸡肉', icon: '🍗', color: '#FFE4C4' },
  { name: '猪肉', icon: '🥩', color: '#FFB6C1' },
  { name: '鱼肉', icon: '🐟', color: '#87CEEB' },
  { name: '蔬菜', icon: '🥬', color: '#98FB98' },
];

export interface IngredientGridProps {
  onSelectIngredient: (name: string) => void;
}

export function IngredientGrid({ onSelectIngredient }: IngredientGridProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>按食材选菜</Text>
      <View style={styles.grid}>
        {ingredients.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.item, { backgroundColor: item.color }]}
            onPress={() => onSelectIngredient(item.name)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.name}>{item.name}</Text>
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
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  item: {
    width: (width - Spacing.lg * 2 - Spacing.md * 4) / 4,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.xs,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
