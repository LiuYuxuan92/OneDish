/**
 * 食谱转换 Hook
 * 提供食谱转换为宝宝版本的功能
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recipesApi, TransformRecipeParams, TransformResult, BatchTransformParams } from '../api/recipes';

export interface UseRecipeTransform {
  // 转换单个食谱
  transformRecipe: (recipeId: string, babyAgeMonths: number, options?: {
    familySize?: number;
    includeNutrition?: boolean;
    includeSyncCooking?: boolean;
  }) => Promise<TransformResult | null>;

  // 批量转换食谱
  batchTransform: (recipeIds: string[], babyAgeMonths: number, options?: {
    includeNutrition?: boolean;
  }) => Promise<TransformResult[]>;

  // 状态
  isLoading: boolean;
  error: string | null;
  lastResult: TransformResult | null;

  // 重置状态
  reset: () => void;
}

export function useRecipeTransform(): UseRecipeTransform {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TransformResult | null>(null);

  // 转换单个食谱
  const transformRecipe = useCallback(async (
    recipeId: string,
    babyAgeMonths: number,
    options?: {
      familySize?: number;
      includeNutrition?: boolean;
      includeSyncCooking?: boolean;
    }
  ): Promise<TransformResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: TransformRecipeParams = {
        baby_age_months: babyAgeMonths,
        family_size: options?.familySize,
        include_nutrition: options?.includeNutrition,
        include_sync_cooking: options?.includeSyncCooking,
      };

      const response = await recipesApi.transform(recipeId, params);
      setLastResult(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '转换失败，请重试';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量转换食谱
  const batchTransform = useCallback(async (
    recipeIds: string[],
    babyAgeMonths: number,
    options?: {
      includeNutrition?: boolean;
    }
  ): Promise<TransformResult[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: BatchTransformParams = {
        recipe_ids: recipeIds,
        baby_age_months: babyAgeMonths,
        include_nutrition: options?.includeNutrition,
      };

      const response = await recipesApi.batchTransform(params);
      return response.data.results;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '批量转换失败，请重试';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    transformRecipe,
    batchTransform,
    isLoading,
    error,
    lastResult,
    reset,
  };
}

/**
 * 统一的宝宝版数据获取 Hook
 * 优先使用静态 baby_version，否则调用 transform API
 */
export function useBabyVersion(
  recipeId: string | undefined,
  babyAgeMonths: number,
  options?: {
    enabled?: boolean;
    staticBabyVersion?: any;
  }
) {
  const enabled = options?.enabled !== false && !!recipeId;
  const staticBaby = options?.staticBabyVersion;

  return useQuery({
    queryKey: ['babyVersion', recipeId, babyAgeMonths],
    queryFn: async () => {
      // 如果有静态 baby_version 且未指定特定月龄（使用默认值），直接返回静态版
      if (staticBaby && babyAgeMonths === 12) {
        const parsed = typeof staticBaby === 'string' ? JSON.parse(staticBaby) : staticBaby;
        return { baby_version: parsed, nutrition_info: null, isStatic: true };
      }

      // 否则调用 transform API
      const params: TransformRecipeParams = {
        baby_age_months: babyAgeMonths,
        include_nutrition: true,
        include_sync_cooking: true,
      };
      const response = await recipesApi.transform(recipeId!, params);
      return {
        baby_version: response.data?.baby_version || null,
        nutrition_info: response.data?.nutrition_info || null,
        isStatic: false,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });
}

export default useRecipeTransform;
