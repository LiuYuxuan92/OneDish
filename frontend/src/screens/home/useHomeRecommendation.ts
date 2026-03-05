import { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAllRecipes, useDailyRecipe } from '../../hooks/useRecipes';
import { useBabyStageByAge } from '../../hooks/useBabyStages';
import { useFavorites } from '../../hooks/useFavorites';
import { useUserInfo } from '../../hooks/useUsers';
import { buildPreferredCategories, getSwapCandidate, normalizeCategories } from './swapStrategy';
import { getSwapWeightsConfig } from './swapWeightsConfig';
import { buildRecommendationReasons } from './recommendationInsights';
import type { Recipe, BabyStageGuide } from '../../types';

const SWAP_DEBOUNCE_MS = 1000;
const SWAP_PREFERENCE_KEY = 'home:last_preferred_category';
const SWAP_TIME_WINDOW_MINUTES = 10;

export interface RecommendationReasons {
  key: string;
  strength: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface SwapCandidateParams {
  currentRecipe: Recipe | null;
  allRecipesItems: any[] | undefined;
  preferredCategories: string[];
  currentStage: BabyStageGuide | undefined;
  timeWindowMinutes?: number;
  weights: any;
}

export interface UseHomeRecommendationReturn {
  // State
  currentRecipe: Recipe | null;
  swapping: boolean;
  preferredCategories: string[];
  swapScoringWeights: any;
  swapExperimentBucket: 'A' | 'B';
  swapConfigSource: 'default' | 'remote' | 'local';
  recommendationReasons: RecommendationReasons[];
  isLoading: boolean;
  error: any;
  currentStage: BabyStageGuide | undefined;
  recipe: Recipe | null;
  
  // Actions
  onSwapRecipe: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function useHomeRecommendation(): UseHomeRecommendationReturn {
  // Data hooks
  const { data: dailyData, isLoading, error, refetch } = useDailyRecipe({ type: 'dinner' });
  const { data: allRecipesData } = useAllRecipes();
  const { data: favoritesData } = useFavorites({ page: 1, limit: 20 });
  const { data: userInfo } = useUserInfo();
  const { data: currentStage } = useBabyStageByAge(9);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [localPreferredCategories, setLocalPreferredCategories] = useState<string[]>([]);
  const [swapScoringWeights, setSwapScoringWeights] = useState<any>(null);
  const [swapExperimentBucket, setSwapExperimentBucket] = useState<'A' | 'B'>('A');
  const [swapConfigSource, setSwapConfigSource] = useState<'default' | 'remote' | 'local'>('default');

  // Refs
  const lastSwapAtRef = useRef(0);
  const pendingSwapSuccessRef = useRef<{
    prevRecipeId: string | null;
    nextRecipeId: string;
    clickedAtIso: string;
  } | null>(null);
  const lastRecommendationSourceRef = useRef<'daily' | 'swap'>('daily');
  const lastQualityTrackedRecipeIdRef = useRef<string | null>(null);

  // Sync currentRecipe from dailyData
  useEffect(() => {
    if (dailyData?.recipe) {
      lastRecommendationSourceRef.current = 'daily';
    }
    setCurrentRecipe(dailyData?.recipe || null);
  }, [dailyData?.recipe?.id]);

  // Load local preference from storage
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(SWAP_PREFERENCE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => String(item).trim())
            .filter(Boolean)
            .slice(0, 3);
          setLocalPreferredCategories(normalized);
        }
      } catch (err) {
        console.error('读取换菜偏好失败:', err);
      }
    };
    loadPreference();
  }, []);

  // Load swap weights config
  useEffect(() => {
    let mounted = true;

    const loadSwapWeightsConfig = async () => {
      try {
        const config = await getSwapWeightsConfig({
          userId: userInfo?.id || null,
        });
        if (!mounted) {
          return;
        }
        setSwapScoringWeights(config.weights);
        setSwapExperimentBucket(config.bucket);
        setSwapConfigSource(config.source);
      } catch (err) {
        console.error('读取换菜权重配置失败:', err);
      }
    };

    loadSwapWeightsConfig();
    return () => {
      mounted = false;
    };
  }, [userInfo?.id]);

  // Build preferred categories from favorites or local memory
  useEffect(() => {
    const nextPreferred = buildPreferredCategories({
      favoritesItems: favoritesData?.items,
      allRecipes: allRecipesData?.items,
      localMemory: localPreferredCategories,
      limit: 3,
    });

    if (nextPreferred.join('|') !== preferredCategories.join('|')) {
      setPreferredCategories(nextPreferred);
    }
  }, [favoritesData?.items, allRecipesData?.items, localPreferredCategories]);

  // Update local preference when viewing a recipe
  useEffect(() => {
    if (!currentRecipe) {
      return;
    }
    const categories = normalizeCategories(currentRecipe.category);
    if (categories.length === 0) {
      return;
    }

    const nextPreference = [...new Set([...categories, ...localPreferredCategories])].slice(0, 3);
    if (nextPreference.join('|') === localPreferredCategories.join('|')) {
      return;
    }

    setLocalPreferredCategories(nextPreference);
    AsyncStorage.setItem(SWAP_PREFERENCE_KEY, JSON.stringify(nextPreference)).catch((err) => {
      console.error('保存换菜偏好失败:', err);
    });
  }, [currentRecipe?.id, localPreferredCategories]);

  // Compute recommendation reasons
  const recommendationReasons = useMemo(
    () =>
      buildRecommendationReasons({
        recipe: currentRecipe,
        currentStage,
        preferredCategories,
        limit: 3,
      }),
    [currentRecipe, currentStage, preferredCategories],
  );

  // Swap recipe handler
  const onSwapRecipe = async () => {
    const now = Date.now();
    if (swapping || now - lastSwapAtRef.current < SWAP_DEBOUNCE_MS) {
      return;
    }

    const nextRecipe = getSwapCandidate({
      currentRecipe,
      allRecipesItems: allRecipesData?.items,
      preferredCategories,
      currentStage,
      timeWindowMinutes: SWAP_TIME_WINDOW_MINUTES,
      weights: swapScoringWeights,
    });
    if (!nextRecipe) {
      return;
    }

    lastSwapAtRef.current = now;
    setSwapping(true);

    try {
      // Track swap click - this will be handled by useHomeAnalytics
      pendingSwapSuccessRef.current = {
        prevRecipeId: currentRecipe?.id || null,
        nextRecipeId: nextRecipe.id,
        clickedAtIso: new Date(now).toISOString(),
      };
      lastRecommendationSourceRef.current = 'swap';
      setCurrentRecipe(nextRecipe);
    } finally {
      setSwapping(false);
    }
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    currentRecipe,
    swapping,
    preferredCategories,
    swapScoringWeights,
    swapExperimentBucket,
    swapConfigSource,
    recommendationReasons,
    isLoading,
    error,
    currentStage,
    recipe: currentRecipe,
    onSwapRecipe,
    onRefresh,
  };
}
