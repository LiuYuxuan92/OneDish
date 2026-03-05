import { useEffect, useRef } from 'react';
import { trackMainFlowEvent } from '../../analytics/mainFlow';
import type { Recipe } from '../../types';
import type { BabyStageGuide } from '../../types';
import { scoreRecommendationQuality } from './recommendationInsights';

const SWAP_TIME_WINDOW_MINUTES = 10;

export interface TrackSwapParams {
  recipeId: string;
  prevRecipeId: string | null;
  nextRecipeId: string;
  experimentBucket: 'A' | 'B';
  swapConfigSource: 'default' | 'remote' | 'local';
  userId?: string;
  clickedAt: string;
}

export interface TrackViewParams {
  recipeId: string | null;
  source?: string;
}

export interface TrackQualityScoreParams {
  recipe: Recipe | null;
  currentRecipe: Recipe | null;
  currentStage: BabyStageGuide | undefined;
  preferredCategories: string[];
  experimentBucket: 'A' | 'B';
  swapConfigSource: 'default' | 'remote' | 'local';
}

export interface UseHomeAnalyticsReturn {
  trackHomeView: (recipeId: string | null) => void;
  trackSwap: (params: TrackSwapParams) => void;
  trackSwapClick: (params: {
    recipeId: string | null;
    nextRecipeId: string;
    experimentBucket: 'A' | 'B';
    swapConfigSource: 'default' | 'remote' | 'local';
  }) => void;
  trackQualityScore: (params: TrackQualityScoreParams) => void;
}

export function useHomeAnalytics(): UseHomeAnalyticsReturn {
  const hasTrackedHomeViewRef = useRef(false);
  const lastRecommendationSourceRef = useRef<'daily' | 'swap'>('daily');
  const lastQualityTrackedRecipeIdRef = useRef<string | null>(null);

  const trackHomeView = (recipeId: string | null) => {
    if (hasTrackedHomeViewRef.current) {
      return;
    }
    trackMainFlowEvent('home_view', {
      source: 'home',
      screen: 'HomeScreen',
      recipeId,
    });
    hasTrackedHomeViewRef.current = true;
  };

  const trackSwapClick = (params: {
    recipeId: string | null;
    nextRecipeId: string;
    experimentBucket: 'A' | 'B';
    swapConfigSource: 'default' | 'remote' | 'local';
  }) => {
    trackMainFlowEvent('recommend_swap_click', {
      source: 'home',
      screen: 'HomeScreen',
      recipeId: params.recipeId,
      nextRecipeId: params.nextRecipeId,
      experimentBucket: params.experimentBucket,
      swapConfigSource: params.swapConfigSource,
    });
  };

  const trackSwap = (params: TrackSwapParams) => {
    trackMainFlowEvent('swap_success', {
      timestamp: new Date().toISOString(),
      userId: params.userId || null,
      source: 'home',
      screen: 'HomeScreen',
      recipeId: params.recipeId,
      prevRecipeId: params.prevRecipeId,
      nextRecipeId: params.nextRecipeId,
      experimentBucket: params.experimentBucket,
      swapConfigSource: params.swapConfigSource,
      clickedAt: params.clickedAt,
    });
  };

  const trackQualityScore = (params: TrackQualityScoreParams) => {
    const { recipe, currentRecipe, currentStage, preferredCategories, experimentBucket, swapConfigSource } = params;
    
    if (!recipe?.id) {
      return;
    }
    if (lastQualityTrackedRecipeIdRef.current === recipe.id) {
      return;
    }

    const scored = scoreRecommendationQuality({
      recipe: recipe,
      currentRecipe: currentRecipe,
      currentStage,
      preferredCategories,
      timeWindowMinutes: SWAP_TIME_WINDOW_MINUTES,
    });

    trackMainFlowEvent('recommend_quality_scored', {
      source: 'home',
      screen: 'HomeScreen',
      recipeId: recipe.id,
      recommendationSource: lastRecommendationSourceRef.current,
      experimentBucket,
      swapConfigSource,
      qualityScore: scored.total,
      scoreBreakdown: scored.dimensions,
      ...scored.dimensions,
    });

    lastQualityTrackedRecipeIdRef.current = recipe.id;
  };

  return {
    trackHomeView,
    trackSwap,
    trackSwapClick,
    trackQualityScore,
  };
}
