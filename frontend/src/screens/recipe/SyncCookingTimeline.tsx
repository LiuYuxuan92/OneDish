/**
 * 同步烹饪时间线组件 - 双轨道视图
 * 显示成人版和宝宝版平行时间线，共享步骤合并显示
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SyncTimeline, TimelinePhase, TimelinePhaseType } from '../../types';
import { useCookingTimer, minutesToSeconds, formatTime } from '../../hooks/useCookingTimer';

// ============================================
// 类型定义
// ============================================

interface SyncCookingTimelineProps {
  timeline: SyncTimeline;
  babyAgeMonths: number;
  currentPhaseIndex?: number;
  onPhasePress?: (index: number) => void;
  onPhaseComplete?: (index: number) => void;
}

// ============================================
// 样式常量
// ============================================

const PHASE_COLORS: Record<TimelinePhaseType, { bg: string; border: string; text: string; label: string }> = {
  shared: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32', label: '共用' },
  adult: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100', label: '大人' },
  baby: { bg: '#FCE4EC', border: '#E91E63', text: '#880E4F', label: '宝宝' },
  fork: { bg: '#FFFDE7', border: '#FFC107', text: '#F57F17', label: '分叉' },
};

// ============================================
// 组件实现
// ============================================

export function SyncCookingTimeline({
  timeline,
  babyAgeMonths,
  currentPhaseIndex,
  onPhasePress,
  onPhaseComplete,
}: SyncCookingTimelineProps) {
  const { timers, addTimer, startTimer, pauseTimer, resetTimer } = useCookingTimer();

  // 初始化计时器
  React.useEffect(() => {
    timeline.phases.forEach((phase) => {
      if (phase.duration > 0) {
        const timerId = `timeline_${phase.order}`;
        const existing = timers.find((t) => t.id === timerId);
        if (!existing) {
          addTimer(timerId, phase.action, minutesToSeconds(phase.duration));
        }
      }
    });
  }, [timeline.phases, addTimer, timers]);

  const handlePhasePress = useCallback(
    (index: number) => {
      onPhasePress?.(index);
    },
    [onPhasePress]
  );

  const handleComplete = useCallback(
    async (phase: TimelinePhase, index: number) => {
      // 震动反馈
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPhaseComplete?.(index);
    },
    [onPhaseComplete]
  );

  const handleTimerToggle = useCallback(
    (phase: TimelinePhase) => {
      const timerId = `timeline_${phase.order}`;
      const timer = timers.find((t) => t.id === timerId);
      if (timer?.isRunning) {
        pauseTimer(timerId);
      } else {
        startTimer(timerId);
      }
    },
    [timers, startTimer, pauseTimer]
  );

  const handleTimerReset = useCallback(
    (phase: TimelinePhase) => {
      const timerId = `timeline_${phase.order}`;
      resetTimer(timerId);
    },
    [timers, resetTimer]
  );

  // 渲染单个阶段
  const renderPhase = (phase: TimelinePhase, index: number) => {
    const colors = PHASE_COLORS[phase.type];
    const isActive = currentPhaseIndex === index;
    const isCompleted = currentPhaseIndex !== undefined && index < currentPhaseIndex!;
    const timerId = `timeline_${phase.order}`;
    const timer = timers.find((t) => t.id === timerId);

    return (
      <TouchableOpacity
        key={phase.order}
        style={[
          styles.phaseCard,
          { backgroundColor: colors.bg, borderColor: colors.border },
          isActive && styles.phaseCardActive,
          isCompleted && styles.phaseCardCompleted,
        ]}
        onPress={() => handlePhasePress(index)}
        activeOpacity={0.8}
      >
        {/* 阶段头部 */}
        <View style={styles.phaseHeader}>
          <View style={[styles.orderBadge, { backgroundColor: colors.border }]}>
            <Text style={styles.orderText}>{phase.order}</Text>
          </View>
          <View style={[styles.typeTag, { backgroundColor: colors.border }]}>
            <Text style={styles.typeTagText}>{colors.label}</Text>
          </View>
          {phase.target !== 'both' && (
            <View style={styles.targetTag}>
              <Text style={styles.targetText}>
                {phase.target === 'adult' ? '👨' : '👶'}
              </Text>
            </View>
          )}
        </View>

        {/* 动作文字 */}
        <Text style={[styles.actionText, { color: colors.text }]}>{phase.action}</Text>

        {/* 底部：时长标签 + 计时器 */}
        <View style={styles.phaseFooter}>
          {phase.duration > 0 ? (
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>⏱ {phase.duration}分钟</Text>
              {timer && (
                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={() => handleTimerToggle(phase)}
                >
                  <Text style={styles.timerButtonText}>
                    {timer.isRunning ? '⏸ 暂停' : timer.isCompleted ? '✓ 完成' : '▶ 开始'}
                  </Text>
                </TouchableOpacity>
              )}
              {timer && !timer.isCompleted && (
                <Text style={styles.timerCountdown}>
                  {formatTime(timer.remainingSeconds)}
                </Text>
              )}
              {timer && timer.isCompleted && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleTimerReset(phase)}
                >
                  <Text style={styles.resetButtonText}>重置</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.instantLabel}>⚡ 即时完成</Text>
          )}
        </View>

        {/* 备注 */}
        {phase.note && <Text style={styles.noteText}>💡 {phase.note}</Text>}

        {/* 并行标记 */}
        {phase.parallel_with !== undefined && (
          <View style={styles.parallelBadge}>
            <Text style={styles.parallelText}>🔄 并行 #{(phase.parallel_with || 0) + 1}</Text>
          </View>
        )}

        {/* 完成按钮 */}
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: colors.border }]}
          onPress={() => handleComplete(phase, index)}
        >
          <Text style={styles.completeButtonText}>✓ 完成此步</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
              {timeline.time_saved > 0 ? `-${timeline.time_saved}` : '0'}
            </Text>
            <Text style={styles.summaryLabel}>节省分钟</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{timeline.phases.length}步</Text>
            <Text style={styles.summaryLabel}>总步骤</Text>
          </View>
        </View>
      </View>

      {/* 轨道图例 */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS.shared.border }]} />
          <Text style={styles.legendText}>共用</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS.adult.border }]} />
          <Text style={styles.legendText}>大人</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS.baby.border }]} />
          <Text style={styles.legendText}>宝宝</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS.fork.border }]} />
          <Text style={styles.legendText}>分叉</Text>
        </View>
      </View>

      {/* 时间线列表 */}
      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {timeline.phases.map((phase, index) => renderPhase(phase, index))}
      </ScrollView>
    </View>
  );
}

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  savedValue: {
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#757575',
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  phaseCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  phaseCardActive: {
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
  },
  phaseCardCompleted: {
    opacity: 0.6,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  targetTag: {
    marginLeft: 'auto',
  },
  targetText: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
  },
  phaseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationLabel: {
    fontSize: 13,
    color: '#757575',
  },
  instantLabel: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  timerButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timerCountdown: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
    fontVariant: ['tabular-nums'],
  },
  resetButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resetButtonText: {
    color: '#424242',
    fontSize: 12,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 8,
  },
  parallelBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  parallelText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  completeButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
