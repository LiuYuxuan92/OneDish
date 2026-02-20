import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
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

  const phases: TimelinePhase[] = timeline?.phases ?? [];
  const totalPhases = phases.length;
  const currentPhase: TimelinePhase | undefined = phases[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = totalPhases > 0 && currentIndex === totalPhases - 1;
  const progress = totalPhases > 0 ? (currentIndex + 1) / totalPhases : 0;

  const saveSession = useCallback(async (index: number, completed: number[]) => {
    if (!timeline) return;
    try {
      const session: CookingSession = {
        recipeId: timeline.recipe_id,
        babyAgeMonths: timeline.baby_age_months,
        currentPhaseIndex: index,
        completedPhases: completed,
        startedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        SESSION_KEY(timeline.recipe_id),
        JSON.stringify(session),
      );
    } catch {
      // silently ignore errors
    }
  }, [timeline]);

  const clearSession = useCallback(async () => {
    if (!timeline) return;
    Speech.stop();
    try {
      await AsyncStorage.removeItem(SESSION_KEY(timeline.recipe_id));
    } catch {
      // silently ignore errors
    }
  }, [timeline]);

  // Restore session from AsyncStorage when timeline loads
  useEffect(() => {
    if (!timeline) return;

    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY(timeline.recipe_id));
        if (raw) {
          const session: CookingSession = JSON.parse(raw);
          if (
            session.recipeId === timeline.recipe_id &&
            session.babyAgeMonths === timeline.baby_age_months
          ) {
            const safeIndex = Math.min(
              Math.max(0, session.currentPhaseIndex),
              timeline.phases.length - 1,
            );
            setCurrentIndex(safeIndex);
            setCompletedPhases(session.completedPhases ?? []);
          }
        }
      } catch {
        // silently ignore errors
      } finally {
        setSessionLoaded(true);
      }
    };

    restore();
  }, [timeline]);

  const goNext = useCallback(() => {
    if (!timeline || currentIndex >= totalPhases - 1) return;
    const nextIndex = currentIndex + 1;
    const newCompleted = completedPhases.includes(currentIndex)
      ? completedPhases
      : [...completedPhases, currentIndex];
    setCurrentIndex(nextIndex);
    setCompletedPhases(newCompleted);
    saveSession(nextIndex, newCompleted);
  }, [timeline, currentIndex, totalPhases, completedPhases, saveSession]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    saveSession(prevIndex, completedPhases);
  }, [currentIndex, completedPhases, saveSession]);

  const markComplete = useCallback(() => {
    const newCompleted = completedPhases.includes(currentIndex)
      ? completedPhases
      : [...completedPhases, currentIndex];
    setCompletedPhases(newCompleted);

    if (!isLast) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveSession(nextIndex, newCompleted);
    } else {
      saveSession(currentIndex, newCompleted);
    }
  }, [currentIndex, completedPhases, isLast, saveSession]);

  const speak = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'zh-CN', rate: 0.85, pitch: 1.0 });
  }, []);

  // Auto-speak when currentIndex changes and session is ready
  useEffect(() => {
    if (sessionLoaded && voiceEnabled && currentPhase?.action) {
      speak(currentPhase.action);
    }
    return () => {
      Speech.stop();
    };
  }, [currentIndex, sessionLoaded, voiceEnabled, currentPhase, speak]);

  const speakCurrent = useCallback(() => {
    if (voiceEnabled && currentPhase) {
      speak(currentPhase.action);
    }
  }, [voiceEnabled, currentPhase, speak]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev);
  }, []);

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
    speakCurrent,
  };
}
