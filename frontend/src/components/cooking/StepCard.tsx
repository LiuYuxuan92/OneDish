import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimelinePhase, TimelinePhaseType } from '../../types';

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
    backgroundColor: '#E0F7FA',
    borderColor: '#00BCD4',
    emoji: '👨‍👩‍👧',
    label: '共用',
  },
  adult: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
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
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mainCardCurrent: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timerTag: {
    backgroundColor: '#FF5722',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timerTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
    lineHeight: 30,
  },
  noteText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 20,
  },
  toolsText: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 6,
    lineHeight: 18,
  },
  parallelContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  parallelTitle: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  parallelCard: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parallelEmoji: {
    fontSize: 16,
  },
  parallelActionText: {
    fontSize: 15,
    color: '#424242',
    flex: 1,
    lineHeight: 20,
  },
});

export default StepCard;
