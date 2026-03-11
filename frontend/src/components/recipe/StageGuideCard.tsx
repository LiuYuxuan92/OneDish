import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BabyStageGuide } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

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
    backgroundColor: Colors.background.card, borderRadius: BorderRadius.xl, marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    overflow: 'hidden', ...Shadows.sm,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, backgroundColor: Colors.functional.warningLight,
  },
  headerLeft: { flex: 1 },
  stageName: { ...Typography.body.regular, fontWeight: Typography.fontWeight.bold, color: Colors.text.primary },
  ageRange: { fontSize: Typography.fontSize.sm, color: Colors.text.tertiary, marginTop: 2 },
  toggle: { fontSize: Typography.fontSize.sm, color: Colors.text.tertiary },
  body: { padding: Spacing.md, gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  rowIcon: { fontSize: Typography.fontSize.base, marginTop: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.text.primary, marginBottom: 2 },
  rowItems: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  tipsSection: { backgroundColor: Colors.neutral.gray100, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  tipsTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.functional.warning, marginBottom: Spacing.sm },
  tip: { fontSize: Typography.fontSize.sm, color: Colors.text.secondary, lineHeight: 22 },
});
