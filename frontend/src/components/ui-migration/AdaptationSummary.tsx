import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../styles/theme';
import type { AdaptationSummaryModel } from '../../viewmodels/uiMigration';

interface AdaptationSummaryProps {
  adaptation?: AdaptationSummaryModel;
  compact?: boolean;
}

export const AdaptationSummary: React.FC<AdaptationSummaryProps> = ({ adaptation, compact = false }) => {
  if (!adaptation) return null;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {adaptation.splitStep ? <Text style={styles.compactPill}>✂️ Step {adaptation.splitStep}</Text> : null}
        {adaptation.texture ? <Text style={styles.compactPill}>👶 {adaptation.texture}</Text> : null}
        {adaptation.extraPrep && adaptation.extraPrep !== 'none' ? <Text style={styles.compactPill}>+{adaptation.extraPrep} prep</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>👨‍👩‍👦 Baby adaptation</Text>
      <View style={styles.grid}>
        {adaptation.method ? (
          <View style={styles.gridCell}>
            <Text style={styles.caption}>Method</Text>
            <Text style={styles.value}>{adaptation.method}</Text>
          </View>
        ) : null}
        {adaptation.texture ? (
          <View style={styles.gridCell}>
            <Text style={styles.caption}>Texture</Text>
            <Text style={styles.value}>{adaptation.texture}</Text>
          </View>
        ) : null}
      </View>
      {adaptation.splitStep ? <Text style={styles.callout}>✂️ Split at step {adaptation.splitStep}</Text> : null}
      {adaptation.summary ? <Text style={styles.summary}>{adaptation.summary}</Text> : null}
      {adaptation.allergenNotes?.length ? (
        <View style={styles.alertBox}>
          {adaptation.allergenNotes.map(note => (
            <Text key={note} style={styles.alertText}>⚠️ {note}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[3],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.secondary[100],
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  gridCell: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing[2],
    gap: Spacing[1],
  },
  caption: {
    fontSize: Typography.fontSize['2xs'],
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
  },
  callout: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary[700],
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.xl,
  },
  summary: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  alertBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.xl,
    padding: Spacing[2],
    gap: Spacing[1],
  },
  alertText: {
    fontSize: Typography.fontSize.xs,
    color: '#8D5A00',
  },
  compactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  compactPill: {
    backgroundColor: Colors.neutral.gray100,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize['2xs'],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
});
