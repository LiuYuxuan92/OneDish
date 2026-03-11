// @ts-nocheck
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

type Props = NativeStackScreenProps<RecipeStackParamList, 'CookingMode'>;
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

  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync();
    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'step' ? 'timeline' : 'step'));
  }, []);

  const handleExit = useCallback(() => {
    Alert.alert('退出烹饪', '进度已自动保存，下次进入可继续', [
      { text: '取消', style: 'cancel' },
      { text: '确认', onPress: () => navigation.goBack() },
    ]);
  }, [navigation]);

  const handleFinish = useCallback(async () => {
    await clearSession();
    Alert.alert('🎉 烹饪完成！', '大人和宝宝的饭都做好了，烹饪记录已清除', [{ text: '太棒了', onPress: () => navigation.goBack() }]);
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

  const doubleTapGesture = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd(() => {
      speakCurrent();
    });

  const composedGesture = Gesture.Race(panGesture, doubleTapGesture);

  if (isLoading || !sessionLoaded) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={Colors.primary.main} style={{ marginBottom: 12 }} />
        <Text style={styles.loadingText}>正在准备烹饪步骤...</Text>
      </SafeAreaView>
    );
  }

  if (!timeline || !currentPhase) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Text style={styles.emptyText}>暂无同步烹饪时间线</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const parallelPhase = currentPhase.parallel_with != null ? timeline.phases[currentPhase.parallel_with] : undefined;

  const handleTimelinePhasePress = useCallback(
    (index: number) => {
      if (index >= 0 && index < timeline.phases.length) {
        for (let i = 0; i < index; i++) {
          goNext();
        }
      }
    },
    [timeline, goNext]
  );

  const handleTimelinePhaseComplete = useCallback(
    (index: number) => {
      const phases = timeline.phases ?? [];
      const nextPhase = phases[index + 1];
      if (nextPhase?.target === 'baby' && phases[index]?.target !== 'baby') {
        setAlertMessage('宝宝那锅需要你照顾了，记得检查火候和熟度');
        setAlertVisible(true);
      }
      if (index < totalPhases - 1) {
        goNext();
      } else {
        handleFinish();
      }
    },
    [timeline, totalPhases, goNext, handleFinish]
  );

  const renderStepView = () => (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.flex1}>
        <View style={styles.heroShell}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleExit} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>← 退出</Text>
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>同步烹饪</Text>
            <View style={styles.topBarRight}>
              <TouchableOpacity onPress={handleToggleViewMode} style={styles.viewModeButton}>
                <Text style={styles.viewModeButtonText}>📋 时间线</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleVoice} style={styles.topBarButton}>
                <Text style={styles.topBarButtonText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.progressArea}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>步骤 {currentIndex + 1} / {totalPhases}</Text>
              <Text style={styles.progressHint}>{isLast ? '最后一步' : '左滑进入下一步'}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {currentPhase.type === 'baby' ? (
            <BabyStepCard phase={currentPhase} babyAgeMonths={babyAgeMonths} ingredients={[]} />
          ) : (
            <StepCard phase={currentPhase} parallelPhase={parallelPhase} isCurrent={true} />
          )}

          {currentPhase.duration > 0 ? (
            <View style={styles.timerContainer}>
              <StepTimer stepId={`step_${currentIndex}`} stepName={currentPhase.action} durationMinutes={currentPhase.duration} />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navButton, styles.prevButton, isFirst && styles.navButtonDisabled]} onPress={goPrev} disabled={isFirst} activeOpacity={0.7}>
            <Text style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>← 上一步</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleMarkComplete} activeOpacity={0.7}>
            <Text style={styles.nextButtonText}>{isLast ? '🎉 完成烹饪' : '完成此步 →'}</Text>
          </TouchableOpacity>
        </View>

        <CrossLineAlert visible={alertVisible} message={alertMessage} onDismiss={() => setAlertVisible(false)} />
      </View>
    </GestureDetector>
  );

  const renderTimelineView = () => (
    <View style={styles.container}>
      <View style={styles.heroShell}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleExit} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>← 退出</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>同步烹饪</Text>
          <TouchableOpacity onPress={handleToggleViewMode} style={styles.viewModeButton}>
            <Text style={styles.viewModeButtonText}>📝 步骤</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timelineHeroInfo}>
          <Text style={styles.timelineHeroTitle}>完整时间线</Text>
          <Text style={styles.timelineHeroText}>按全局顺序查看大人版和宝宝版分叉点，适合开火前整体过一遍。</Text>
        </View>
      </View>

      <SyncCookingTimeline
        timeline={timeline}
        babyAgeMonths={babyAgeMonths}
        currentPhaseIndex={currentIndex}
        onPhasePress={handleTimelinePhasePress}
        onPhaseComplete={handleTimelinePhaseComplete}
      />

      <CrossLineAlert visible={alertVisible} message={alertMessage} onDismiss={() => setAlertVisible(false)} />
    </View>
  );

  return viewMode === 'timeline' ? renderTimelineView() : renderStepView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 24,
  },
  heroShell: {
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  backButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  topBarButton: {
    padding: 4,
    minWidth: 60,
  },
  topBarButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
  },
  topBarTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModeButton: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  viewModeButtonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary.dark,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  progressHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.main,
    borderRadius: 3,
  },
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
  bottomNav: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  navButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
  nextButton: {
    backgroundColor: Colors.primary.main,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  timelineHeroInfo: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  timelineHeroTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  timelineHeroText: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
