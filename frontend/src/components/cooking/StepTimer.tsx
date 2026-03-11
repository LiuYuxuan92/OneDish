/**
 * 简家厨 - 步骤计时器组件
 * 为单个烹饪步骤提供独立的倒计时计时器
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import useCookingTimer, {
  formatTime,
  minutesToSeconds,
} from '@hooks/useCookingTimer';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

// ============================================
// 类型定义
// ============================================

interface StepTimerProps {
  stepId: string;
  stepName: string;
  durationMinutes: number;
  autoStart?: boolean;
  onComplete?: () => void;
}

// ============================================
// 组件实现
// ============================================

const StepTimer: React.FC<StepTimerProps> = ({
  stepId,
  stepName,
  durationMinutes,
  autoStart = false,
  onComplete,
}) => {
  const {
    timers,
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useCookingTimer();

  // 用 ref 保存 onComplete，避免 useEffect 闭包问题
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 挂载时注册计时器
  useEffect(() => {
    addTimer(stepId, stepName, minutesToSeconds(durationMinutes));
    // 仅在挂载时执行一次，依赖值不会变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoStart 逻辑：timer 已注册后自动启动
  const timer = timers.find((t) => t.id === stepId);

  useEffect(() => {
    if (!timer) return;
    if (autoStart && !timer.isRunning && !timer.isCompleted) {
      startTimer(stepId);
    }
    // 仅当 timer 首次变为可用时触发 autoStart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer !== undefined]);

  // 监听完成状态，调用 onComplete
  const prevIsCompletedRef = useRef(false);
  useEffect(() => {
    if (!timer) return;
    if (timer.isCompleted && !prevIsCompletedRef.current) {
      prevIsCompletedRef.current = true;
      onCompleteRef.current?.();
    }
    if (!timer.isCompleted) {
      prevIsCompletedRef.current = false;
    }
  }, [timer?.isCompleted, timer]);

  // 计算进度（0~1）
  const remaining = timer?.remainingSeconds ?? minutesToSeconds(durationMinutes);
  const total = timer?.totalSeconds ?? minutesToSeconds(durationMinutes);
  const progress = total > 0 ? remaining / total : 0;
  const isCompleted = timer?.isCompleted ?? false;
  const isRunning = timer?.isRunning ?? false;

  // ============================================
  // 渲染
  // ============================================

  return (
    <View style={styles.container}>
      {/* 步骤名称 */}
      <Text style={styles.stepName}>{stepName}</Text>

      {/* 倒计时大字 */}
      <Text style={[styles.countdown, isCompleted && styles.countdownCompleted]}>
        {formatTime(remaining)}
      </Text>

      {/* 进度条 */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` as `${number}%` },
            isCompleted && styles.progressFillCompleted,
          ]}
        />
      </View>

      {/* 操作按钮区 */}
      {isCompleted ? (
        <View style={styles.completedRow}>
          <Text style={styles.completedText}>✓ 完成</Text>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={() => resetTimer(stepId)}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>重置</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {/* 开始 / 暂停 */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => (isRunning ? pauseTimer(stepId) : startTimer(stepId))}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {isRunning ? '暂停' : '开始'}
            </Text>
          </TouchableOpacity>

          {/* 重置 */}
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={() => resetTimer(stepId)}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>重置</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  stepName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  countdown: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  countdownCompleted: {
    color: Colors.functional.success,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.sm,
  },
  progressFillCompleted: {
    backgroundColor: Colors.functional.success,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  completedRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  completedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.functional.success,
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary.main,
    minWidth: 72,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  resetButton: {
    backgroundColor: Colors.neutral.gray100,
    minWidth: 60,
  },
  resetButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default StepTimer;
