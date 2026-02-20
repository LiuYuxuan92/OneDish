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
  source: 'local' | 'tianxing' | 'ai';
  total: number;
}

export const searchApi = {
  // 统一搜索
  search: (keyword: string) =>
    apiClient.get<UnifiedSearchResult>('/search', { params: { keyword } }),

  // 指定来源搜索
  searchFromSource: (keyword: string, source: 'local' | 'tianxing' | 'ai') =>
    apiClient.get<UnifiedSearchResult>(`/search/source/${source}`, { params: { keyword } }),
};
