import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimelinePhase, TimelinePhaseType } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

interface StepCardProps {
  phase: TimelinePhase;
  parallelPhase?: TimelinePhase;
  isCurrent?: boolean;
}

interface PhaseStyle {
  backgroundColor: string;
  borderColor: string;
  emoji: string;
  label: string;
}

const PHASE_STYLES: Record<TimelinePhaseType, PhaseStyle> = {
  shared: {
    backgroundColor: Colors.functional.infoLight,
    borderColor: Colors.functional.info,
    emoji: '👨‍👩‍👧',
    label: '共用',
  },
  adult: {
    backgroundColor: Colors.functional.warningLight,
    borderColor: Colors.functional.warning,
    emoji: '🍽️',
    label: '大人',
  },
  baby: {
    backgroundColor: '#FCE4EC',
    borderColor: '#E91E63',
    emoji: '🍼',
    label: '宝宝',
  },
  fork: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFC107',
    emoji: '🔀',
    label: '分叉点',
  },
};

const StepCard: React.FC<StepCardProps> = ({ phase, parallelPhase, isCurrent = false }) => {
  const phaseStyle = PHASE_STYLES[phase.type];

  const parallelStyle = parallelPhase ? PHASE_STYLES[parallelPhase.type] : null;

  return (
    <View style={styles.container}>
      {/* Main card */}
      <View
        style={[
          styles.mainCard,
          {
            backgroundColor: phaseStyle.backgroundColor,
            borderColor: phaseStyle.borderColor,
          },
          isCurrent && styles.mainCardCurrent,
        ]}
      >
        {/* Label row */}
        <View style={styles.labelRow}>
          <Text style={styles.emoji}>{phaseStyle.emoji}</Text>
          <View style={[styles.typeTag, { backgroundColor: phaseStyle.borderColor }]}>
            <Text style={styles.typeTagText}>{phaseStyle.label}</Text>
          </View>
          {phase.timer_required && (
            <View style={styles.timerTag}>
              <Text style={styles.timerTagText}>⏱ 需计时</Text>
            </View>
          )}
        </View>

        {/* Action text */}
        <Text style={styles.actionText}>{phase.action}</Text>

        {/* Note */}
        {phase.note ? (
          <Text style={styles.noteText}>💡 {phase.note}</Text>
        ) : null}

        {/* Tools */}
        {phase.tools && phase.tools.length > 0 ? (
          <Text style={styles.toolsText}>🔧 {phase.tools.join('、')}</Text>
        ) : null}
      </View>

      {/* Parallel phase small card */}
      {parallelPhase && parallelStyle ? (
        <View style={styles.parallelContainer}>
          <Text style={styles.parallelTitle}>同时进行</Text>
          <View
            style={[
              styles.parallelCard,
              {
                backgroundColor: parallelStyle.backgroundColor,
                borderColor: parallelStyle.borderColor,
              },
            ]}
          >
            <Text style={styles.parallelEmoji}>{parallelStyle.emoji}</Text>
            <Text style={styles.parallelActionText}>{parallelPhase.action}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  mainCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  mainCardCurrent: {
    ...Shadows.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  emoji: {
    fontSize: 20,
    marginRight: 4,
  },
  typeTag: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  typeTagText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  timerTag: {
    backgroundColor: Colors.functional.warning,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  timerTagText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  noteText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  toolsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  parallelContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  parallelTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  parallelCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  parallelEmoji: {
    fontSize: 16,
  },
  parallelActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
});

export default StepCard;
