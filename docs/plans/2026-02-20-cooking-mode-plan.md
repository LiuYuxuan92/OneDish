# Cooking Mode 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现全屏沉浸式烹饪模式，把菜谱 App 升级为厨房做饭助手，解决时间管理混乱、油手操作不便、宝宝版粗糙、两份撞时间四大痛点。

**Architecture:** 纯前端实现，复用已有 `SyncTimeline` 数据（Phase 2A）和 `useCookingTimer` hook。新增 `CookingModeScreen` 全屏页面，分三个阶段：框架骨架 → 语音+手势+提醒 → 月龄精细化。

**Tech Stack:** React Native, Expo SDK (expo-speech, expo-keep-awake, expo-haptics), React Navigation, AsyncStorage, react-native-gesture-handler

---

## Phase A：烹饪模式框架（核心骨架）

### Task 1: 添加路由类型 + 注册导航

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/navigation/RecipeNavigator.tsx`

**Step 1: 修改 types/index.ts，在 RecipeStackParamList 中添加 CookingMode 路由**

在 `RecipeStackParamList` 中添加：
```typescript
export type RecipeStackParamList = {
  RecipeList: { ingredient?: string; type?: string; difficulty?: string } | undefined;
  RecipeDetail: { recipeId: string; babyAgeMonths?: number };
  Search: undefined;
  CookingMode: { recipeId: string; babyAgeMonths: number };  // 新增
};
```

同时在 `HomeStackParamList` 和 `PlanStackParamList` 也添加 CookingMode（保持一致，从这些 Stack 也能进入烹饪模式）：
```typescript
export type HomeStackParamList = {
  Home: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string; babyAgeMonths: number };  // 新增
};

export type PlanStackParamList = {
  WeeklyPlan: undefined;
  ShoppingList: undefined;
  ShoppingListDetail: { listId: string };
  ShoppingListHistory: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string; babyAgeMonths: number };  // 新增
};
```

**Step 2: 在 RecipeNavigator.tsx 中注册 CookingModeScreen**

```typescript
import { CookingModeScreen } from '../screens/recipe/CookingModeScreen';

// 在 Stack.Navigator 内添加（headerShown: false 使其全屏）：
<Stack.Screen
  name="CookingMode"
  component={CookingModeScreen}
  options={{ headerShown: false, gestureEnabled: false }}
/>
```

对 HomeNavigator.tsx 和 PlanNavigator.tsx 做同样处理。

**Step 3: 验证**

```bash
cd D:\claude-code\qinzicanhe\frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：无 CookingMode 相关类型错误（CookingModeScreen 文件还没创建时会有 import 错误，暂时注释掉 import 先确认类型正确）

---

### Task 2: 创建 useCookingSession hook

**Files:**
- Create: `frontend/src/hooks/useCookingSession.ts`

这个 hook 管理整个烹饪会话的状态（当前步骤、进度持久化、会话恢复）。

**Step 1: 创建 `frontend/src/hooks/useCookingSession.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncTimeline, TimelinePhase } from '../types';

export interface CookingSession {
  recipeId: string;
  babyAgeMonths: number;
  currentPhaseIndex: number;
  completedPhases: number[];
  startedAt: string;
}

const SESSION_KEY = (recipeId: string) => `cooking_session_${recipeId}`;

export function useCookingSession(timeline: SyncTimeline | undefined) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const phases = timeline?.phases ?? [];
  const currentPhase: TimelinePhase | undefined = phases[currentIndex];
  const totalPhases = phases.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalPhases - 1;
  const progress = totalPhases > 0 ? (currentIndex / totalPhases) : 0;

  // 从 AsyncStorage 恢复会话
  useEffect(() => {
    if (!timeline) return;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY(timeline.recipe_id));
        if (raw) {
          const session: CookingSession = JSON.parse(raw);
          if (session.recipeId === timeline.recipe_id) {
            setCurrentIndex(session.currentPhaseIndex);
            setCompletedPhases(session.completedPhases);
          }
        }
      } catch {}
      setSessionLoaded(true);
    };
    load();
  }, [timeline?.recipe_id]);

  // 保存会话到 AsyncStorage
  const saveSession = useCallback(async (index: number, completed: number[]) => {
    if (!timeline) return;
    const session: CookingSession = {
      recipeId: timeline.recipe_id,
      babyAgeMonths: timeline.baby_age_months,
      currentPhaseIndex: index,
      completedPhases: completed,
      startedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem(SESSION_KEY(timeline.recipe_id), JSON.stringify(session));
    } catch {}
  }, [timeline]);

  // 清除会话（烹饪完成时）
  const clearSession = useCallback(async () => {
    if (!timeline) return;
    try {
      await AsyncStorage.removeItem(SESSION_KEY(timeline.recipe_id));
    } catch {}
  }, [timeline]);

  const goNext = useCallback(() => {
    if (isLast) return;
    const nextIndex = currentIndex + 1;
    const newCompleted = [...completedPhases, currentIndex];
    setCurrentIndex(nextIndex);
    setCompletedPhases(newCompleted);
    saveSession(nextIndex, newCompleted);
  }, [currentIndex, completedPhases, isLast, saveSession]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    saveSession(prevIndex, completedPhases);
  }, [currentIndex, completedPhases, isFirst, saveSession]);

  const markComplete = useCallback(() => {
    const newCompleted = [...completedPhases, currentIndex];
    setCompletedPhases(newCompleted);
    saveSession(currentIndex, newCompleted);
    if (!isLast) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveSession(nextIndex, newCompleted);
    }
  }, [currentIndex, completedPhases, isLast, saveSession]);

  const toggleVoice = useCallback(() => setVoiceEnabled(v => !v), []);

  return {
    currentIndex,
    currentPhase,
    totalPhases,
    completedPhases,
    isFirst,
    isLast,
    progress,
    voiceEnabled,
    sessionLoaded,
    goNext,
    goPrev,
    markComplete,
    toggleVoice,
    clearSession,
  };
}
```

**Step 2: 验证类型**

```bash
cd D:\claude-code\qinzicanhe\frontend && npx tsc --noEmit 2>&1 | grep useCookingSession
```
预期：无错误

---

### Task 3: 创建 StepTimer 组件

**Files:**
- Create: `frontend/src/components/cooking/StepTimer.tsx`

倒计时显示组件，复用已有 `useCookingTimer` hook 和 `formatTime` 工具函数。

**Step 1: 创建目录和文件**

```typescript
// frontend/src/components/cooking/StepTimer.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCookingTimer, formatTime, minutesToSeconds } from '../../hooks/useCookingTimer';

interface StepTimerProps {
  stepId: string;
  stepName: string;
  durationMinutes: number;  // 步骤时长（分钟）
  autoStart?: boolean;
  onComplete?: () => void;
}

export function StepTimer({ stepId, stepName, durationMinutes, autoStart = false, onComplete }: StepTimerProps) {
  const { timers, addTimer, startTimer, pauseTimer, resetTimer } = useCookingTimer();
  const timer = timers.find(t => t.id === stepId);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const seconds = minutesToSeconds(durationMinutes);
    addTimer(stepId, stepName, seconds);
  }, [stepId]);

  useEffect(() => {
    if (autoStart && timer && !timer.isRunning && !timer.isCompleted) {
      startTimer(stepId);
    }
  }, [autoStart, timer?.id]);

  useEffect(() => {
    if (timer?.isCompleted) {
      onCompleteRef.current?.();
    }
  }, [timer?.isCompleted]);

  if (!timer) return null;

  const remaining = timer.remainingSeconds;
  const total = timer.totalSeconds;
  const pct = total > 0 ? (remaining / total) : 1;
  const isRunning = timer.isRunning;
  const isCompleted = timer.isCompleted;

  return (
    <View style={styles.container}>
      <Text style={[styles.time, isCompleted && styles.timeCompleted]}>
        ⏱ {formatTime(remaining)}
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` as any }, isCompleted && styles.progressDone]} />
      </View>
      <View style={styles.controls}>
        {!isCompleted && (
          <TouchableOpacity
            onPress={() => isRunning ? pauseTimer(stepId) : startTimer(stepId)}
            style={styles.btn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.btnText}>{isRunning ? '⏸ 暂停' : '▶ 开始'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => resetTimer(stepId)}
          style={[styles.btn, styles.btnSecondary]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>↺ 重置</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  time: { fontSize: 32, fontWeight: '700', color: '#333', marginBottom: 8 },
  timeCompleted: { color: '#4CAF50' },
  progressBar: {
    width: '80%', height: 6, backgroundColor: '#E0E0E0',
    borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  progressFill: { height: '100%', backgroundColor: '#FF7043', borderRadius: 3 },
  progressDone: { backgroundColor: '#4CAF50' },
  controls: { flexDirection: 'row', gap: 12 },
  btn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FF7043', borderRadius: 20,
  },
  btnSecondary: { backgroundColor: '#F5F5F5' },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  btnTextSecondary: { color: '#666' },
});
```

---

### Task 4: 创建 StepCard 组件

**Files:**
- Create: `frontend/src/components/cooking/StepCard.tsx`

显示当前步骤（大字）和并行的宝宝/大人步骤（小卡片）。

**Step 1: 创建 `frontend/src/components/cooking/StepCard.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimelinePhase } from '../../types';

interface StepCardProps {
  phase: TimelinePhase;
  parallelPhase?: TimelinePhase;  // 并行的另一条线步骤
  isCurrent: boolean;
}

const PHASE_COLORS: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
  shared:  { bg: '#E0F7FA', border: '#00BCD4', label: '共用',   emoji: '👨‍👩‍👧' },
  adult:   { bg: '#FFF3E0', border: '#FF9800', label: '大人',   emoji: '🍽️' },
  baby:    { bg: '#FCE4EC', border: '#E91E63', label: '宝宝',   emoji: '🍼' },
  fork:    { bg: '#FFFDE7', border: '#FFC107', label: '分叉点', emoji: '🔀' },
};

export function StepCard({ phase, parallelPhase, isCurrent }: StepCardProps) {
  const color = PHASE_COLORS[phase.type] ?? PHASE_COLORS.shared;

  return (
    <View style={styles.wrapper}>
      {/* 主步骤卡片（大字） */}
      <View style={[
        styles.mainCard,
        { backgroundColor: color.bg, borderColor: color.border },
        isCurrent && styles.mainCardActive,
      ]}>
        <View style={styles.labelRow}>
          <Text style={styles.emoji}>{color.emoji}</Text>
          <Text style={[styles.label, { color: color.border }]}>{color.label}</Text>
          {phase.timer_required && <Text style={styles.timerTag}>⏱ 需计时</Text>}
        </View>
        <Text style={styles.action}>{phase.action}</Text>
        {phase.note && <Text style={styles.note}>💡 {phase.note}</Text>}
        {phase.tools && phase.tools.length > 0 && (
          <Text style={styles.tools}>🔧 {phase.tools.join('、')}</Text>
        )}
      </View>

      {/* 并行步骤小卡片 */}
      {parallelPhase && (
        <View style={styles.parallelContainer}>
          <Text style={styles.parallelLabel}>同时进行</Text>
          <View style={[
            styles.parallelCard,
            { borderColor: PHASE_COLORS[parallelPhase.type]?.border ?? '#999' },
          ]}>
            <Text style={styles.parallelEmoji}>
              {PHASE_COLORS[parallelPhase.type]?.emoji}
            </Text>
            <Text style={styles.parallelAction}>{parallelPhase.action}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16 },
  mainCard: {
    borderRadius: 16, borderWidth: 2, padding: 20,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  mainCardActive: { elevation: 4, shadowOpacity: 0.2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  emoji: { fontSize: 20 },
  label: { fontSize: 14, fontWeight: '700' },
  timerTag: {
    fontSize: 11, color: '#FF7043', backgroundColor: '#FFF3E0',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  action: { fontSize: 22, fontWeight: '600', color: '#1A1A1A', lineHeight: 32 },
  note: { marginTop: 8, fontSize: 14, color: '#666', fontStyle: 'italic' },
  tools: { marginTop: 4, fontSize: 13, color: '#888' },
  parallelContainer: { marginBottom: 12 },
  parallelLabel: { fontSize: 12, color: '#999', marginBottom: 4, marginLeft: 4 },
  parallelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12,
    backgroundColor: '#FAFAFA',
  },
  parallelEmoji: { fontSize: 16 },
  parallelAction: { fontSize: 15, color: '#444', flex: 1 },
});
```

---

### Task 5: 创建 CookingModeScreen 主屏幕

**Files:**
- Create: `frontend/src/screens/recipe/CookingModeScreen.tsx`

整合所有组件，实现完整的烹饪模式界面。

**Step 1: 检查 expo-keep-awake 是否可用**

```bash
cd D:\claude-code\qinzicanhe\frontend && grep "expo-keep-awake" package.json
```
Expo SDK 通常自带，若无则：`npx expo install expo-keep-awake`

**Step 2: 创建 `frontend/src/screens/recipe/CookingModeScreen.tsx`**

```typescript
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RecipeStackParamList } from '../../types';
import { useTimeline } from '../../hooks/useTimeline';
import { useCookingSession } from '../../hooks/useCookingSession';
import { StepCard } from '../../components/cooking/StepCard';
import { StepTimer } from '../../components/cooking/StepTimer';
import * as KeepAwake from 'expo-keep-awake';

type Props = NativeStackScreenProps<RecipeStackParamList, 'CookingMode'>;

export function CookingModeScreen({ route, navigation }: Props) {
  const { recipeId, babyAgeMonths } = route.params;
  const { data: timeline, isLoading } = useTimeline(recipeId, babyAgeMonths, true);

  const {
    currentIndex, currentPhase, totalPhases, completedPhases,
    isFirst, isLast, progress, voiceEnabled,
    sessionLoaded, goNext, goPrev, markComplete, toggleVoice, clearSession,
  } = useCookingSession(timeline);

  // 屏幕常亮
  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync();
    return () => { KeepAwake.deactivateKeepAwake(); };
  }, []);

  // 找到当前步骤的并行步骤
  const parallelPhase = currentPhase?.parallel_with != null
    ? timeline?.phases[currentPhase.parallel_with]
    : undefined;

  const handleExit = () => {
    Alert.alert('退出烹饪模式', '进度已自动保存，下次进入可继续', [
      { text: '继续烹饪', style: 'cancel' },
      { text: '退出', onPress: () => navigation.goBack() },
    ]);
  };

  const handleFinish = async () => {
    await clearSession();
    Alert.alert('🎉 烹饪完成！', '大人和宝宝的饭都做好了', [
      { text: '太棒了', onPress: () => navigation.goBack() },
    ]);
  };

  if (isLoading || !sessionLoaded) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>正在准备烹饪步骤...</Text>
      </SafeAreaView>
    );
  }

  if (!timeline || !currentPhase) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>暂无同步烹饪时间线</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.exitBtn}>✕ 退出</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>同步烹饪</Text>
        <TouchableOpacity onPress={toggleVoice} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.voiceBtn}>{voiceEnabled ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
      </View>

      {/* 进度 */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>步骤 {currentIndex + 1} / {totalPhases}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 步骤卡片 */}
        <StepCard
          phase={currentPhase}
          parallelPhase={parallelPhase}
          isCurrent={true}
        />

        {/* 计时器（仅当步骤有时长时显示） */}
        {currentPhase.duration > 0 && (
          <StepTimer
            stepId={`step_${currentIndex}`}
            stepName={currentPhase.action}
            durationMinutes={currentPhase.duration}
            autoStart={false}
          />
        )}
      </ScrollView>

      {/* 底部导航 */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={isFirst}
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
        >
          <Text style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}>← 上一步</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isLast ? handleFinish : markComplete}
          style={styles.completeBtn}
        >
          <Text style={styles.completeBtnText}>
            {isLast ? '🎉 完成烹饪' : '完成此步 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { fontSize: 16, color: '#666' },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { color: '#FF7043', fontSize: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE',
  },
  exitBtn: { fontSize: 15, color: '#666' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  voiceBtn: { fontSize: 22 },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 10 },
  progressText: { fontSize: 13, color: '#999', marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF7043', borderRadius: 2 },
  content: { flex: 1, paddingTop: 16 },
  footer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#EEE', gap: 12,
  },
  navBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD', alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 15, color: '#444', fontWeight: '600' },
  navBtnTextDisabled: { color: '#CCC' },
  completeBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#FF7043', alignItems: 'center',
  },
  completeBtnText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
});
```

**Step 3: 验证类型检查**

```bash
cd D:\claude-code\qinzicanhe\frontend && npx tsc --noEmit 2>&1 | head -30
```

---

### Task 6: 在 RecipeDetailScreen 添加"开始烹饪"入口

**Files:**
- Modify: `frontend/src/screens/recipe/RecipeDetailScreen.tsx`

**Step 1: 找到底部按钮区域，在"加入购物清单"按钮旁边添加"开始烹饪"按钮**

在 `RecipeDetailScreen.tsx` 中找到 `activeTab === 'timeline'` 相关的渲染区域，添加：

```typescript
// 在时间线 Tab 的底部或详情页底部添加入口
{activeTab === 'timeline' && timelineData && (
  <TouchableOpacity
    style={styles.cookingModeBtn}
    onPress={() => navigation.navigate('CookingMode', {
      recipeId,
      babyAgeMonths: babyAgeMonths ?? 12,
    })}
  >
    <Text style={styles.cookingModeBtnText}>🍳 开始烹饪（同步模式）</Text>
  </TouchableOpacity>
)}
```

同时在 `styles` 中添加：
```typescript
cookingModeBtn: {
  margin: 16, padding: 16, backgroundColor: '#FF7043',
  borderRadius: 14, alignItems: 'center',
},
cookingModeBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
```

**Step 2: 确认导航类型正确**

`RecipeDetailScreen` 的 `navigation` prop 类型需要能导航到 `CookingMode`。检查该屏幕用的是哪个 Stack 的类型，确保 `CookingMode` 已在对应的 ParamList 中。

**Step 3: 验证应用能正常启动**

```bash
# 查看后端是否运行（应已在后台运行）
curl http://localhost:3000/health
```

---

## Phase B：语音播报 + 手势 + 主动提醒

### Task 7: 添加语音播报

**Files:**
- Modify: `frontend/src/hooks/useCookingSession.ts`
- Modify: `frontend/src/screens/recipe/CookingModeScreen.tsx`

**Step 1: 确认 expo-speech 可用**

```bash
cd D:\claude-code\qinzicanhe\frontend && grep "expo-speech" package.json
```
若无：`npx expo install expo-speech`

**Step 2: 在 useCookingSession.ts 中集成语音**

在 hook 中添加：
```typescript
import * as Speech from 'expo-speech';

// 在 goNext 和 markComplete 后，当 voiceEnabled 时自动朗读新步骤
const speakPhase = useCallback((phase: TimelinePhase | undefined, enabled: boolean) => {
  if (!enabled || !phase) return;
  Speech.stop();
  Speech.speak(phase.action, {
    language: 'zh-CN',
    rate: 0.85,
    pitch: 1.0,
  });
}, []);

// 当前步骤变化时朗读
useEffect(() => {
  if (sessionLoaded && currentPhase && voiceEnabled) {
    speakPhase(currentPhase, voiceEnabled);
  }
  return () => { Speech.stop(); };
}, [currentIndex, sessionLoaded]);

// 退出时停止语音
// 在 clearSession 中 Speech.stop()
```

**Step 3: 验证语音（Web 端 expo-speech 可能无声音，在真机上验证）**

---

### Task 8: 添加手势支持（左右滑动）

**Files:**
- Modify: `frontend/src/screens/recipe/CookingModeScreen.tsx`

**Step 1: 确认 react-native-gesture-handler 可用（项目已有）**

```bash
grep "react-native-gesture-handler" D:\claude-code\qinzicanhe\frontend\package.json
```

**Step 2: 在 CookingModeScreen 的 ScrollView 外层包裹手势检测**

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

// 在组件内定义手势
const swipeGesture = Gesture.Pan()
  .onEnd((event) => {
    if (Math.abs(event.translationX) > 80 && Math.abs(event.translationY) < 50) {
      if (event.translationX < 0 && !isLast) {
        // 向左滑 = 下一步
        runOnJS(markComplete)();
      } else if (event.translationX > 0 && !isFirst) {
        // 向右滑 = 上一步
        runOnJS(goPrev)();
      }
    }
  });

// 包裹主 View
<GestureDetector gesture={swipeGesture}>
  <View style={styles.container}>
    {/* ... 其他内容 */}
  </View>
</GestureDetector>
```

**Step 3: 双击重新朗读**

```typescript
const doubleTapGesture = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd(() => {
    if (currentPhase) runOnJS(speakCurrent)();
  });
```

---

### Task 9: 添加主动提醒 Modal

**Files:**
- Create: `frontend/src/components/cooking/CrossLineAlert.tsx`
- Modify: `frontend/src/screens/recipe/CookingModeScreen.tsx`

**Step 1: 创建 `frontend/src/components/cooking/CrossLineAlert.tsx`**

```typescript
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CrossLineAlertProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export function CrossLineAlert({ visible, message, onDismiss }: CrossLineAlertProps) {
  React.useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>该照顾宝宝的菜了！</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onDismiss}>
            <Text style={styles.btnText}>好的，去看看</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, alignItems: 'center',
  },
  icon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  message: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { backgroundColor: '#FF7043', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
```

**Step 2: 在 CookingModeScreen 中集成提醒逻辑**

当当前步骤完成、且下一步目标对象发生切换时（adult→baby 或 baby→adult），触发提醒：
```typescript
const [alertVisible, setAlertVisible] = useState(false);
const [alertMessage, setAlertMessage] = useState('');

// 在 markComplete 后检查是否需要提醒
const handleMarkComplete = () => {
  const nextPhase = phases[currentIndex + 1];
  if (nextPhase?.target === 'baby' && currentPhase?.target !== 'baby') {
    setAlertMessage('宝宝那锅需要你照顾了，记得检查火候');
    setAlertVisible(true);
  }
  markComplete();
};
```

---

## Phase C：月龄精细化

### Task 10: 创建月龄规则配置表

**Files:**
- Create: `frontend/src/constants/babyAgeRules.ts`

**Step 1: 创建 `frontend/src/constants/babyAgeRules.ts`**

```typescript
// 质地建议按月龄
export type TextureLevel = 'puree' | 'mash' | 'minced' | 'small_chunks' | 'normal';

export function getTextureForAge(months: number): TextureLevel {
  if (months < 8)  return 'puree';       // 泥状
  if (months < 10) return 'mash';        // 细泥/糊状
  if (months < 12) return 'minced';      // 细碎
  if (months < 18) return 'small_chunks'; // 小块
  return 'normal';
}

export const TEXTURE_LABELS: Record<TextureLevel, string> = {
  puree:        '泥状（细腻光滑）',
  mash:         '糊状（可有细小颗粒）',
  minced:       '细碎（约0.3cm小粒）',
  small_chunks: '小块（约1cm，练习咀嚼）',
  normal:       '正常大小',
};

// 高风险过敏食材
export interface AllergyRule {
  name: string;
  minAge: number;  // 建议引入最小月龄
  risk: 'high' | 'medium';
  note: string;
}

export const ALLERGY_RULES: AllergyRule[] = [
  { name: '蜂蜜', minAge: 12, risk: 'high', note: '12月以下含有肉毒杆菌芽孢，严禁食用' },
  { name: '整颗坚果', minAge: 36, risk: 'high', note: '36月以下有噎呛风险，需磨碎' },
  { name: '花生', minAge: 6, risk: 'high', note: '建议首次单独少量尝试，观察24小时' },
  { name: '虾', minAge: 8, risk: 'high', note: '建议首次单独少量尝试，观察反应' },
  { name: '蟹', minAge: 12, risk: 'high', note: '建议12月后引入，单独尝试' },
  { name: '蛋白', minAge: 8, risk: 'medium', note: '蛋黄可6月引入，蛋白建议8月后' },
  { name: '牛奶', minAge: 12, risk: 'medium', note: '作为饮品建议12月后，烹饪用少量可早些' },
];

export function checkAllergyRisk(ingredientName: string, babyAgeMonths: number): AllergyRule | null {
  const rule = ALLERGY_RULES.find(r =>
    ingredientName.includes(r.name) || r.name.includes(ingredientName)
  );
  if (!rule) return null;
  if (babyAgeMonths < rule.minAge) return rule;
  return null; // 月龄达标，无风险
}

// 月龄适配提示
export function getAgeAdaptation(months: number): string {
  if (months < 8)  return `${months}月宝宝：食物需完全打成细腻泥状，不可有颗粒`;
  if (months < 10) return `${months}月宝宝：可以有极细小颗粒，帮助感受食物质地`;
  if (months < 12) return `${months}月宝宝：细碎状，大约0.3cm小粒，练习咀嚼`;
  if (months < 18) return `${months}月宝宝：约1cm小块，咀嚼能力增强`;
  if (months < 24) return `${months}月宝宝：接近正常大小，和大人一起吃`;
  return `${months}月宝宝：可以吃接近成人的食物`;
}
```

---

### Task 11: 创建 BabyStepCard 组件

**Files:**
- Create: `frontend/src/components/cooking/BabyStepCard.tsx`

在烹饪模式中，当步骤类型为 `baby` 时，替换普通 StepCard 展示含月龄适配说明的增强版卡片。

**Step 1: 创建 `frontend/src/components/cooking/BabyStepCard.tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { TimelinePhase } from '../../types';
import {
  getTextureForAge, TEXTURE_LABELS, getAgeAdaptation, checkAllergyRisk
} from '../../constants/babyAgeRules';

interface BabyStepCardProps {
  phase: TimelinePhase;
  babyAgeMonths: number;
  ingredients?: string[];  // 本步骤涉及的食材名（用于过敏检测）
}

export function BabyStepCard({ phase, babyAgeMonths, ingredients = [] }: BabyStepCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [allergyDismissed, setAllergyDismissed] = useState<string[]>([]);

  const textureLevel = getTextureForAge(babyAgeMonths);
  const textureLabel = TEXTURE_LABELS[textureLevel];
  const ageAdaptation = getAgeAdaptation(babyAgeMonths);

  // 检测过敏风险食材（未被用户忽略的）
  const allergyRisks = ingredients
    .map(name => checkAllergyRisk(name, babyAgeMonths))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter(r => !allergyDismissed.includes(r.name));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>🍼</Text>
        <Text style={styles.label}>宝宝专属</Text>
        <Text style={styles.ageTag}>{babyAgeMonths}月</Text>
      </View>

      <Text style={styles.action}>{phase.action}</Text>

      {/* 月龄适配提示 */}
      <View style={styles.adaptRow}>
        <Text style={styles.adaptIcon}>⚠️</Text>
        <Text style={styles.adaptText}>{ageAdaptation}</Text>
      </View>

      <View style={styles.textureRow}>
        <Text style={styles.textureLabel}>质地建议：</Text>
        <Text style={styles.textureValue}>{textureLabel}</Text>
      </View>

      <TouchableOpacity onPress={() => setShowWhy(true)} style={styles.whyBtn}>
        <Text style={styles.whyText}>📖 为什么这样做？</Text>
      </TouchableOpacity>

      {/* 过敏风险弹窗 */}
      {allergyRisks.map(risk => (
        <View key={risk.name} style={styles.allergyCard}>
          <Text style={styles.allergyTitle}>🥜 {risk.name} — 过敏高风险食材</Text>
          <Text style={styles.allergyNote}>{risk.note}</Text>
          <TouchableOpacity
            onPress={() => setAllergyDismissed(prev => [...prev, risk.name])}
            style={styles.allergyBtn}
          >
            <Text style={styles.allergyBtnText}>已了解，继续</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* "为什么"Modal */}
      <Modal visible={showWhy} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>📖 科学依据</Text>
            <ScrollView>
              <Text style={styles.modalText}>{ageAdaptation}</Text>
              <Text style={styles.modalText}>
                {babyAgeMonths}月龄宝宝的咀嚼肌和吞咽协调能力正在发育，
                食物质地过硬或过大容易造成噎呛。世界卫生组织建议循序渐进地
                调整辅食质地，让宝宝逐步学习咀嚼。
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowWhy(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>明白了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FCE4EC', borderRadius: 16, borderWidth: 2,
    borderColor: '#E91E63', padding: 20, marginHorizontal: 16, marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  emoji: { fontSize: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#E91E63' },
  ageTag: {
    fontSize: 11, color: '#FFF', backgroundColor: '#E91E63',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  action: { fontSize: 20, fontWeight: '600', color: '#1A1A1A', lineHeight: 30, marginBottom: 10 },
  adaptRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  adaptIcon: { fontSize: 14 },
  adaptText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
  textureRow: { flexDirection: 'row', marginBottom: 10 },
  textureLabel: { fontSize: 13, color: '#888' },
  textureValue: { fontSize: 13, color: '#E91E63', fontWeight: '600' },
  whyBtn: { alignSelf: 'flex-start' },
  whyText: { fontSize: 13, color: '#1976D2' },
  allergyCard: {
    marginTop: 10, backgroundColor: '#FFF3E0', borderRadius: 10,
    borderWidth: 1, borderColor: '#FF9800', padding: 12,
  },
  allergyTitle: { fontSize: 14, fontWeight: '700', color: '#E65100', marginBottom: 4 },
  allergyNote: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 8 },
  allergyBtn: {
    backgroundColor: '#FF9800', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  allergyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalText: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 10 },
  modalBtn: {
    marginTop: 16, backgroundColor: '#E91E63', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
```

**Step 2: 在 CookingModeScreen 中，当 currentPhase.type === 'baby' 时使用 BabyStepCard 替代 StepCard**

```typescript
// 在 CookingModeScreen 的内容区域替换 StepCard 渲染逻辑：
{currentPhase.type === 'baby' ? (
  <BabyStepCard
    phase={currentPhase}
    babyAgeMonths={babyAgeMonths}
    ingredients={[]} // 可从 timeline 中提取当前步骤食材
  />
) : (
  <StepCard
    phase={currentPhase}
    parallelPhase={parallelPhase}
    isCurrent={true}
  />
)}
```

---

## 验证步骤（每个 Phase 完成后）

**Phase A 验证：**
```
1. 前往菜谱详情页 → 点击"同步烹饪" Tab → 看到"开始烹饪"按钮
2. 点击"开始烹饪" → 进入全屏烹饪模式
3. 步骤卡片正确显示（大字、颜色区分、并行步骤）
4. 倒计时可以开始/暂停/重置
5. "完成此步"前进到下一步，进度条更新
6. 退出后重新进入，停留在上次的步骤（进度恢复）
```

**Phase B 验证：**
```
1. 🔊 图标可切换语音开关
2. 进入新步骤时自动朗读（真机验证）
3. 左右滑动切换步骤
4. 大人→宝宝步骤切换时弹出提醒 Modal
```

**Phase C 验证：**
```
1. 宝宝步骤卡片显示月龄适配说明
2. 点击"为什么"展开科学依据弹窗
3. 含过敏食材的步骤显示风险提示卡片
4. 点击"已了解"后提示消失
```

---

## 注意事项

- `expo-keep-awake` / `expo-speech` / `expo-haptics` 均为 Expo SDK 标准模块，通常无需单独安装，如缺少用 `npx expo install <module>` 安装
- Web 端语音播报和震动可能不可用，以真机/模拟器为准
- `GestureDetector` 需要整个 App 被 `GestureHandlerRootView` 包裹（项目应已配置）
- `runOnJS` 从 `react-native-reanimated` 导入，用于在手势回调中调用 JS 函数
