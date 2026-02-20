/**
 * 简家厨 - 烹饪计时器组件
 * 用于菜谱步骤中的计时功能
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';
import { useCookingTimer, formatTime, TimerStep } from '../../hooks/useCookingTimer';
import { TimerIcon, PlayIcon, PauseIcon, ResetIcon, CloseIcon } from '../common/Icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================
// 类型定义
// ============================================

export interface CookingTimerModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 初始计时器数据（可选） */
  initialTimers?: Array<{
    id: string;
    name: string;
    minutes: number;
  }>;
}

interface TimerItemProps {
  timer: TimerStep;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRemove: () => void;
}

// ============================================
// 单个计时器项组件
// ============================================

const TimerItem: React.FC<TimerItemProps> = ({
  timer,
  onStart,
  onPause,
  onReset,
  onRemove,
}) => {
  const progress = timer.totalSeconds > 0 
    ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds 
    : 0;

  const getTimerStyle = () => {
    if (timer.isCompleted) return styles.timerItemCompleted;
    if (timer.isRunning) return styles.timerItemActive;
    return styles.timerItem;
  };

  return (
    <View style={[styles.timerItemContainer, getTimerStyle()]}>
      <View style={styles.timerHeader}>
        <Text style={styles.timerName} numberOfLines={1}>
          {timer.name}
        </Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <CloseIcon size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.timerBody}>
        <Text style={[
          styles.timerDisplay,
          timer.isCompleted && styles.timerDisplayCompleted,
        ]}>
          {formatTime(timer.remainingSeconds)}
        </Text>
        
        {/* 进度条 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { width: `${progress * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>
      
      <View style={styles.timerControls}>
        {timer.isCompleted ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.resetButton]} 
            onPress={onReset}
          >
            <ResetIcon size={20} color={Colors.primary.main} />
            <Text style={styles.controlButtonText}>重置</Text>
          </TouchableOpacity>
        ) : timer.isRunning ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.pauseButton]} 
            onPress={onPause}
          >
            <PauseIcon size={20} color={Colors.text.inverse} />
            <Text style={styles.controlButtonText}>暂停</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.controlButton, styles.startButton]} 
            onPress={onStart}
          >
            <PlayIcon size={20} color={Colors.text.inverse} />
            <Text style={styles.controlButtonText}>开始</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.resetButtonSmall]} 
          onPress={onReset}
        >
          <ResetIcon size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// 烹饪计时器弹窗主组件
// ============================================

export const CookingTimerModal: React.FC<CookingTimerModalProps> = ({
  visible,
  onClose,
  initialTimers = [],
}) => {
  const {
    timers,
    activeCount,
    completedCount,
    hasActiveTimers,
    addTimer,
    removeTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    pauseAll,
    resetAll,
    clearAll,
  } = useCookingTimer();

  const [newTimerMinutes, setNewTimerMinutes] = useState<string>('');
  const [newTimerName, setNewTimerName] = useState<string>('');

  // 添加初始计时器
  React.useEffect(() => {
    if (visible && initialTimers.length > 0) {
      initialTimers.forEach((timer) => {
        addTimer(timer.id, timer.name, timer.minutes * 60);
      });
    }
  }, [visible]);

  const handleAddTimer = () => {
    const minutes = parseInt(newTimerMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) return;
    
    const id = `timer_${Date.now()}`;
    const name = newTimerName || `计时器 ${timers.length + 1}`;
    addTimer(id, name, minutes * 60);
    setNewTimerMinutes('');
    setNewTimerName('');
  };

  const handleClose = () => {
    pauseAll();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 头部 */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitle}>
              <TimerIcon size={24} color={Colors.primary.main} />
              <Text style={styles.headerTitleText}>烹饪计时器</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <CloseIcon size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* 统计信息 */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{timers.length}</Text>
              <Text style={styles.statLabel}>总计</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.primary.main }]}>
                {activeCount}
              </Text>
              <Text style={styles.statLabel}>进行中</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.functional.success }]}>
                {completedCount}
              </Text>
              <Text style={styles.statLabel}>已完成</Text>
            </View>
          </View>

          {/* 计时器列表 */}
          <View style={styles.timerList}>
            {timers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⏱</Text>
                <Text style={styles.emptyText}>还没有计时器</Text>
                <Text style={styles.emptySubText}>
                  添加一个计时器开始烹饪
                </Text>
              </View>
            ) : (
              timers.map((timer) => (
                <TimerItem
                  key={timer.id}
                  timer={timer}
                  onStart={() => startTimer(timer.id)}
                  onPause={() => pauseTimer(timer.id)}
                  onReset={() => resetTimer(timer.id)}
                  onRemove={() => removeTimer(timer.id)}
                />
              ))
            )}
          </View>

          {/* 添加计时器 */}
          <View style={styles.addTimerContainer}>
            <View style={styles.addTimerInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>名称</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity 
                    style={styles.timerInput}
                    onPress={() => setNewTimerName('腌制')}
                  >
                    <Text style={styles.timerInputText}>
                      {newTimerName || '步骤名称'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>分钟</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity 
                    style={styles.timerInput}
                    onPress={() => setNewTimerMinutes('5')}
                  >
                    <Text style={styles.timerInputText}>
                      {newTimerMinutes || '分钟'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddTimer}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 底部操作 */}
          {timers.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={pauseAll}
              >
                <Text style={styles.footerButtonText}>全部暂停</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.footerButton, styles.footerButtonPrimary]}
                onPress={resetAll}
              >
                <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
                  全部重置
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// 样式
// ============================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.background.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    maxHeight: screenHeight * 0.85,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleText: {
    ...Typography.heading.h3,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
  },
  statLabel: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.neutral.gray300,
  },
  timerList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    maxHeight: screenHeight * 0.4,
  },
  timerItemContainer: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  timerItemActive: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
  },
  timerItemCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.functional.success,
    opacity: 0.7,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timerName: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    flex: 1,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  timerBody: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.mono,
  },
  timerDisplayCompleted: {
    color: Colors.functional.success,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  progressBackground: {
    height: 6,
    backgroundColor: Colors.neutral.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary.main,
    borderRadius: 3,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  startButton: {
    backgroundColor: Colors.primary.main,
    flex: 1,
  },
  pauseButton: {
    backgroundColor: Colors.functional.warning,
    flex: 1,
  },
  resetButton: {
    backgroundColor: Colors.neutral.gray100,
    flex: 1,
  },
  resetButtonSmall: {
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.neutral.gray100,
  },
  controlButtonText: {
    ...Typography.body.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.inverse,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
  },
  emptySubText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  addTimerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  addTimerInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.body.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  timerInput: {
    paddingVertical: Spacing.sm,
  },
  timerInputText: {
    ...Typography.body.regular,
    color: Colors.text.secondary,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  footerButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.gray100,
    alignItems: 'center',
  },
  footerButtonPrimary: {
    backgroundColor: Colors.primary.main,
  },
  footerButtonText: {
    ...Typography.body.regular,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
  },
  footerButtonTextPrimary: {
    color: Colors.text.inverse,
  },
});

export default CookingTimerModal;
