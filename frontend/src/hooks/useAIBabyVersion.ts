/**
 * AI 宝宝版本生成 Hook
 * 提供 AI 智能生成宝宝辅食版本的功能
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { pairingApi, AIBabyVersionResult } from '../api/pairing';

export interface UseAIBabyVersion {
  // 生成 AI 宝宝版本
  generateAIBabyVersion: (params: {
    recipe_id: string;
    baby_age_months: number;
    use_ai?: boolean;
  }) => Promise<AIBabyVersionResult | null>;

  // 状态
  isLoading: boolean;
  error: string | null;
  lastResult: AIBabyVersionResult | null;

  // 重置状态
  reset: () => void;
}

export function useAIBabyVersion(): UseAIBabyVersion {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIBabyVersionResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: {
      recipe_id: string;
      baby_age_months: number;
      use_ai?: boolean;
    }): Promise<AIBabyVersionResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await pairingApi.generateAIBabyVersion(
          params.recipe_id,
          params.baby_age_months,
          params.use_ai ?? true
        );
        
        if (response.data?.success) {
          setLastResult(response.data);
          return response.data;
        } else {
          const errorMsg = response.data?.error || '生成失败，请重试';
          setError(errorMsg);
          return null;
        }
      } catch (err: any) {
        const errorMessage = err.message || '生成失败，请重试';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
  });

  // 重置状态
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    generateAIBabyVersion: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error ? String(mutation.error) : error,
    lastResult,
    reset,
  };
}

export default useAIBabyVersion;
