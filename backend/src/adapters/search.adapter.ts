// 搜索结果类型
export interface SearchResult {
  id: string;
  name: string;
  source: 'local' | 'tianxing' | 'ai';
  type?: string;
  prep_time?: number;
  difficulty?: string;
  image_url?: string[]; // 改为数组格式与前端一致
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

// 搜索适配器接口
export interface SearchAdapter {
  search(keyword: string): Promise<SearchResult[]>;
}

// 搜索选项
export interface SearchOptions {
  type?: string;
  max_time?: number;
  difficulty?: string;
}

// 统一搜索返回结果
export interface UnifiedSearchResult {
  results: SearchResult[];
  source: 'local' | 'tianxing' | 'ai';
  total: number;
}
