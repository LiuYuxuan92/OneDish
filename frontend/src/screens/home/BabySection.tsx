import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BabyStageGuide } from '../../types';

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
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF7043',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardLeft: { flex: 1 },
  stage: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  nutrients: { fontSize: 13, color: '#FF9800', marginBottom: 4 },
  hint: { fontSize: 12, color: '#888' },
  arrow: { fontSize: 22, color: '#CCC', marginLeft: 8 },
});
