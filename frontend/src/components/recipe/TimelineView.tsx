/**
 * 同步烹饪时间线组件
 * 颜色编码：共用=青色，大人=橙色，宝宝=粉色，分叉=黄色
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { SyncTimeline, TimelinePhase, TimelinePhaseType } from '../../types';
import { ClockIcon } from '../common/Icons';

const PHASE_COLORS: Record<TimelinePhaseType, { bg: string; border: string; text: string; label: string }> = {
  shared: { bg: '#E0F7FA', border: '#00ACC1', text: '#006064', label: '共用' },
  adult: { bg: '#FFF3E0', border: '#FF8C42', text: '#E65100', label: '大人' },
  baby: { bg: '#FCE4EC', border: '#EC407A', text: '#880E4F', label: '宝宝' },
  fork: { bg: '#FFFDE7', border: '#FBC02D', text: '#F57F17', label: '分叉' },
};

interface TimelineViewProps {
  timeline: SyncTimeline | undefined;
  isLoading: boolean;
  error?: string | null;
}

export function TimelineView({ timeline, isLoading, error }: TimelineViewProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text style={styles.loadingText}>生成同步烹饪时间线...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!timeline || timeline.phases.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.emptyText}>暂无时间线数据</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 时间概览 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{timeline.total_time}分钟</Text>
            <Text style={styles.summaryLabel}>总用时</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.savedValue]}>
              {timeline.time_saved > 0 ? `-${timeline.time_saved}分钟` : '0分钟'}
            </Text>
            <Text style={styles.summaryLabel}>节省时间</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{timeline.phases.length}步</Text>
            <Text style={styles.summaryLabel}>总步骤</Text>
          </View>
        </View>
      </View>

      {/* 颜色图例 */}
      <View style={styles.legendRow}>
        {Object.entries(PHASE_COLORS).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color.border }]} />
            <Text style={styles.legendText}>{color.label}</Text>
          </View>
        ))}
      </View>

      {/* 时间线步骤 */}
      <View style={styles.timeline}>
        {timeline.phases.map((phase, index) => (
          <TimelinePhaseCard
            key={phase.order}
            phase={phase}
            isLast={index === timeline.phases.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function TimelinePhaseCard({ phase, isLast }: { phase: TimelinePhase; isLast: boolean }) {
  const colors = PHASE_COLORS[phase.type];

  return (
    <View style={styles.phaseRow}>
      {/* 时间线轨道 */}
      <View style={styles.trackContainer}>
        <View style={[styles.trackDot, { backgroundColor: colors.border }]}>
          <Text style={styles.trackOrder}>{phase.order}</Text>
        </View>
        {!isLast && <View style={[styles.trackLine, { backgroundColor: colors.border }]} />}
      </View>

      {/* 阶段卡片 */}
      <View style={[styles.phaseCard, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
        <View style={styles.phaseHeader}>
          <View style={[styles.typeBadge, { backgroundColor: colors.border }]}>
            <Text style={styles.typeBadgeText}>{colors.label}</Text>
          </View>
          {phase.duration > 0 && (
            <View style={styles.durationBadge}>
              <ClockIcon size={12} color={Colors.text.secondary} />
              <Text style={styles.durationText}>{phase.duration}分钟</Text>
            </View>
          )}
          {phase.parallel_with && (
            <View style={styles.parallelBadge}>
              <Text style={styles.parallelText}>可并行</Text>
            </View>
          )}
        </View>
        <Text style={[styles.phaseAction, { color: colors.text }]}>{phase.action}</Text>
        {phase.note && (
          <Text style={styles.phaseNote}>{phase.note}</Text>
        )}
        {phase.tools && phase.tools.length > 0 && (
          <Text style={styles.phaseTools}>工具: {phase.tools.join('、')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  centerContent: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.functional.error,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },

  // 概览卡片
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  savedValue: {
    color: Colors.functional.success,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border.light,
  },

  // 图例
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },

  // 时间线
  timeline: {
    paddingLeft: Spacing.xs,
  },
  phaseRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  trackContainer: {
    width: 32,
    alignItems: 'center',
  },
  trackDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackOrder: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  trackLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },

  // 阶段卡片
  phaseCard: {
    flex: 1,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  parallelBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  parallelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.functional.success,
    fontWeight: Typography.fontWeight.semibold,
  },
  phaseAction: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    fontWeight: Typography.fontWeight.medium,
  },
  phaseNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  phaseTools: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
});
