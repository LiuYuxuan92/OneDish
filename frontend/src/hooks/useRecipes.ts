import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { searchApi } from '../api/search';
import type { Recipe, RecipeSummary, PaginationResult } from '../types';

// 获取所有菜谱
export function useAllRecipes() {
  return useQuery({
    queryKey: ['recipes', 'all'],
    queryFn: async () => {
      const result = await recipesApi.getAll() as unknown as PaginationResult<RecipeSummary>;
      if (!result || !result.items) {
        return { total: 0, page: 1, limit: 20, items: [] };
      }
      return result;
    },
    staleTime: 30 * 1000,
    cacheTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
}

// 获取今日推荐
export function useDailyRecipe(params?: { type?: string; max_time?: number }) {
  return useQuery({
    queryKey: ['recipes', 'daily', params],
    queryFn: async () => {
      const result = await recipesApi.getDaily(params);
      if (!result) {
        return { date: '', recipe: null };
      }
      return result;
    },
    staleTime: 30 * 1000,
  });
}

// 获取菜谱详情
export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: () => recipesApi.getDetail(recipeId).then(res => res.data),
    enabled: !!recipeId,
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7天离线缓存
  });
}

// 搜索菜谱
export function useSearchRecipes(params: {
  keyword?: string;
  type?: string;
  category?: string;
  max_time?: number;
  difficulty?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['recipes', 'search', params],
    queryFn: async () => {
      const result = await recipesApi.search(params) as unknown as PaginationResult<RecipeSummary>;
      if (!result || !result.items) {
        return { total: 0, page: 1, limit: 20, items: [] };
      }
      return result;
    },
    enabled: !!(params.keyword || params.type || params.category || params.difficulty),
  });
}

// 获取分类
export function useCategories() {
  return useQuery({
    queryKey: ['recipes', 'categories'],
    queryFn: async () => {
      const result = await recipesApi.getCategories();
      return result || [];
    },
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
}

// 联网统一搜索（本地 -> 天行数据 -> AI）
export function useUnifiedSearch(keyword: string) {
  return useQuery({
    queryKey: ['search', 'unified', keyword],
    queryFn: async () => {
      const result = await searchApi.search(keyword);
      if (!result) {
        return { results: [], source: 'local', total: 0 };
      }
      return result;
    },
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 30 * 1000,
  });
}

// 根据即将过期食材推荐菜谱
export function useSuggestByInventory(enabled: boolean = true) {
  return useQuery({
    queryKey: ['recipes', 'suggest-by-inventory'],
    queryFn: async () => {
      const result = await recipesApi.suggestByInventory();
      return result || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// 指定来源搜索
export function useSearchFromSource(keyword: string, source: 'local' | 'tianxing' | 'ai') {
  return useQuery({
    queryKey: ['search', source, keyword],
    queryFn: async () => {
      const result = await searchApi.searchFromSource(keyword, source);
      return result || null;
    },
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 30 * 1000,
  });
}
