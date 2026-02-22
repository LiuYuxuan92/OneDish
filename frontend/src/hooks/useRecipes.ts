// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { searchApi, UnifiedSearchResult } from '../api/search';
import { Recipe } from '../types';

// 获取所有菜谱
export function useAllRecipes() {
  return useQuery({
    queryKey: ['recipes', 'all'],
    queryFn: async () => {
      try {
        const result = await recipesApi.getAll();

        // 检查API响应格式
        if (!result) {
          console.error('[useAllRecipes] No result returned');
          return { total: 0, page: 1, limit: 20, items: [] };
        }

        // 处理不同的响应格式
        let data;
        if (result.data) {
          // 标准格式: { code, message, data: {...} }
          data = result.data;
        } else if (result.items) {
          // 直接返回分页结果
          data = result;
        } else {
          console.error('[useAllRecipes] Unexpected result format:', result);
          return { total: 0, page: 1, limit: 20, items: [] };
        }

        if (!data) {
          return { total: 0, page: 1, limit: 20, items: [] };
        }

        // 如果后端返回的数据 items 是 undefined，设置为空数组
        const items = Array.isArray(data.items) ? data.items : (data.items ? [data.items] : []);
        return {
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 20,
          items,
        };
      } catch (error) {
        console.error('[useAllRecipes] API error:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30秒，避免缓存旧数据
    cacheTime: 24 * 60 * 60 * 1000, // 24h 离线缓存
    retry: 2,
  });
}

// 获取今日推荐
export function useDailyRecipe(params?: { type?: string; max_time?: number }) {
  return useQuery({
    queryKey: ['recipes', 'daily', params],
    queryFn: async () => {
      const result = await recipesApi.getDaily(params);
      // 确保返回正确的数据结构
      const data = result?.data;
      if (!data) {
        return { date: '', recipe: null };
      }
      return {
        date: data.date || '',
        recipe: data.recipe || null,
      };
    },
    staleTime: 30 * 1000, // 30秒，避免缓存旧数据
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
      const result = await recipesApi.search(params);
      // 确保返回正确的数据结构
      const data = result?.data;
      if (!data) {
        return { total: 0, page: 1, limit: 20, items: [] };
      }
      return {
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 20,
        items: data.items || [],
      };
    },
    enabled: !!(params.keyword || params.type || params.category || params.difficulty),
  });
}

// 获取分类
export function useCategories() {
  return useQuery({
    queryKey: ['recipes', 'categories'],
    queryFn: () =>
      recipesApi.getCategories().then(res => res.data),
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7天
  });
}

// 联网统一搜索（本地 -> 天行数据 -> AI）
export function useUnifiedSearch(keyword: string) {
  return useQuery({
    queryKey: ['search', 'unified', keyword],
    queryFn: async () => {
      const result = await searchApi.search(keyword);
      // 确保返回正确的数据结构
      const data = result?.data;
      if (!data) {
        return { results: [], source: 'local', total: 0 };
      }
      return {
        results: data.results || [],
        source: data.source || 'local',
        total: data.total || 0,
      };
    },
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 30 * 1000, // 30秒，避免缓存旧数据
  });
}

// 根据即将过期食材推荐菜谱
export function useSuggestByInventory(enabled: boolean = true) {
  return useQuery({
    queryKey: ['recipes', 'suggest-by-inventory'],
    queryFn: () => recipesApi.suggestByInventory().then(res => res.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// 指定来源搜索
export function useSearchFromSource(keyword: string, source: 'local' | 'tianxing' | 'ai') {
  return useQuery({
    queryKey: ['search', source, keyword],
    queryFn: () =>
      searchApi.searchFromSource(keyword, source).then(res => res.data),
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 30 * 1000, // 30秒，避免缓存旧数据
  });
}
