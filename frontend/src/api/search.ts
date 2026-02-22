import { apiClient } from './client';

// 搜索结果类型
export interface SearchResult {
  id: string;
  name: string;
  source: 'local' | 'tianxing' | 'ai';
  type?: string;
  prep_time?: number;
  difficulty?: string;
  image_url?: string[];
  description?: string;
  ingredients?: string[];
  steps?: string[];
  adult_version?: any;
  baby_version?: any;
  cooking_tips?: string[];
  nutrition_info?: any;
  tags?: string[];
  category?: string[];
}

// 统一搜索返回结果
export interface UnifiedSearchResult {
  results: SearchResult[];
  source: 'local' | 'tianxing' | 'web' | 'cache' | 'ai';
  route_source?: 'local' | 'cache' | 'web' | 'ai';
  total: number;
  quota?: {
    user_remaining?: number;
    reset_at?: string;
  };
}

const normalizeSource = (source?: string): 'local' | 'cache' | 'web' | 'ai' => {
  if (source === 'ai') return 'ai';
  if (source === 'cache') return 'cache';
  if (source === 'web' || source === 'tianxing') return 'web';
  return 'local';
};

const normalizeUnifiedData = (data: any, meta?: any): UnifiedSearchResult => ({
  results: data?.results || [],
  total: data?.total || 0,
  source: normalizeSource(data?.source),
  route_source: normalizeSource(data?.route_source || meta?.route || data?.source),
  quota: data?.quota || meta?.quota,
});

export const searchApi = {
  // 统一搜索
  search: async (keyword: string) => {
    const res = await apiClient.get<UnifiedSearchResult>('/search', { params: { keyword } });
    return { ...res, data: normalizeUnifiedData(res.data, (res as any).meta) };
  },

  // 指定来源搜索
  searchFromSource: async (keyword: string, source: 'local' | 'tianxing' | 'ai') => {
    const res = await apiClient.get<UnifiedSearchResult>(`/search/source/${source}`, { params: { keyword } });
    return { ...res, data: normalizeUnifiedData(res.data, (res as any).meta) };
  },
};
