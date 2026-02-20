/**
 * 简家厨 - 烹饪计时器 Hook
 * 支持多步骤独立计时、后台运行、振动提醒
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Vibration, Platform } from 'react-native';

// ============================================
// 类型定义
// ============================================

export interface TimerStep {
  /** 步骤ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 倒计时总秒数 */
  totalSeconds: number;
  /** 剩余秒数 */
  remainingSeconds: number;
  /** 是否运行中 */
  isRunning: boolean;
  /** 是否完成 */
  isCompleted: boolean;
}

export interface UseCookingTimerReturn {
  /** 所有计时器步骤 */
  timers: TimerStep[];
  /** 活动的计时器数量 */
  activeCount: number;
  /** 完成的计时器数量 */
  completedCount: number;
  /** 是否有任何计时器在运行 */
  hasActiveTimers: boolean;
  /** 添加计时器 */
  addTimer: (id: string, name: string, seconds: number) => void;
  /** 移除计时器 */
  removeTimer: (id: string) => void;
  /** 开始计时 */
  startTimer: (id: string) => void;
  /** 暂停计时 */
  pauseTimer: (id: string) => void;
  /** 重置计时器 */
  resetTimer: (id: string) => void;
  /** 暂停所有计时器 */
  pauseAll: () => void;
  /** 重置所有计时器 */
  resetAll: () => void;
  /** 清除所有计时器 */
  clearAll: () => void;
  /** 开始下一个未完成的计时器 */
  startNextTimer: () => void;
}

// ============================================
// Hook 实现
// ============================================

export const useCookingTimer = (): UseCookingTimerReturn => {
  const [timers, setTimers] = useState<TimerStep[]>([]);
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理interval
  const clearTimerInterval = useCallback((id: string) => {
    const interval = intervalRefs.current.get(id);
    if (interval) {
      clearInterval(interval);
      intervalRefs.current.delete(id);
    }
  }, []);

  // 计时器tick
  const tick = useCallback((id: string) => {
    setTimers((prev) => {
      const timerIndex = prev.findIndex((t) => t.id === id);
      if (timerIndex === -1) return prev;

      const timer = prev[timerIndex];
      if (timer.remainingSeconds <= 0) {
        // 计时完成
        clearTimerInterval(id);
        
        // 振动提醒
        Vibration.vibrate([0, 500, 200, 500, 200, 500], false);

        return prev.map((t, i) =>
          i === timerIndex
            ? { ...t, isRunning: false, isCompleted: true, remainingSeconds: 0 }
            : t
        );
      }

      return prev.map((t, i) =>
        i === timerIndex
          ? { ...t, remainingSeconds: t.remainingSeconds - 1 }
          : t
      );
    });
  }, [clearTimerInterval]);

  // 添加计时器
  const addTimer = useCallback((id: string, name: string, seconds: number) => {
    setTimers((prev) => {
      // 如果已存在则不重复添加
      if (prev.some((t) => t.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name,
          totalSeconds: seconds,
          remainingSeconds: seconds,
          isRunning: false,
          isCompleted: false,
        },
      ];
    });
  }, []);

  // 移除计时器
  const removeTimer = useCallback((id: string) => {
    clearTimerInterval(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimerInterval]);

  // 开始计时
  const startTimer = useCallback((id: string) => {
    setTimers((prev) => {
      const timerIndex = prev.findIndex((t) => t.id === id);
      if (timerIndex === -1) return prev;
      
      const timer = prev[timerIndex];
      if (timer.isCompleted) return prev; // 已完成的不再开始

      // 清除旧的interval
      clearTimerInterval(id);

      // 创建新的interval
      const interval = setInterval(() => tick(id), 1000);
      intervalRefs.current.set(id, interval);

      return prev.map((t, i) =>
        i === timerIndex ? { ...t, isRunning: true } : t
      );
    });
  }, [clearTimerInterval, tick]);

  // 暂停计时
  const pauseTimer = useCallback((id: string) => {
    clearTimerInterval(id);
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: false } : t))
    );
  }, [clearTimerInterval]);

  // 重置计时器
  const resetTimer = useCallback((id: string) => {
    clearTimerInterval(id);
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false, isCompleted: false }
          : t
      )
    );
  }, [clearTimerInterval]);

  // 暂停所有
  const pauseAll = useCallback(() => {
    intervalRefs.current.forEach((_, id) => clearTimerInterval(id));
    setTimers((prev) =>
      prev.map((t) => ({ ...t, isRunning: false }))
    );
  }, [clearTimerInterval]);

  // 重置所有
  const resetAll = useCallback(() => {
    intervalRefs.current.forEach((_, id) => clearTimerInterval(id));
    setTimers((prev) =>
      prev.map((t) => ({
        ...t,
        remainingSeconds: t.totalSeconds,
        isRunning: false,
        isCompleted: false,
      }))
    );
  }, [clearTimerInterval]);

  // 清除所有
  const clearAll = useCallback(() => {
    intervalRefs.current.forEach((_, id) => clearTimerInterval(id));
    setTimers([]);
  }, [clearTimerInterval]);

  // 开始下一个未完成的计时器
  const startNextTimer = useCallback(() => {
    const nextTimer = timers.find((t) => !t.isRunning && !t.isCompleted);
    if (nextTimer) {
      startTimer(nextTimer.id);
    }
  }, [timers, startTimer]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
    };
  }, []);

  // 计算统计数据
  const activeCount = timers.filter((t) => t.isRunning).length;
  const completedCount = timers.filter((t) => t.isCompleted).length;
  const hasActiveTimers = activeCount > 0;

  return {
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
    startNextTimer,
  };
};

// ============================================
// 工具函数
// ============================================

/**
 * 格式化秒数为 MM:SS 或 HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

/**
 * 解析时间字符串为秒数
 * 支持格式: "5" (分钟), "1:30" (分:秒), "1:30:00" (时:分:秒)
 */
export const parseTimeString = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 1) {
    // 纯分钟
    return parts[0] * 60;
  } else if (parts.length === 2) {
    // 分:秒
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // 时:分:秒
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};

/**
 * 从分钟数获取总秒数
 */
export const minutesToSeconds = (minutes: number): number => {
  return Math.round(minutes * 60);
};

export default useCookingTimer;
