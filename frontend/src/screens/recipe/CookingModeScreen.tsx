// @ts-nocheck
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as KeepAwake from 'expo-keep-awake';
import { RecipeStackParamList } from '../../types';
import { useTimeline } from '../../hooks/useTimeline';
import { useCookingSession } from '../../hooks/useCookingSession';
import StepCard from '../../components/cooking/StepCard';
import StepTimer from '../../components/cooking/StepTimer';
import { CrossLineAlert } from '../../components/cooking/CrossLineAlert';
import { BabyStepCard } from '../../components/cooking/BabyStepCard';
import { SyncCookingTimeline } from './SyncCookingTimeline';

type Props = NativeStackScreenProps<RecipeStackParamList, 'CookingMode'>;

// 视图模式类型
type ViewMode = 'step' | 'timeline';

export function CookingModeScreen({ route, navigation }: Props) {
  const { recipeId, babyAgeMonths } = route.params;

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('step');

  const { data: timeline, isLoading } = useTimeline(recipeId, babyAgeMonths, true);

  const {
    currentIndex,
    currentPhase,
    totalPhases,
    isFirst,
    isLast,
    progress,
    voiceEnabled,
    sessionLoaded,
    goNext,
    goPrev,
    clearSession,
    toggleVoice,
    speakCurrent,
  } = useCookingSession(timeline);

  // Keep screen awake while cooking
  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync();
    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, []);

  // 切换视图模式：单步视图 <-> 时间线视图
  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'step' ? 'timeline' : 'step'));
  }, []);

  const handleExit = useCallback(() => {
    Alert.alert(
      '退出烹饪',
      '进度已自动保存，下次进入可继续',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [navigation]);

  const handleFinish = useCallback(async () => {
    await clearSession();
    Alert.alert(
      '🎉 烹饪完成！',
      '大人和宝宝的饭都做好了，烹饪记录已清除',
      [{ text: '太棒了', onPress: () => navigation.goBack() }]
    );
  }, [clearSession, navigation]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleFinish();
    } else {
      goNext();
    }
  }, [isLast, goNext, handleFinish]);

  const handleMarkComplete = () => {
    const phases = timeline?.phases ?? [];
    const nextPhase = phases[currentIndex + 1];
    if (nextPhase?.target === 'baby' && currentPhase?.target !== 'baby') {
      setAlertMessage('宝宝那锅需要你照顾了，记得检查火候和熟度');
      setAlertVisible(true);
    }
    handleNext();
  };

  // Pan gesture: swipe left = next step, swipe right = previous step
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 80 && Math.abs(event.translationY) < 60) {
        if (event.translationX < 0) {
          handleMarkComplete();
        } else {
          goPrev();
        }
      }
    });

  // Double-tap gesture: re-read current step aloud
  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd(() => {
      speakCurrent();
    });

  const composedGesture = Gesture.Race(panGesture, doubleTapGesture);

  // Loading / session not yet restored
  if (isLoading || !sessionLoaded) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7043" style={{ marginBottom: 12 }} />
        <Text style={styles.loadingText}>正在准备烹饪步骤...</Text>
      </SafeAreaView>
    );
  }

  // No timeline or no current phase
  if (!timeline || !currentPhase) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>暂无同步烹饪时间线</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const parallelPhase =
    currentPhase.parallel_with != null
      ? timeline.phases[currentPhase.parallel_with]
      : undefined;

  // 处理时间线视图中的步骤点击
  const handleTimelinePhasePress = useCallback(
    (index: number) => {
      // 跳转到对应步骤
      if (index >= 0 && index < timeline.phases.length) {
        // 使用 session 的 goToStep 功能（如果存在）
        for (let i = 0; i < index; i++) {
          goNext();
        }
      }
    },
    [timeline, goNext]
  );

  // 处理时间线视图中的步骤完成
  const handleTimelinePhaseComplete = useCallback(
    (index: number) => {
      const phases = timeline.phases ?? [];
      const nextPhase = phases[index + 1];
      if (nextPhase?.target === 'baby' && phases[index]?.target !== 'baby') {
        setAlertMessage('宝宝那锅需要你照顾了，记得检查火候和熟度');
        setAlertVisible(true);
      }
      // 前进到下一步
      if (index < totalPhases - 1) {
        goNext();
      } else {
        handleFinish();
      }
    },
    [timeline, totalPhases, goNext, handleFinish]
  );

  // 渲染单步视图
  const renderStepView = () => (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.flex1}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleExit} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>← 退出</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>同步烹饪</Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={handleToggleViewMode} style={styles.viewModeButton}>
              <Text style={styles.viewModeButtonText}>📋 Timeline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleVoice} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress area */}
        <View style={styles.progressArea}>
          <Text style={styles.progressLabel}>
            步骤 {currentIndex + 1} / {totalPhases}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
          </View>
        </View>

        {/* Content area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentPhase.type === 'baby' ? (
            <BabyStepCard
              phase={currentPhase}
              babyAgeMonths={babyAgeMonths}
              ingredients={[]}
            />
          ) : (
            <StepCard
              phase={currentPhase}
              parallelPhase={parallelPhase}
              isCurrent={true}
            />
          )}

          {currentPhase.duration > 0 && (
            <View style={styles.timerContainer}>
              <StepTimer
                stepId={`step_${currentIndex}`}
                stepName={currentPhase.action}
                durationMinutes={currentPhase.duration}
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, isFirst && styles.navButtonDisabled]}
            onPress={goPrev}
            disabled={isFirst}
            activeOpacity={0.7}
          >
            <Text style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
              ← 上一步
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleMarkComplete}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>
              {isLast ? '🎉 完成烹饪' : '完成此步 →'}
            </Text>
          </TouchableOpacity>
        </View>
        <CrossLineAlert
          visible={alertVisible}
          message={alertMessage}
          onDismiss={() => setAlertVisible(false)}
        />
      </View>
    </GestureDetector>
  );

  // 渲染时间线视图
  const renderTimelineView = () => (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleExit} style={styles.topBarButton}>
          <Text style={styles.topBarButtonText}>← 退出</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>同步烹饪</Text>
        <TouchableOpacity onPress={handleToggleViewMode} style={styles.viewModeButton}>
          <Text style={styles.viewModeButtonText}>📝 步骤</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline content */}
      <SyncCookingTimeline
        timeline={timeline}
        babyAgeMonths={babyAgeMonths}
        currentPhaseIndex={currentIndex}
        onPhasePress={handleTimelinePhasePress}
        onPhaseComplete={handleTimelinePhaseComplete}
      />

      <CrossLineAlert
        visible={alertVisible}
        message={alertMessage}
        onDismiss={() => setAlertVisible(false)}
      />
    </View>
  );

  return viewMode === 'timeline' ? renderTimelineView() : renderStepView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topBarButton: {
    padding: 4,
    minWidth: 60,
  },
  topBarButtonText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '500',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModeButton: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  viewModeButtonText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
  },
  // Progress
  progressArea: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 6,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 3,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  timerContainer: {
    marginTop: 12,
  },
  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
  },
  navButtonTextDisabled: {
    color: '#9E9E9E',
  },
  nextButton: {
    backgroundColor: '#FF9800',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
