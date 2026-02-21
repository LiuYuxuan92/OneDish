import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BabyStageGuide } from '../../types';

interface Props {
  stage: BabyStageGuide;
  defaultExpanded?: boolean;
}

export function StageGuideCard({ stage, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)}>
        <View style={styles.headerLeft}>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.ageRange}>{stage.age_range}</Text>
        </View>
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <Row icon="✅" label="可以吃" items={stage.can_eat} color="#4CAF50" />
          <Row icon="❌" label="不能吃" items={stage.cannot_eat} color="#F44336" />
          <InfoRow icon="📐" label="质地要求" text={stage.texture_desc} />
          <InfoRow icon="🍽️" label="喂养频次" text={stage.meal_frequency} />
          <Row icon="💊" label="重点营养" items={stage.key_nutrients} color="#FF9800" />
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 喂养贴士</Text>
            {stage.guide_tips.map((tip, i) => (
              <Text key={i} style={styles.tip}>• {tip}</Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Row({ icon, label, items, color }: { icon: string; label: string; items: string[]; color: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        <Text style={styles.rowItems}>{items.join('、')}</Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowItems}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF8E1',
  },
  headerLeft: { flex: 1 },
  stageName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  ageRange: { fontSize: 13, color: '#888', marginTop: 2 },
  toggle: { fontSize: 14, color: '#888' },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  rowIcon: { fontSize: 16, marginTop: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 2 },
  rowItems: { fontSize: 13, color: '#555', lineHeight: 20 },
  tipsSection: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12 },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: '#FF9800', marginBottom: 8 },
  tip: { fontSize: 13, color: '#555', lineHeight: 22 },
});
