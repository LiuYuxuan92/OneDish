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
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stepName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  countdownCompleted: {
    color: '#22c55e',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 3,
  },
  progressFillCompleted: {
    backgroundColor: '#22c55e',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#f97316',
    minWidth: 72,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#f3f4f6',
    minWidth: 60,
  },
  resetButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default StepTimer;
